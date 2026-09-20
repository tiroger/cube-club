import Foundation
import JavaScriptCore
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let context = JSContext()!
var failed = false
context.exceptionHandler = { _, exception in
    failed = true
    fputs("Test failure: \(exception?.toString() ?? "unknown")\n", stderr)
}
for path in ["Sources/CubeClub/Resources/Web/vendor/cube.js", "Sources/CubeClub/Resources/Web/vendor/solve.js", "Sources/CubeClub/Resources/Web/core.js", "Sources/CubeClub/Resources/Web/cube-view.js", "Sources/CubeClub/Resources/Web/coach-core.js"] {
    context.evaluateScript(try String(contentsOf: root.appendingPathComponent(path), encoding: .utf8))
}
for suite in ["Tests/core-tests.js", "Tests/coach-tests.js"] {
    let result = context.evaluateScript(try String(contentsOf: root.appendingPathComponent(suite), encoding: .utf8))
    if failed { exit(1) }
    print(result?.toString() ?? "No test result")
}
