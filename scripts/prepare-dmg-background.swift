import AppKit

// Preserve the generated pixels; only change the container and print resolution
// so Finder uses the intended point size on both Retina and ordinary displays.
guard CommandLine.arguments.count == 4 else {
    fputs("Usage: prepare-dmg-background.swift source.png output.tiff layout.json\n", stderr)
    exit(1)
}
let source = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let layoutURL = URL(fileURLWithPath: CommandLine.arguments[3])
let layout = try JSONSerialization.jsonObject(with: Data(contentsOf: layoutURL)) as! [String: Any]
guard let width = layout["width"] as? Int, let height = layout["height"] as? Int,
      let bitmap = NSBitmapImageRep(data: try Data(contentsOf: source)),
      bitmap.pixelsWide >= width, bitmap.pixelsHigh >= height else {
    fputs("Installer artwork or layout is invalid.\n", stderr)
    exit(1)
}
bitmap.size = NSSize(width: width, height: height)
guard let tiff = bitmap.tiffRepresentation(using: .lzw, factor: 1) else {
    fputs("Could not encode the Finder background.\n", stderr)
    exit(1)
}
try tiff.write(to: output, options: .atomic)
print("Prepared \(bitmap.pixelsWide)×\(bitmap.pixelsHigh) artwork at \(width)×\(height) points.")
