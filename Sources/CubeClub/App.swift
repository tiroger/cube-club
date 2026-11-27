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
    private var shell: ClubShell!
    private let camera = CubeCamera()
    private let voice = ClubVoice()
    private let storage = ClubStorage()
    private let updates = ClubUpdates()
    private lazy var solver = CubeSolver(root: webRoot)
    private var webRoot: URL { Self.webRoot }
    /// build.sh puts SwiftPM's resource bundle in Contents/Resources. Bundle.module differs between
    /// Swift versions; Swift 6.1's looks beside the .app and in the build machine's .build folder,
    /// so GitHub-built releases crashed at launch on every other Mac. The bundle's own layout
    /// differs too: Swift 6.1 makes it flat (Web/ at the top), Swift 6.4 nests Contents/Resources.
    /// Bundle.module stays only as the fallback for `swift run`.
    static let webRoot: URL = {
        if let bundle = Bundle.main.resourceURL?.appendingPathComponent("CubeClub_CubeClub.bundle") {
            for web in [bundle.appendingPathComponent("Contents/Resources/Web"), bundle.appendingPathComponent("Web")]
            where FileManager.default.fileExists(atPath: web.appendingPathComponent("index.html").path) {
                return web
            }
        }
        return Bundle.module.url(forResource: "Web", withExtension: nil)!
    }()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        menu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About Cube Club", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        if let updateItem = updates.menuItem() { appMenu.addItem(updateItem) }
        let settingsItem = NSMenuItem(title: "Settings…", action: #selector(openSettings), keyEquivalent: ",")
        settingsItem.target = self
        appMenu.addItem(settingsItem)
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
        if let raw = UserDefaults.standard.string(forKey: "progress.v1"), let data = raw.data(using: .utf8),
           let saved = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           let preferences = saved["preferences"] as? [String: Any] {
            applyAppearance(preferences["appearance"] as? String ?? "system")
        }
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "native")
        config.userContentController.addUserScript(WKUserScript(source: "window.cubeClubNativeShell = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860), styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView], backing: .buffered, defer: false)
        window.title = "Cube Club"
        window.minSize = NSSize(width: 1024, height: 720)
        window.backgroundColor = .windowBackgroundColor
        shell = ClubShell(window: window, webView: webView) { [weak self] action in
            self?.send("window.nativeCommand", arguments: [action])
        }
        settingsItem.target = shell
        settingsItem.action = #selector(ClubShell.openSettings)
        shell.addMenus(to: menu)
        window.delegate = self
        window.makeKeyAndOrderFront(nil)
        webView.loadFileURL(webRoot.appendingPathComponent("index.html"), allowingReadAccessTo: webRoot)
        camera.frames.onPreview = { [weak self] packet, done in self?.sendCamera("onCameraFrame", packet: packet, completion: done) ?? done() }
        camera.frames.onAnalysis = { [weak self] packet, done in self?.sendCamera("onCameraAnalysis", packet: packet, completion: done) ?? done() }
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
        case "chromeState":
            shell.update(body)
            reply(id, ["ok": true])
        case "solve":
            guard let facelets = body["facelets"] as? String, facelets.count == 54 else {
                reply(id, ["error": "Please scan all six faces first."]); return
            }
            let method = body["method"] as? String == "beginner" ? "beginner" : "general"
            solver.solve(facelets: facelets, method: method) { [weak self] result in self?.reply(id, result) }
        case "cameraStart": camera.start(token: body["token"] as? String ?? "") { [weak self] result in self?.reply(id, result) }
        case "cameraStop": camera.stop(); reply(id, ["ok": true])
        case "speak": voice.speak(body["text"] as? String ?? ""); reply(id, ["ok": true])
        case "stopSpeech": voice.stop(); reply(id, ["ok": true])
        case "voiceState": reply(id, voice.state)
        case "setVoice": voice.choose(body["voice"] as? String ?? ""); reply(id, voice.state)
        case "previewVoice": voice.speak(ClubVoice.sample); reply(id, ["ok": true])
        case "updateState": reply(id, updates.state)
        case "setAutomaticUpdates":
            guard let enabled = body["enabled"] as? Bool else { reply(id, ["error": "Unknown update setting."]); return }
            updates.setAutomatic(enabled)
            reply(id, updates.state)
        case "checkForUpdates": updates.checkNow(); reply(id, updates.state)
        case "appearance":
            let mode = body["mode"] as? String ?? "system"
            guard ["system", "light", "dark"].contains(mode) else { reply(id, ["error": "Unknown appearance."]); return }
            applyAppearance(mode)
            reply(id, ["ok": true])
        case "exportBackup":
            guard let value = body["value"] as? String else { reply(id, ["error": "The backup could not be read."]); return }
            BackupFiles.export(value, window: window) { [weak self] in self?.reply(id, $0) }
        case "importBackup":
            BackupFiles.open(window: window) { [weak self] in self?.reply(id, $0) }
        case "loadRecovery": reply(id, ["value": storage.recovery ?? ""])
        case "loadProgress": reply(id, ["value": storage.progress])
        case "saveProgress", "restoreProgress":
            guard let value = body["value"] as? String,
                  storage.save(value, restoring: action == "restoreProgress") else {
                reply(id, ["error": "Progress could not be saved."]); return
            }
            reply(id, ["ok": true])
        default: reply(id, ["error": "Unknown action."])
        }
    }

    @objc private func openSettings() { shell?.openSettings() }
    private func applyAppearance(_ mode: String) {
        NSApplication.shared.appearance = mode == "dark" ? NSAppearance(named: .darkAqua) : mode == "light" ? NSAppearance(named: .aqua) : nil
    }

    private func reply(_ id: Int, _ result: [String: Any]) { send("window.nativeResult", arguments: [id, result]) }
    private func send(_ function: String, arguments: [Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: arguments), let json = String(data: data, encoding: .utf8) else { return }
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript("\(function)?.(...\(json))", completionHandler: nil) }
    }
    private func sendCamera(_ function: String, packet: [String: Any], completion: @escaping () -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let webView = self?.webView else { completion(); return }
            // Await image decoding as well as JavaScript delivery before allowing
            // the next preview through. At most one packet per lane is in flight.
            webView.callAsyncJavaScript("await window.\(function)?.(packet)", arguments: ["packet": packet], in: nil, in: .page) { _ in completion() }
        }
    }
    func windowWillClose(_ notification: Notification) { camera.stop(); voice.stop() }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { camera.stop() }
}

