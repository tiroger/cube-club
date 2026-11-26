import AVFoundation
import SwiftUI
import WebKit

/// Hosts the teaching interface and answers its native bridge, as App.swift does on the Mac.
struct ClubWebView: UIViewRepresentable {
    func makeCoordinator() -> Bridge { Bridge() }
    func makeUIView(context: Context) -> WKWebView { context.coordinator.webView }
    func updateUIView(_ view: WKWebView, context: Context) {}
}

final class Bridge: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    let webView: WKWebView
    private let storage = ClubStorage()
    private let speech = AVSpeechSynthesizer()
    private let camera = PadCamera()

    override init() {
        let web = Bundle.main.url(forResource: "Web", withExtension: nil)!
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(AppSchemeHandler(root: web), forURLScheme: AppSchemeHandler.scheme)
        // Solve in the page: iPadOS allows no JIT for JavaScriptCore inside apps, only in WebKit's process.
        config.userContentController.addUserScript(WKUserScript(source: "window.cubeClubSolverInPage = true; window.cubeClubPad = true;",
                                                                injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        webView.isInspectable = true
        #endif
        super.init()
        config.userContentController.add(self, name: "native")
        webView.navigationDelegate = self
        camera.frames.onPreview = { [weak self] packet, done in self?.sendCamera("onCameraFrame", packet, done) ?? done() }
        camera.frames.onAnalysis = { [weak self] packet, done in self?.sendCamera("onCameraAnalysis", packet, done) ?? done() }
        camera.onError = { [weak self] error in self?.send("window.onCameraError", [error]) }
        webView.load(URLRequest(url: AppSchemeHandler.start))
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(action.request.url?.scheme == AppSchemeHandler.scheme ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if ProcessInfo.processInfo.arguments.contains("--measure-solver") { SpikeChecks.measureSolver(in: webView) }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.scheme == AppSchemeHandler.scheme,
              let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        switch action {
        case "chromeState": reply(id, ["ok": true])
        case "loadProgress": reply(id, ["value": storage.progress])
        case "loadRecovery": reply(id, ["value": storage.recovery ?? ""])
        case "saveProgress", "restoreProgress":
            guard let value = body["value"] as? String, storage.save(value, restoring: action == "restoreProgress") else {
                reply(id, ["error": "Progress could not be saved."]); return
            }
            reply(id, ["ok": true])
        case "speak":
            speech.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: String((body["text"] as? String ?? "").prefix(2000)))
            utterance.rate = 0.43
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
            speech.speak(utterance)
            reply(id, ["ok": true])
        case "stopSpeech": speech.stopSpeaking(at: .immediate); reply(id, ["ok": true])
        case "appearance":
            let mode = body["mode"] as? String
            webView.window?.overrideUserInterfaceStyle = mode == "dark" ? .dark : mode == "light" ? .light : .unspecified
            reply(id, ["ok": true])
        case "cameraStart": camera.start(token: body["token"] as? String ?? "") { [weak self] in self?.reply(id, $0) }
        case "cameraStop": camera.stop(); reply(id, ["ok": true])
        case "updateState": reply(id, ["available": false])
        case "spikeLog": print("[spike] \(body["text"] as? String ?? "")"); reply(id, ["ok": true])
        case "exportBackup", "importBackup": reply(id, ["error": "Backups aren't on iPad yet."])
        default: reply(id, ["error": "Unknown action."])
        }
    }

    private func reply(_ id: Int, _ result: [String: Any]) { send("window.nativeResult", [id, result]) }
    private func send(_ function: String, _ arguments: [Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: arguments), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in self?.webView.evaluateJavaScript("\(function)?.(...\(json))") }
    }
    private func sendCamera(_ function: String, _ packet: [String: Any], _ done: @escaping () -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.webView else { done(); return }
            webView.callAsyncJavaScript("await window.\(function)?.(packet)", arguments: ["packet": packet], in: nil, in: .page) { _ in done() }
        }
    }
}

/// Spike-only measurements, run with the launch argument --measure-solver.
enum SpikeChecks {
    static func measureSolver(in webView: WKWebView) {
        let script = """
        const log = text => window.webkit.messageHandlers.native.postMessage({action: 'spikeLog', text});
        const facelets = new Cube().move("R U F2 L' D B R2 U' F D2").asString();
        let t = performance.now(); let first = await solveFacelets(facelets, 'general');
        const general = performance.now() - t;
        t = performance.now(); await solveFacelets(facelets, 'general'); const again = performance.now() - t;
        t = performance.now(); const beginner = await solveFacelets(facelets, 'beginner'); const teach = performance.now() - t;
        const verified = Cube.fromString(facelets).move(first.algorithm || '').isSolved();
        log(`general first ${Math.round(general)} ms (${(first.algorithm||'').split(' ').length} moves, verified ${verified}), again ${Math.round(again)} ms, beginner ${Math.round(teach)} ms ${beginner.error ? 'error ' + beginner.error : 'ok'}; viewport ${innerWidth}x${innerHeight}; scroll ${document.documentElement.scrollWidth}`);
        return true;
        """
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
            if case .failure(let error) = result { print("[spike] measurement failed: \(error)") }
        }
    }
}
