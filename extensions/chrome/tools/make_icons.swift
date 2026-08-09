import AppKit

// Renders the Zhōng seal icon (red rounded tile, white 中) to PNGs.
// Usage: swift make_icons.swift <out-dir>
guard CommandLine.arguments.count > 1, let outDir = CommandLine.arguments.dropFirst().first else {
    FileHandle.standardError.write(Data("usage: swift make_icons.swift <out-dir>\n".utf8))
    exit(2)
}

let accent = NSColor(calibratedRed: 0.78, green: 0.26, blue: 0.17, alpha: 1) // #c7432b

func render(size: CGFloat, radius: CGFloat, fontSize: CGFloat) -> Data? {
    let px = Int(size)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: px,
        pixelsHigh: px,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { return nil }
    rep.size = NSSize(width: size, height: size)

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    defer { NSGraphicsContext.restoreGraphicsState() }

    let rect = NSRect(x: 0, y: 0, width: size, height: size)
    accent.setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()

    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize, weight: .bold),
        .foregroundColor: NSColor.white,
    ]
    let str = NSAttributedString(string: "中", attributes: attrs)
    let strSize = str.size()
    str.draw(at: NSPoint(x: (size - strSize.width) / 2, y: (size - strSize.height) / 2))

    return rep.representation(using: .png, properties: [:])
}

try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
let icon16 = render(size: 16, radius: 3.5, fontSize: 12)
let icon128 = render(size: 128, radius: 28, fontSize: 92)
guard let icon16, let icon128 else {
    FileHandle.standardError.write(Data("icon rendering failed\n".utf8))
    exit(1)
}
try icon16.write(to: URL(fileURLWithPath: outDir + "/16.png"))
try icon128.write(to: URL(fileURLWithPath: outDir + "/128.png"))
print("icons written to \(outDir)")