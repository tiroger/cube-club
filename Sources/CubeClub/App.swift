import AppKit
import WebKit
import AVFoundation
import JavaScriptCore
import CoreImage

@main
struct CubeClubApp {
    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        app.run()
        withExtendedLifetime(delegate) {}
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private let camera = CubeCamera()
    private let speech = AVSpeechSynthesizer()
    private let solverQueue = DispatchQueue(label: "club.cube.solver", qos: .userInitiated)
    private var solver: JSContext?
    private var webRoot: URL { Bundle.module.url(forResource: "Web", withExtension: nil)! }

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        menu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Cube Club", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Cube Club", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        let editItem = NSMenuItem()
        menu.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        editItem.submenu = editMenu
        NSApplication.shared.mainMenu = menu
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "native")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Cube Club"
        window.minSize = NSSize(width: 1024, height: 720)
        window.backgroundColor = NSColor(calibratedRed: 0.97, green: 0.97, blue: 0.94, alpha: 1)
        window.contentView = webView
        window.delegate = self
        window.center()
        window.makeKeyAndOrderFront(nil)
        webView.loadFileURL(webRoot.appendingPathComponent("index.html"), allowingReadAccessTo: webRoot)
        camera.onFrame = { [weak self] frame in self?.send("window.onCameraFrame", arguments: [frame]) }
        camera.onError = { [weak self] error in self?.send("window.onCameraError", arguments: [error]) }
        NSApplication.shared.activate(ignoringOtherApps: true)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url, url.isFileURL,
              url.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/") else {
            decisionHandler(.cancel); return
        }
        decisionHandler(.allow)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame,
              let url = message.frameInfo.request.url, url.isFileURL,
              url.standardizedFileURL.path.hasPrefix(webRoot.standardizedFileURL.path + "/"),
              let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        switch action {
        case "solve":
            guard let facelets = body["facelets"] as? String, facelets.count == 54 else {
                reply(id, ["error": "Please scan all six faces first."]); return
            }
            let root = webRoot
            solverQueue.async { [weak self] in
                guard let self = self else { return }
                if self.solver == nil {
                    let context = JSContext()!
                    for name in ["vendor/cube.js", "vendor/solve.js", "core.js"] {
                        guard let code = try? String(contentsOf: root.appendingPathComponent(name), encoding: .utf8) else {
                            self.reply(id, ["error": "A solver file is missing. Please rebuild the app."]); return
                        }
                        context.evaluateScript(code)
                    }
                    self.solver = context
                }
                guard let context = self.solver else { return }
                context.exception = nil
                let result = context.objectForKeyedSubscript("solveCubeRequest")?.call(withArguments: [facelets])?.toDictionary() as? [String: Any]
                if context.exception != nil {
                    self.reply(id, ["error": "That cube could not be solved. Check the scanned colors and orientation."])
                } else {
                    self.reply(id, result ?? ["error": "Please try scanning again."])
                }
            }
        case "cameraStart": camera.start { [weak self] result in self?.reply(id, result) }
        case "cameraStop": camera.stop(); reply(id, ["ok": true])
        case "speak":
            speech.stopSpeaking(at: .immediate)
            let utterance = AVSpeechUtterance(string: String((body["text"] as? String ?? "").prefix(2000)))
            utterance.rate = 0.43
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
            speech.speak(utterance)
            reply(id, ["ok": true])
        case "stopSpeech": speech.stopSpeaking(at: .immediate); reply(id, ["ok": true])
        case "loadProgress": reply(id, ["value": UserDefaults.standard.string(forKey: "progress.v1") ?? "{}"])
        case "saveProgress":
            if let value = body["value"] as? String, value.utf8.count < 32000 { UserDefaults.standard.set(value, forKey: "progress.v1") }
            reply(id, ["ok": true])
        default: reply(id, ["error": "Unknown action."])
        }
    }

    private func reply(_ id: Int, _ result: [String: Any]) { send("window.nativeResult", arguments: [id, result]) }
    private func send(_ function: String, arguments: [Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: arguments), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript("\(function)?.(...\(json))", completionHandler: nil) }
    }
    func windowWillClose(_ notification: Notification) { camera.stop(); speech.stopSpeaking(at: .immediate) }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { camera.stop() }
}

final class CubeCamera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    var onFrame: ((String) -> Void)?
    var onError: ((String) -> Void)?
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "club.cube.camera")
    private let context = CIContext()
    private var lastFrame = CFAbsoluteTimeGetCurrent()
    private var wantsCamera = false
    private var observer: NSObjectProtocol?

    func start(completion: @escaping ([String: Any]) -> Void) {
        queue.async { self.wantsCamera = true }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: configure(completion)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                if granted { self?.configure(completion) }
                else { completion(["error": "Camera access is off. You can still paint the colors by hand, or allow Cube Club in System Settings → Privacy & Security → Camera."]) }
            }
        default: completion(["error": "Camera access is off. Use manual colors, or allow Cube Club in System Settings → Privacy & Security → Camera."])
        }
    }

    private func configure(_ completion: @escaping ([String: Any]) -> Void) {
        queue.async { [self] in
            guard self.wantsCamera else { completion(["error": "Camera canceled."]); return }
            if self.session.inputs.isEmpty {
                guard let device = AVCaptureDevice.default(for: .video) else { completion(["error": "No camera found. You can enter your cube’s colors by hand."]); return }
                do {
                    let input = try AVCaptureDeviceInput(device: device)
                    let output = AVCaptureVideoDataOutput()
                    output.alwaysDiscardsLateVideoFrames = true
                    output.setSampleBufferDelegate(self, queue: self.queue)
                    self.session.beginConfiguration()
                    self.session.sessionPreset = .medium
                    guard self.session.canAddInput(input), self.session.canAddOutput(output) else {
                        self.session.commitConfiguration()
                        completion(["error": "This camera is unavailable. Try manual color entry."]); return
                    }
                    self.session.addInput(input)
                    self.session.addOutput(output)
                    self.session.commitConfiguration()
                    if let connection = output.connection(with: .video), connection.isVideoMirroringSupported {
                        connection.automaticallyAdjustsVideoMirroring = false
                        connection.isVideoMirrored = false
                    }
                    self.observer = NotificationCenter.default.addObserver(forName: .AVCaptureSessionRuntimeError, object: self.session, queue: nil) { [weak self] _ in
                        self?.onError?("The camera stopped. Try again, or use manual colors.")
                    }
                } catch { completion(["error": "Could not open the camera. Try manual color entry."]); return }
            }
            if !self.session.isRunning { self.session.startRunning() }
            completion(["ok": true])
        }
    }

    func stop() { queue.async { self.wantsCamera = false; if self.session.isRunning { self.session.stopRunning() } } }
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        let now = CFAbsoluteTimeGetCurrent()
        guard wantsCamera, now - lastFrame > 0.16, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        lastFrame = now
        let image = CIImage(cvPixelBuffer: buffer)
        let scale = min(1, 720 / image.extent.width)
        let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return }
        let bitmap = NSBitmapImageRep(cgImage: cgImage)
        guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) else { return }
        onFrame?("data:image/jpeg;base64," + data.base64EncodedString())
    }
    deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }
}
