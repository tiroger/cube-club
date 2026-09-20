import AppKit
import Foundation
let folder = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("assets/AppIcon.iconset")
try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
func color(_ hex: UInt32) -> NSColor { NSColor(calibratedRed: CGFloat((hex >> 16) & 255)/255, green: CGFloat((hex >> 8) & 255)/255, blue: CGFloat(hex & 255)/255, alpha: 1) }
for (name, size) in [("icon_16x16",16),("icon_16x16@2x",32),("icon_32x32",32),("icon_32x32@2x",64),("icon_128x128",128),("icon_128x128@2x",256),("icon_256x256",256),("icon_256x256@2x",512),("icon_512x512",512),("icon_512x512@2x",1024)] {
 let image = NSImage(size: NSSize(width:size,height:size))
 image.lockFocus()
 let t = AffineTransform(scale: CGFloat(size)/1024)
 (t as NSAffineTransform).concat()
 color(0xE7EEE0).setFill()
 NSBezierPath(roundedRect:NSRect(x:18,y:18,width:988,height:988),xRadius:220,yRadius:220).fill()
 let faces: [([NSPoint],UInt32)] = [([NSPoint(x:220,y:625),NSPoint(x:512,y:785),NSPoint(x:804,y:625),NSPoint(x:512,y:460)],0xF5D575),([NSPoint(x:220,y:625),NSPoint(x:512,y:460),NSPoint(x:512,y:150),NSPoint(x:220,y:320)],0xFFF8DE),([NSPoint(x:512,y:460),NSPoint(x:804,y:625),NSPoint(x:804,y:320),NSPoint(x:512,y:150)],0x76B398)]
 func lerp(_ a:NSPoint,_ b:NSPoint,_ v:CGFloat)->NSPoint { NSPoint(x:a.x+(b.x-a.x)*v,y:a.y+(b.y-a.y)*v) }
 for (points,fill) in faces {
  let path=NSBezierPath();path.move(to:points[0]);points.dropFirst().forEach{path.line(to:$0)};path.close();color(fill).setFill();path.fill();color(0x315F49).setStroke();path.lineWidth=16;path.lineJoinStyle = .round;path.stroke()
  for n in 1...2 { let a=CGFloat(n)/3; let line=NSBezierPath();line.move(to:lerp(points[0],points[1],a));line.line(to:lerp(points[3],points[2],a));line.move(to:lerp(points[0],points[3],a));line.line(to:lerp(points[1],points[2],a));line.lineWidth=9;line.stroke() }
 }
 color(0x315F49).setFill();NSBezierPath(ovalIn:NSRect(x:298,y:405,width:22,height:36)).fill();NSBezierPath(ovalIn:NSRect(x:420,y:338,width:22,height:36)).fill()
 let smile=NSBezierPath();smile.move(to:NSPoint(x:345,y:349));smile.curve(to:NSPoint(x:393,y:322),controlPoint1:NSPoint(x:355,y:312),controlPoint2:NSPoint(x:380,y:299));smile.lineWidth=10;smile.lineCapStyle = .round;color(0x315F49).setStroke();smile.stroke()
 image.unlockFocus()
 guard let tiff=image.tiffRepresentation,let rep=NSBitmapImageRep(data:tiff),let png=rep.representation(using:.png,properties:[:]) else { fatalError("Icon rendering failed") }
 try png.write(to:folder.appendingPathComponent(name+".png"))
}
