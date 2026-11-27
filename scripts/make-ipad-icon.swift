// Makes the iPad app icon from the Mac artwork. iPadOS wants an opaque square and rounds it itself,
// so the Mac icon's transparent rounded edge is replaced with its own background color.
//
//   swift scripts/make-ipad-icon.swift assets/AppIcon.iconset/icon_512x512@2x.png \
//     ipad/CubeClubPad/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers
let input = URL(fileURLWithPath: CommandLine.arguments[1]), output = URL(fileURLWithPath: CommandLine.arguments[2])
let source = CGImageSourceCreateWithURL(input as CFURL, nil)!, image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
let size = 1024
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
// Draw once, sample the background just inside the rounded edge, then fill the corners with it.
context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
let pixels = context.data!.assumingMemoryBound(to: UInt8.self), row = context.bytesPerRow
let sample = pixels + 512 * row + 60 * 4
let background = CGColor(srgbRed: CGFloat(sample[0]) / 255, green: CGFloat(sample[1]) / 255, blue: CGFloat(sample[2]) / 255, alpha: 1)
context.clear(CGRect(x: 0, y: 0, width: size, height: size))
context.setFillColor(background)
context.fill(CGRect(x: 0, y: 0, width: size, height: size))
// Only the middle holds artwork (the cube spans about 210–815 across and 140–795 up); clipping
// to it leaves out the Mac icon's rounded edge, which would show as a faint outline.
context.clip(to: CGRect(x: 130, y: 90, width: 764, height: 844))
context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))
let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil)
CGImageDestinationFinalize(destination)
