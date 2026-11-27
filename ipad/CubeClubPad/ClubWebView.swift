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
    private let voice = ClubVoice()
    private let camera = PadCamera()
    private let backups = PadBackups()

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
        #if DEBUG
        // Debug builds only: --debug-script "<script>" runs once the page is ready, for simulator checks.
        let arguments = ProcessInfo.processInfo.arguments
        if let index = arguments.firstIndex(of: "--debug-script"), index + 1 < arguments.count {
            webView.callAsyncJavaScript("while (!document.querySelector('#content h1')) await new Promise(r => setTimeout(r, 50));\n" + arguments[index + 1], arguments: [:], in: nil, in: .page) { _ in }
        }
        #endif
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
        case "speak": voice.speak(body["text"] as? String ?? ""); reply(id, ["ok": true])
        case "stopSpeech": voice.stop(); reply(id, ["ok": true])
        case "voiceState": reply(id, voice.state)
        case "setVoice": voice.choose(body["voice"] as? String ?? ""); reply(id, voice.state)
        case "previewVoice": voice.speak(ClubVoice.sample); reply(id, ["ok": true])
        case "appearance":
            let mode = body["mode"] as? String
            webView.window?.overrideUserInterfaceStyle = mode == "dark" ? .dark : mode == "light" ? .light : .unspecified
            reply(id, ["ok": true])
        case "cameraStart": camera.start(token: body["token"] as? String ?? "") { [weak self] in self?.reply(id, $0) }
        case "cameraStop": camera.stop(); reply(id, ["ok": true])
        case "updateState": reply(id, ["available": false])
        case "exportBackup":
            guard let value = body["value"] as? String, let presenter else { reply(id, ["error": "The backup could not be read."]); return }
            backups.export(value, from: presenter) { [weak self] in self?.reply(id, $0) }
        case "importBackup":
            guard let presenter else { reply(id, ["cancelled": true]); return }
            backups.open(from: presenter) { [weak self] in self?.reply(id, $0) }
        #if DEBUG
        case "debugLog": print("[debug] \(body["text"] as? String ?? "")"); reply(id, ["ok": true])
        #endif
        default: reply(id, ["error": "Unknown action."])
        }
    }

    /// The view controller that presents the Files picker.
    private var presenter: UIViewController? {
        var top = webView.window?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
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
