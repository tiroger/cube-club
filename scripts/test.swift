import Foundation
import JavaScriptCore
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let context = JSContext()!
var failed = false
context.exceptionHandler = { _, exception in
    failed = true
    fputs("Test failure: \(exception?.toString() ?? "unknown")\n", stderr)
}
for path in ["Sources/CubeClub/Resources/Web/vendor/cube.js", "Sources/CubeClub/Resources/Web/vendor/solve.js", "Sources/CubeClub/Resources/Web/core.js", "Sources/CubeClub/Resources/Web/cube-view.js"] {
    context.evaluateScript(try String(contentsOf: root.appendingPathComponent(path), encoding: .utf8))
}
let result = context.evaluateScript(try String(contentsOf: root.appendingPathComponent("Tests/core-tests.js"), encoding: .utf8))
if failed { exit(1) }
print(result?.toString() ?? "No test result")
