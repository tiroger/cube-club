// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "CubeClub",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "CubeClub", targets: ["CubeClub"])],
    dependencies: [.package(url: "https://github.com/sparkle-project/Sparkle", from: "2.6.0")],
    targets: [.executableTarget(
        name: "CubeClub",
        dependencies: [.product(name: "Sparkle", package: "Sparkle")],
        resources: [.copy("Resources/Web")],
        // Find Sparkle.framework inside the app bundle.
        linkerSettings: [.unsafeFlags(["-Xlinker", "-rpath", "-Xlinker", "@executable_path/../Frameworks"])]
    )]
)
