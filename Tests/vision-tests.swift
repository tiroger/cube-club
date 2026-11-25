import Foundation
import CoreImage
import AppKit

@main
struct VisionTests {
    static var checks = 0
    static let palette: [[UInt8]] = [[245,215,30],[235,110,25],[25,160,65],[235,235,225],[210,35,45],[35,85,210]]
    static func check(_ condition: @autoclosure () -> Bool, _ message: String) {
        checks += 1
        if !condition() { fputs("Vision failure: \(message)\n",stderr); exit(1) }
    }
    static func pixels(colors: [Int], border: Bool = true, occluded: Bool = false) -> [UInt8] {
        let n = 288
        var bytes = [UInt8](repeating: 255,count: n*n*4)
        for y in 0..<n { for x in 0..<n {
            let i=(y*n+x)*4, row=y/96, col=x/96
            let seam = border && (x%96 < 5 || x%96 > 90 || y%96 < 5 || y%96 > 90)
            let rgb: [UInt8] = occluded && x > 100 && y < 230 ? [115,80,60] : seam ? [20,23,25] : palette[colors[row*3+col]]
            for c in 0..<3 { bytes[i+c]=rgb[c] }
        }}
        return bytes
    }
    static func fixture(bytes: [UInt8], quad: CubeQuad) -> CIImage {
        let source = CIImage(bitmapData: Data(bytes), bytesPerRow: 288*4, size: CGSize(width: 288,height: 288), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
        let p=quad.points.map { CIVector(x: $0.x*800,y: (1-$0.y)*600) }
        let warped=source.applyingFilter("CIPerspectiveTransform",parameters: ["inputTopLeft":p[0],"inputTopRight":p[1],"inputBottomRight":p[2],"inputBottomLeft":p[3]])
        let background=CIImage(color: CIColor(red: 0.55,green: 0.60,blue: 0.57)).cropped(to: CGRect(x: 0,y: 0,width: 800,height: 600))
        return warped.composited(over:background)
    }
    static func main() {
        let vision=CubeVision(), colors=[0,1,2,3,2,4,5,0,1]
        let flat=CubeQuad(points:[CGPoint(x:0.2,y:0.15),CGPoint(x:0.65,y:0.15),CGPoint(x:0.65,y:0.75),CGPoint(x:0.2,y:0.75)])
        let tilted=CubeQuad(points:[CGPoint(x:0.29,y:0.12),CGPoint(x:0.77,y:0.27),CGPoint(x:0.68,y:0.85),CGPoint(x:0.23,y:0.67)])
        let offcenter=CubeQuad(points:[CGPoint(x:0.06,y:0.2),CGPoint(x:0.46,y:0.15),CGPoint(x:0.49,y:0.75),CGPoint(x:0.1,y:0.80)])
        let data=pixels(colors:colors)
        // Independent preview check: decode the image that a browser sees,
        // rather than checking sampler and fixture against a shared row convention.
        let preview=fixture(bytes:data,quad:flat)
        let png=vision.context.pngRepresentation(of:preview,format:.RGBA8,colorSpace:CGColorSpace(name:CGColorSpace.sRGB)!)!
        let bitmap=NSBitmapImageRep(data:png)!
        for row in 0..<3 { for col in 0..<3 {
            // Raw samples, as getPixel returns them; getPixel's pointer type differs between SDKs.
            let x=160+60+col*120,y=90+60+row*120
            let base=bitmap.bitmapData!+y*bitmap.bytesPerRow+x*bitmap.bitsPerPixel/8
            let observed=(0..<3).map { base[$0] }
            for c in 0..<3 { check(abs(Double(observed[c])-Double(palette[colors[row*3+col]][c]))<8,"PNG preview orientation row \(row), column \(col)") }
        }}
        for (name,quad) in [("flat",flat),("tilted",tilted),("offcenter",offcenter)] {
            check(quad.valid,"valid \(name) quad")
            let image=fixture(bytes:data,quad:quad)
            guard let exact=vision.read(image,quad:quad) else { check(false,"rectification \(name)"); return }
            for i in 0..<9 { for c in 0..<3 { check(abs(exact.patches[i].rgb[c]-Double(palette[colors[i]][c]))<8,"\(name) unmirrored row/column \(i), channel \(c)") } }
            let start=Date(),result=vision.analyze(image)
            print("\(name) detection: \(result["status"] ?? "nil") (\(Int(Date().timeIntervalSince(start)*1000)) ms)")
            check(result["status"] as? String == "found","Vision must locate \(name) face without supplied corners")
            let detected=result["patches"] as! [[String:Any]]
            for i in 0..<9 { let rgb=detected[i]["rgb"] as! [Double]; for c in 0..<3 { check(abs(rgb[c]-Double(palette[colors[i]][c]))<15,"detected \(name) row/column \(i)") } }
        }
        for color in 0..<6 {
            let image=fixture(bytes:pixels(colors:Array(repeating:color,count:9)),quad:tilted)
            check(vision.analyze(image)["status"] as? String == "found","uniform solved face \(color) still has nine physical squares")
        }
        let blank=pixels(colors:Array(repeating:2,count:9),border:false)
        check(vision.read(fixture(bytes:blank,quad:flat),quad:flat)==nil,"plain square rejected")
        check(vision.analyze(fixture(bytes:blank,quad:flat))["status"] as? String == "searching","rectangle alone is not a cube face")
        let blocked=pixels(colors:colors,occluded:true)
        check(vision.analyze(fixture(bytes:blocked,quad:flat))["status"] as? String == "searching","heavy sticker occlusion rejected")
        let small=CubeQuad(points:[CGPoint(x:0.2,y:0.2),CGPoint(x:0.3,y:0.2),CGPoint(x:0.3,y:0.33),CGPoint(x:0.2,y:0.33)])
        check(vision.analyze(fixture(bytes:data,quad:small))["status"] as? String != "found","tiny cube cannot capture")
        check(!CubeQuad(points:[CGPoint(x:0,y:0),CGPoint(x:1,y:0),CGPoint(x:1,y:1),CGPoint(x:0,y:1)]).valid,"clipped face rejected")
        check(!CubeQuad(points:[flat.points[0],flat.points[2],flat.points[1],flat.points[3]]).valid,"crossed corners rejected")
        var stickers:[CubeQuad]=[]
        for row in 0..<3 { for col in 0..<3 {
            let x=0.22+Double(col)*0.16, y=0.17+Double(row)*0.20
            stickers.append(CubeQuad(points:[CGPoint(x:x,y:y),CGPoint(x:x+0.13,y:y+0.015),CGPoint(x:x+0.13,y:y+0.165),CGPoint(x:x,y:y+0.15)]))
        }}
        check(!CubeVision.latticeCandidates(stickers).isEmpty,"nine sticker rectangles can recover the outer face")
        check(CubeVision.latticeCandidates(Array(stickers.prefix(5))).isEmpty,"incomplete sticker lattice rejected")
        // Force missing outer-rectangle proposals: this is the actual failure
        // mode the guide must recover, independent of Vision's fixture accuracy.
        let guided = CubeVision(detector: { _ in [] })
        let guide = CubeVision.guideCandidates(size: CGSize(width: 800, height: 600))[0]
        let guideImage = fixture(bytes: data, quad: guide)
        let guideResult = guided.analyze(guideImage)
        check(guideResult["source"] as? String == "guide", "alignment guide recovers a cube when the rectangle detector finds nothing")
        check(guideResult["status"] as? String == "found", "guide still verifies a real grid")
        let guidePatches = guideResult["patches"] as! [[String:Any]]
        for i in 0..<9 { for c in 0..<3 {
            check(abs((guidePatches[i]["rgb"] as! [Double])[c]-Double(palette[colors[i]][c]))<15,"guided colors use current pixels in correct orientation")
        }}
        let wideGuide = CubeVision.guideCandidates(size: CGSize(width: 1280, height: 720))[0]
        check(abs((wideGuide.points[1].x-wideGuide.points[0].x)*1280-446.4)<0.01,"wide-camera guide is the same pixel square as the preview")
        check(abs((wideGuide.points[3].y-wideGuide.points[0].y)*720-446.4)<0.01,"guide is not stretched by the video aspect ratio")
        var tracked = 0
        let start = Date()
        for step in 1...12 {
            let moved = CubeQuad(points: guide.points.map { CGPoint(x:$0.x+CGFloat(step)*0.004,y:$0.y+sin(CGFloat(step))*0.004) })
            let result = guided.analyze(fixture(bytes:data,quad:moved))
            check(result["status"] as? String == "found","track small hand movement without outer detector, frame \(step)")
            if result["source"] as? String == "tracking" { tracked += 1 }
            if let patches = result["patches"] as? [[String:Any]] {
                for i in 0..<9 { for c in 0..<3 {
                    check(abs((patches[i]["rgb"] as! [Double])[c]-Double(palette[colors[i]][c]))<15,"tracked samples stay on the same stickers")
                }}
            }
        }
        print("Tracked sequence: \(tracked)/12, average \(Int(Date().timeIntervalSince(start)*1000/12)) ms")
        check(tracked >= 10,"tracking continues without relying on repeated rectangle detection")
        let changedColors = [5,4,3,2,2,1,0,5,4]
        let changed = guided.analyze(fixture(bytes:pixels(colors:changedColors),quad:guide))
        check(changed["status"] as? String == "found","a new face remains readable")
        if let patches = changed["patches"] as? [[String:Any]] {
            for i in 0..<9 { for c in 0..<3 {
                check(abs((patches[i]["rgb"] as! [Double])[c]-Double(palette[changedColors[i]][c]))<15,"tracker resamples colors instead of repeating the previous face")
            }}
        }
        check(guided.analyze(fixture(bytes:blank,quad:guide))["status"] as? String == "searching","tracking cannot turn a plain square into a grid")
        check(guided.analyze(fixture(bytes:blocked,quad:guide))["status"] as? String == "searching","guide cannot bypass occlusion checks")
        let stripes = pixels(colors:[0,1,2,0,1,2,0,1,2],border:false)
        check(guided.analyze(fixture(bytes:stripes,quad:guide))["status"] as? String == "searching","one-direction stripes cannot pass as a 3 by 3 face")
        check(guided.analyze(guideImage)["status"] as? String == "found","guide reacquires after loss")
        guided.reset()
        check(guided.analyze(guideImage)["source"] as? String == "guide","camera restart discards tracking history")
        // A mildly softer picture should still be found through the guide.
        guided.reset()
        let softened = guideImage.applyingFilter("CIGaussianBlur",parameters:["inputRadius":1.1]).cropped(to:guideImage.extent)
        check(guided.analyze(softened)["status"] as? String == "found","guide tolerates a mildly soft camera image")
        // Optional synthetic frame for an isolated UI QA bundle. Never uses a camera.
        if CommandLine.arguments.count == 3 && CommandLine.arguments[1] == "--export-fixture" {
            let image=fixture(bytes:data,quad:tilted)
            let png=vision.context.pngRepresentation(of:image,format:.RGBA8,colorSpace:CGColorSpace(name:CGColorSpace.sRGB)!)!
            let payload:[String:Any]=["image":"data:image/png;base64,"+png.base64EncodedString(),"vision":vision.analyze(image)]
            let json=try! JSONSerialization.data(withJSONObject:payload,options:[.sortedKeys])
            try! ("const visionFixture="+String(data:json,encoding:.utf8)!+";\n").write(toFile:CommandLine.arguments[2],atomically:true,encoding:.utf8)
        }
        print("Passed \(checks) native vision checks.")
    }
}
