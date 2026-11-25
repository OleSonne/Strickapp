// swift-tools-version: 5.9
// Nur zum Testen der Fachlogik, auch unter Linux. Die App liegt in Strickapp.swiftpm.

import PackageDescription

let package = Package(
    name: "StrickCore",
    targets: [
        .target(name: "StrickCore", path: "Strickapp.swiftpm/Core"),
        .testTarget(name: "StrickCoreTests", dependencies: ["StrickCore"])
    ]
)