final class CubeCamera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let frames = CameraFramePipeline()
    var onError: (([String: Any]) -> Void)?
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "club.cube.camera")
    private var streamToken = ""
    private var wantsCamera = false
    private var requestGeneration = 0
    private var observer: NSObjectProtocol?

    func start(token: String, completion: @escaping ([String: Any]) -> Void) {
        queue.async { [self] in
            self.requestGeneration += 1
            let generation = self.requestGeneration
            self.wantsCamera = true
            self.streamToken = token
            self.frames.start(token: token)
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized: self.configure(generation: generation, completion)
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                    if granted { self?.configure(generation: generation, completion) }
                    else { completion(["error": "Camera access is off. You can still paint colors by hand, or allow Cube Club in System Settings → Privacy & Security → Camera."]) }
                }
            default: completion(["error": "Camera access is off. Use manual colors, or allow Cube Club in System Settings → Privacy & Security → Camera."])
            }
        }
    }

    private func configure(generation: Int, _ completion: @escaping ([String: Any]) -> Void) {
        queue.async { [self] in
            guard self.wantsCamera, generation == self.requestGeneration else { completion(["error": "Camera canceled."]); return }
            if self.session.inputs.isEmpty {
                guard let device = AVCaptureDevice.default(for: .video) else { completion(["error": "No camera found. You can enter your cube’s colors by hand."]); return }
                do {
                    let input = try AVCaptureDeviceInput(device: device)
                    let output = AVCaptureVideoDataOutput()
                    output.alwaysDiscardsLateVideoFrames = true
                    output.setSampleBufferDelegate(self, queue: self.queue)
                    self.session.beginConfiguration()
                    self.session.sessionPreset = self.session.canSetSessionPreset(.hd1280x720) ? .hd1280x720 : .high
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
                        self?.queue.async { [weak self] in
                            guard let self, self.wantsCamera else { return }
                            self.onError?(["token": self.streamToken, "message": "The camera stopped. Try again, or use manual colors."])
                        }
                    }
                } catch { completion(["error": "Could not open the camera. Try manual color entry."]); return }
            }
            if !self.session.isRunning { self.session.startRunning() }
            completion(["ok": true])
        }
    }

    func stop() { frames.stop(); queue.async { self.frames.stop(); self.requestGeneration += 1; self.wantsCamera = false; if self.session.isRunning { self.session.stopRunning() } } }
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard wantsCamera, let buffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        frames.submit(CIImage(cvPixelBuffer: buffer))
    }
    deinit { if let observer = observer { NotificationCenter.default.removeObserver(observer) } }
}
