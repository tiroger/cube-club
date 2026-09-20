// swift-tools-version: 5.9
import PackageDescription
let package = Package(
    name: "CubeClub",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "CubeClub", targets: ["CubeClub"])],
    targets: [.executableTarget(name: "CubeClub", resources: [.copy("Resources/Web")])]
)
