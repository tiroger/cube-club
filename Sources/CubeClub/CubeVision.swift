import Foundation
import CoreImage
import Vision

// Coordinates are normalized, with the origin at the top-left of the unmirrored
// camera image. Detection and sampling always describe the SAME captured frame.
struct CubeQuad {
    let points: [CGPoint] // top-left, top-right, bottom-right, bottom-left
    var area: CGFloat {
        abs((0..<4).reduce(CGFloat.zero) { sum, i in
            let a = points[i], b = points[(i + 1) % 4]
            return sum + a.x * b.y - b.x * a.y
        }) / 2
    }
    var valid: Bool {
        guard points.count == 4, points.allSatisfy({ $0.x.isFinite && $0.y.isFinite && $0.x >= 0.005 && $0.x <= 0.995 && $0.y >= 0.005 && $0.y <= 0.995 }) else { return false }
        let crosses = (0..<4).map { i -> CGFloat in
            let a = points[i], b = points[(i + 1) % 4], c = points[(i + 2) % 4]
            return (b.x-a.x)*(c.y-b.y) - (b.y-a.y)*(c.x-b.x)
        }
        return crosses.allSatisfy { $0 > 0.0001 } && area > 0.012 && area < 0.85
    }
    var json: [[Double]] { points.map { [Double($0.x), Double($0.y)] } }
}

struct CubePatch {
    let rgb: [Double]
    let spread: Double
    let clipped: Double
    var json: [String: Any] { ["rgb": rgb, "spread": spread, "clipped": clipped] }
}

struct CubeFaceReading {
    let quad: CubeQuad
    let patches: [CubePatch]
    let gridScore: Double
    var json: [String: Any] {
        ["status": "found", "corners": quad.json, "patches": patches.map(\.json), "gridScore": gridScore]
    }
}

// Apple Vision proposes rectangles. We independently verify the internal 3×3
// boundaries; a book, screen, or single sticker is not enough to trigger a read.
final class CubeVision {
    let context: CIContext
    private let side = 288
    private let detector: (CIImage) throws -> [CubeQuad]
    private var sequence = VNSequenceRequestHandler()
    private var tracking: VNTrackRectangleRequest?
    private var lastTime = -Double.infinity
    private var lastExtent = CGRect.zero

    init(context: CIContext = CIContext(), detector: ((CIImage) throws -> [CubeQuad])? = nil) {
        self.context = context
        self.detector = detector ?? Self.detectRectangles
    }

    // Called on the serial analysis lane, including when the camera is restarted.
    func reset() {
        tracking = nil
        sequence = VNSequenceRequestHandler()
        lastTime = -Double.infinity
        lastExtent = .zero
    }

    private static func quad(_ observation: VNRectangleObservation) -> CubeQuad {
        CubeQuad(points: [observation.topLeft, observation.topRight, observation.bottomRight, observation.bottomLeft].map { CGPoint(x: $0.x, y: 1 - $0.y) })
    }

    private static func detectRectangles(_ image: CIImage) throws -> [CubeQuad] {
        let request = VNDetectRectanglesRequest()
        request.maximumObservations = 48
        request.minimumConfidence = 0.35
        request.minimumSize = 0.035
        request.minimumAspectRatio = 0.45
        request.maximumAspectRatio = 1
        request.quadratureTolerance = 35
        try VNImageRequestHandler(ciImage: image, orientation: .up).perform([request])
        return (request.results ?? []).map(Self.quad)
    }

