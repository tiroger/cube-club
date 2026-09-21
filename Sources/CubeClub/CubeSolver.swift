import Foundation
import JavaScriptCore

/// Both solve modes run off the UI thread and use the same validated cube model.
final class CubeSolver {
    private let root: URL
    private let queue = DispatchQueue(label: "club.cube.solver", qos: .userInitiated)
    private var context: JSContext?

    init(root: URL) { self.root = root }

    func solve(facelets: String, method: String, completion: @escaping ([String: Any]) -> Void) {
        queue.async {
            let result = self.solveOnQueue(facelets: facelets, method: method)
            DispatchQueue.main.async { completion(result) }
        }
    }

    private func solveOnQueue(facelets: String, method: String) -> [String: Any] {
        guard facelets.count == 54 else { return ["error": "Please scan all six faces first."] }
        if context == nil {
            guard let fresh = JSContext() else { return ["error": "The solver could not start. Please try again."] }
            for name in ["vendor/cube.js", "vendor/solve.js", "core.js", "beginner-core.js"] {
                guard let code = try? String(contentsOf: root.appendingPathComponent(name), encoding: .utf8) else {
                    return ["error": "A solver file is missing. Please rebuild the app."]
                }
                fresh.evaluateScript(code)
                if fresh.exception != nil { return ["error": "A solver file could not load. Please rebuild the app."] }
            }
            context = fresh
        }
        guard let context = context else { return ["error": "Please try scanning again."] }
        context.exception = nil
        let function = method == "beginner" ? "solveBeginnerRequest" : "solveCubeRequest"
        let result = context.objectForKeyedSubscript(function)?.call(withArguments: [facelets])?.toDictionary() as? [String: Any]
        if context.exception != nil { return ["error": "That cube could not be solved. Check the scanned colors and orientation."] }
        return result ?? ["error": "Please try scanning again."]
    }
}
