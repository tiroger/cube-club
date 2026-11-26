import Foundation
import CoreImage

// Preview and detection have independent, bounded lanes. A lane stays occupied
// until WebKit finishes consuming its packet, so a busy UI cannot build a queue
// of old pictures. Slow detection never holds up the preview or camera controls.
final class CameraFramePipeline {
    typealias Delivery = ([String: Any], @escaping () -> Void) -> Void
    var onPreview: Delivery?
    var onAnalysis: Delivery?

    private let previewQueue = DispatchQueue(label: "club.cube.preview", qos: .userInteractive)
    private let analysisQueue = DispatchQueue(label: "club.cube.vision", qos: .userInitiated)
    private let lock = NSLock()
    private var token: String?
    private var generation = 0
    private var sequence = 0
    private var previewBusy = false
    private var analysisBusy = false
    private var lastPreview = -Double.infinity
    private var lastAnalysis = -Double.infinity
    private let encode: (CIImage) -> String?
    private let analyze: (CIImage) -> [String: Any]
    private let resetAnalysis: () -> Void
    private var analysisGeneration = -1 // Accessed only on analysisQueue.

    init(encode: ((CIImage) -> String?)? = nil, analyze: ((CIImage) -> [String: Any])? = nil, resetAnalysis: (() -> Void)? = nil) {
        let previewContext = CIContext(options: [.cacheIntermediates: false])
        let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
        let vision = CubeVision(context: CIContext(options: [.cacheIntermediates: false]))
        self.encode = encode ?? { image in
            let scaled = Self.scaled(image, width: 720)
            // Core Image's encoder works on macOS and iPadOS alike.
            guard let data = previewContext.jpegRepresentation(of: scaled, colorSpace: srgb,
                      options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.7]) else { return nil }
            return "data:image/jpeg;base64," + data.base64EncodedString()
        }
        self.analyze = analyze ?? { vision.analyze(Self.scaled($0, width: 960)) }
        self.resetAnalysis = resetAnalysis ?? { vision.reset() }
    }

    private static func scaled(_ image: CIImage, width: CGFloat) -> CIImage {
        let scale = min(1, width / image.extent.width)
        return image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    }

    func start(token: String) {
        lock.lock(); defer { lock.unlock() }
        generation += 1; self.token = token; sequence = 0
        lastPreview = -Double.infinity; lastAnalysis = -Double.infinity
        // Keep in-flight work occupied through restarts, until it really ends.
    }

    func stop() {
        lock.lock(); defer { lock.unlock() }
        generation += 1; token = nil
    }

    func submit(_ image: CIImage) {
        let now = ProcessInfo.processInfo.systemUptime
        lock.lock()
        guard let token else { lock.unlock(); return }
        sequence += 1
        let ticket = (token: token, generation: generation, sequence: sequence, capturedAt: Date().timeIntervalSince1970 * 1000)
        // A small scheduling tolerance avoids halving a 30 Hz camera's rate.
        let preview = !previewBusy && now - lastPreview >= 1.0 / 30 - 0.002
        let analysis = !analysisBusy && now - lastAnalysis >= 0.2
        if preview { previewBusy = true; lastPreview = now }
        if analysis { analysisBusy = true; lastAnalysis = now }
        lock.unlock()

        func current() -> Bool {
            lock.lock(); defer { lock.unlock() }
            return self.token == ticket.token && generation == ticket.generation
        }
        func finish(preview: Bool) {
            lock.lock(); defer { lock.unlock() }
            if preview { previewBusy = false } else { analysisBusy = false }
        }
        let base: [String: Any] = ["token": ticket.token, "sequence": ticket.sequence, "capturedAt": ticket.capturedAt]
        if preview {
            previewQueue.async { [self] in
                autoreleasepool {
                    guard current(), let image = encode(image), current(), let deliver = onPreview else { finish(preview: true); return }
                    deliver(base.merging(["image": image]) { _, new in new }) { finish(preview: true) }
                }
            }
        }
        if analysis {
            analysisQueue.async { [self] in
                autoreleasepool {
                    guard current() else { finish(preview: false); return }
                    if analysisGeneration != ticket.generation {
                        resetAnalysis(); analysisGeneration = ticket.generation
                    }
                    let reading = analyze(image)
                    guard current(), let deliver = onAnalysis else { finish(preview: false); return }
                    deliver(base.merging(["vision": reading]) { _, new in new }) { finish(preview: false) }
                }
            }
        }
    }
}