    private func startTracking(_ quad: CubeQuad, in image: CIImage) {
        let p = quad.points.map { CGPoint(x: $0.x, y: 1 - $0.y) }
        let observation: VNRectangleObservation
        if #available(macOS 14, *) {
            observation = VNRectangleObservation(requestRevision: VNDetectRectanglesRequestRevision1, topLeft: p[0], topRight: p[1], bottomRight: p[2], bottomLeft: p[3])
        } else {
            observation = VNRectangleObservation(requestRevision: VNDetectRectanglesRequestRevision1, topLeft: p[0], bottomLeft: p[3], bottomRight: p[2], topRight: p[1])
        }
        sequence = VNSequenceRequestHandler()
        let request = VNTrackRectangleRequest(rectangleObservation: observation)
        request.trackingLevel = .accurate
        // Prime with the frame that supplied the corners, not the following frame.
        do {
            try sequence.perform([request], on: image, orientation: .up)
            if let result = request.results?.first as? VNRectangleObservation, result.confidence >= 0.5 {
                request.inputObservation = result
                tracking = request
            } else { tracking = nil }
        } catch { tracking = nil }
    }

    func analyze(_ image: CIImage) -> [String: Any] {
        let now = ProcessInfo.processInfo.systemUptime
        if now - lastTime > 1 || image.extent != lastExtent { reset() }
        lastTime = now; lastExtent = image.extent
        // A tracker proposes new corners only. Every frame must independently
        // pass the same physical-grid and sample checks before it can be used.
        if let tracking {
            do {
                try sequence.perform([tracking], on: image, orientation: .up)
                if let observation = tracking.results?.first as? VNRectangleObservation, observation.confidence >= 0.5,
                   let reading = read(image, quad: Self.quad(observation)) {
                    tracking.inputObservation = observation
                    return packet(reading, image: image, source: "tracking")
                }
            } catch { /* Reacquire from this frame below. */ }
            self.tracking = nil
        }
        var detectorFailed = false
        let rectangles: [CubeQuad]
        do { rectangles = try detector(image) }
        catch { rectangles = []; detectorFailed = true }
        // Individual stickers also propose a face when its outer border is weak.
        let candidates = Array(rectangles.filter(\.valid).sorted { $0.area > $1.area }.prefix(16)) + Self.latticeCandidates(rectangles)
        var best: CubeFaceReading?
        for quad in candidates {
            guard let reading = read(image, quad: quad) else { continue }
            if best == nil || reading.gridScore > best!.gridScore { best = reading }
        }
        var source = "detection"
        if best == nil {
            // The visible alignment guide supplies bounded hypotheses, never
            // colors. Blank squares and incomplete grids still fail verification.
            source = "guide"
            for quad in Self.guideCandidates(size: image.extent.size) {
                guard let reading = read(image, quad: quad), reading.gridScore >= 0.84 else { continue }
                if best == nil || reading.gridScore > best!.gridScore { best = reading }
            }
        }
        if let best {
            let result = packet(best, image: image, source: source)
            if result["status"] as? String == "found" { startTracking(best.quad, in: image) }
            return result
        }
        return ["status": detectorFailed ? "unavailable" : "searching"]
    }

    private func packet(_ reading: CubeFaceReading, image: CIImage, source: String) -> [String: Any] {
        let p = reading.quad.points, w = image.extent.width, h = image.extent.height
        var shortest = CGFloat.greatestFiniteMagnitude
        for i in 0..<4 {
            let next = p[(i + 1) % 4]
            let dx = (p[i].x - next.x) * w, dy = (p[i].y - next.y) * h
            shortest = min(shortest, hypot(dx, dy))
        }
        if shortest < 105 { return ["status": "too-small", "corners": reading.quad.json] }
        return reading.json.merging(["source": source]) { _, new in new }
    }

    // Same pixel-square geometry as the camera overlay, including wide cameras.
    static func guideCandidates(size: CGSize) -> [CubeQuad] {
        guard size.width > 0, size.height > 0 else { return [] }
        let unit = min(size.width, size.height)
        var result: [CubeQuad] = []
        for scale: CGFloat in [1, 0.92, 1.08] {
            for offsetY: CGFloat in [0, -0.045, 0.045] { for offsetX: CGFloat in [0, -0.045, 0.045] {
                let side = unit * 0.62 * scale
                let cx = size.width / 2 + unit * offsetX, cy = size.height / 2 + unit * offsetY
                result.append(CubeQuad(points: [CGPoint(x: -0.5, y: -0.5), CGPoint(x: 0.5, y: -0.5), CGPoint(x: 0.5, y: 0.5), CGPoint(x: -0.5, y: 0.5)].map {
                    CGPoint(x: (cx + $0.x * side) / size.width, y: (cy + $0.y * side) / size.height)
                }))
            }}
        }
        return result
    }

    func rectified(_ image: CIImage, quad: CubeQuad) -> CIImage? {
        guard quad.valid else { return nil }
        let extent = image.extent
        let p = quad.points.map { CIVector(x: extent.minX + $0.x * extent.width, y: extent.minY + (1 - $0.y) * extent.height) }
        let corrected = image.applyingFilter("CIPerspectiveCorrection", parameters: ["inputTopLeft": p[0], "inputTopRight": p[1], "inputBottomRight": p[2], "inputBottomLeft": p[3]])
        guard !corrected.extent.isEmpty, !corrected.extent.isInfinite else { return nil }
        let moved = corrected.transformed(by: CGAffineTransform(translationX: -corrected.extent.minX, y: -corrected.extent.minY))
        return moved.transformed(by: CGAffineTransform(scaleX: CGFloat(side)/moved.extent.width, y: CGFloat(side)/moved.extent.height))
    }

    func read(_ image: CIImage, quad: CubeQuad) -> CubeFaceReading? {
        guard let corrected = rectified(image, quad: quad) else { return nil }
        var bytes = [UInt8](repeating: 0, count: side * side * 4)
        // The rendered bitmap uses top-to-bottom memory rows even though Core
        // Image geometry has its origin at bottom-left. Do not flip these rows.
        context.render(corrected, toBitmap: &bytes, rowBytes: side*4, bounds: CGRect(x: 0, y: 0, width: side, height: side), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
        return Self.readPixels(bytes, side: side, quad: quad)
    }

    static func readPixels(_ bytes: [UInt8], side: Int, quad: CubeQuad) -> CubeFaceReading? {
        guard bytes.count == side * side * 4, side >= 60 else { return nil }
        func rgb(_ x: Double, _ y: Double) -> [Double] {
            let px = min(side-1, max(0, Int(x*Double(side))))
            let py = min(side-1, max(0, Int(y*Double(side))))
            let i = (py*side+px)*4
            return (0..<3).map { Double(bytes[i+$0]) }
        }
        func distance(_ a: [Double], _ b: [Double]) -> Double { sqrt(zip(a,b).reduce(0) { $0 + pow($1.0-$1.1,2) } / 3) }
        var patches: [CubePatch] = []
        for row in 0..<3 { for col in 0..<3 {
            var pixels: [[Double]] = []
            for y in -4...4 { for x in -4...4 {
                pixels.append(rgb((Double(col)+0.5)/3+Double(x)*0.012, (Double(row)+0.5)/3+Double(y)*0.012))
            }}
            let median = (0..<3).map { channel in pixels.map { $0[channel] }.sorted()[pixels.count/2] }
            let spread = sqrt(pixels.reduce(0) { $0 + pow(distance($1, median), 2) } / Double(pixels.count))
            let clipped = Double(pixels.filter { $0.allSatisfy { $0 >= 250 } }.count) / Double(pixels.count)
            patches.append(CubePatch(rgb: median, spread: spread, clipped: clipped))
        }}
        // Test all four seams in three separate places. Each seam needs support
        // in at least two cells. Color changes or a narrow dark groove both count.
        var supported = 0
        for vertical in [true, false] { for boundary in [1.0/3, 2.0/3] {
            var lineSupport = 0
            for segment in 0..<3 {
                let along = (Double(segment)+0.5)/3
                func point(_ across: Double) -> [Double] { vertical ? rgb(across,along) : rgb(along,across) }
                let a = point(boundary-0.075), b = point(boundary+0.075)
                let seam = (-4...4).map { point(boundary+Double($0)*0.007) }
                let darkGroove = seam.contains { s in
                    let luminance: ([Double]) -> Double = { $0[0]*0.2126+$0[1]*0.7152+$0[2]*0.0722 }
                    return min(luminance(a),luminance(b))-luminance(s) > 18
                }
                if darkGroove || distance(a,b) > 35 { lineSupport += 1 }
            }
            guard lineSupport >= 2 else { return nil }
            supported += lineSupport
        }}
        guard supported >= 10, patches.filter({ $0.spread < 35 && ($0.rgb.max() ?? 0) > 45 }).count >= 7 else { return nil }
        let solidity = patches.reduce(0) { $0 + max(0, 1 - $1.spread/60) } / 9
        return CubeFaceReading(quad: quad, patches: patches, gridScore: Double(supported)/12 * 0.7 + solidity * 0.3)
    }

    // Fit a projective transform to a 3×3 lattice of observed sticker centers.
    // The initial affine hypotheses tolerate modest tilt; least squares then
    // handles perspective. Residual and convexity checks reject accidental grids.
    static func latticeCandidates(_ rectangles: [CubeQuad]) -> [CubeQuad] {
        let stickers = rectangles.filter { $0.area > 0.0005 && $0.area < 0.08 }
        let centers = stickers.map { q in CGPoint(x: q.points.map(\.x).reduce(0,+)/4, y: q.points.map(\.y).reduce(0,+)/4) }
        var results: [CubeQuad] = []
        for center in centers.indices {
            let o = centers[center], size = sqrt(stickers[center].area)
            let right = centers.indices.filter { i in
                let dx = centers[i].x-o.x, dy = centers[i].y-o.y
                return dx > size*0.65 && dx < size*2.4 && abs(dy) < dx*0.6
            }
            let down = centers.indices.filter { i in
                let dx = centers[i].x-o.x, dy = centers[i].y-o.y
                return dy > size*0.65 && dy < size*2.4 && abs(dx) < dy*0.6
            }
            for r in right { for d in down {
                let ux = centers[r].x-o.x, uy = centers[r].y-o.y
                let vx = centers[d].x-o.x, vy = centers[d].y-o.y
                let spacing = min(hypot(ux,uy),hypot(vx,vy))
                var source: [CGPoint] = [], target: [CGPoint] = [], used = Set<Int>()
                for row in -1...1 { for col in -1...1 {
                    let predicted = CGPoint(x: o.x+CGFloat(col)*ux+CGFloat(row)*vx, y: o.y+CGFloat(col)*uy+CGFloat(row)*vy)
                    let nearby = centers.indices.filter { !used.contains($0) && stickers[$0].area/stickers[center].area > 0.4 && stickers[$0].area/stickers[center].area < 2.5 }
                    if let i = nearby.min(by: { hypot(centers[$0].x-predicted.x,centers[$0].y-predicted.y) < hypot(centers[$1].x-predicted.x,centers[$1].y-predicted.y) }), hypot(centers[i].x-predicted.x,centers[i].y-predicted.y) < spacing*0.28 {
                        used.insert(i); source.append(CGPoint(x: col, y: row)); target.append(centers[i])
                    }
                }}
                guard source.count >= 8, let h = projectiveFit(source: source, target: target) else { continue }
                func map(_ p: CGPoint) -> CGPoint {
                    let denominator = h[6]*p.x+h[7]*p.y+1
                    return CGPoint(x: (h[0]*p.x+h[1]*p.y+h[2])/denominator, y: (h[3]*p.x+h[4]*p.y+h[5])/denominator)
                }
                guard zip(source,target).allSatisfy({ a,b in let p = map(a); return hypot(p.x-b.x,p.y-b.y) < spacing*0.1 }) else { continue }
                let quad = CubeQuad(points: [CGPoint(x: -1.5,y: -1.5), CGPoint(x: 1.5,y: -1.5), CGPoint(x: 1.5,y: 1.5), CGPoint(x: -1.5,y: 1.5)].map(map))
                if quad.valid && !results.contains(where: { abs($0.points[0].x-quad.points[0].x)+abs($0.points[0].y-quad.points[0].y) < 0.05 }) { results.append(quad) }
                if results.count >= 4 { return results }
            }}
        }
        return results
    }

    private static func projectiveFit(source: [CGPoint], target: [CGPoint]) -> [CGFloat]? {
        var rows: [[CGFloat]] = [], values: [CGFloat] = []
        for (a,b) in zip(source,target) {
            rows.append([a.x,a.y,1,0,0,0,-b.x*a.x,-b.x*a.y]); values.append(b.x)
            rows.append([0,0,0,a.x,a.y,1,-b.y*a.x,-b.y*a.y]); values.append(b.y)
        }
        // Normal equations [AᵀA | Aᵀb], built with plain loops so the type checker stays fast.
        var matrix = [[CGFloat]](repeating: [CGFloat](repeating: 0, count: 9), count: 8)
        for (row, value) in zip(rows, values) {
            for i in 0..<8 {
                for j in 0..<8 { matrix[i][j] += row[i] * row[j] }
                matrix[i][8] += row[i] * value
            }
        }
        for col in 0..<8 {
            guard let pivot = (col..<8).max(by: { abs(matrix[$0][col]) < abs(matrix[$1][col]) }), abs(matrix[pivot][col]) > 1e-9 else { return nil }
            matrix.swapAt(col,pivot)
            let divisor = matrix[col][col]
            for j in col...8 { matrix[col][j] /= divisor }
            for row in 0..<8 where row != col {
                let factor = matrix[row][col]
                for j in col...8 { matrix[row][j] -= factor*matrix[col][j] }
            }
        }
        return matrix.map { $0[8] }
    }
}
