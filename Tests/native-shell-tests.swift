import AppKit
import WebKit

// The actual AppKit shell with an in-memory persistence bridge; never learner data.
@main
struct NativeShellTests {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let runner = NativeShellRunner()
        app.delegate = runner
        app.run()
        withExtendedLifetime(runner) {}
    }
}
final class NativeShellRunner: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    var shell: ClubShell!
    let menu = NSMenu()
    private lazy var solver = CubeSolver(root: root.appendingPathComponent("Sources/CubeClub/Resources/Web"))
    var saved = "{}"
    var recovery = ""
    var importReply: [String: Any] = ["cancelled": true]
    var failRestore = false
    // Stands in for Sparkle: tests choose the state the settings screen sees.
    var updateState: [String: Any] = ["available": false]
    // Stands in for ClubVoice: two voices, nothing chosen yet; previews are counted.
    var chosenVoice = ""
    var naturalVoice = false
    var voicePreviews = 0
    var voiceState: [String: Any] {
        let voices = [["id": "test.ava", "name": "Ava<b>", "quality": "Premium", "language": "en-US"], ["id": "test.sam", "name": "Samantha", "quality": "Standard", "language": "en-US"]]
        return ["current": chosenVoice.isEmpty ? "test.ava" : chosenVoice, "chosen": chosenVoice, "natural": naturalVoice, "voices": voices]
    }
    var launch = 0
    var accumulatedChecks = 0
    var started = false
    let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        // First-time tours would cover the screens these tests drive; Tests/onboarding-ui-tests.js turns them back on.
        config.userContentController.addUserScript(WKUserScript(source: "window.cubeClubNoTours=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.websiteDataStore = .nonPersistent()
        config.userContentController.add(self, name: "native")
        config.userContentController.addUserScript(WKUserScript(source: "window.cubeClubNativeShell=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x: 0,y: 0,width: 1024,height: 720), styleMask: [.titled,.resizable,.fullSizeContentView], backing: .buffered, defer: false)
        shell = ClubShell(window: window, webView: web, savesWindowLayout: false) { [weak self] action in
            let json = String(data: try! JSONSerialization.data(withJSONObject: [action]), encoding: .utf8)!
            self?.web.evaluateJavaScript("window.nativeCommand(...\(json))")
        }
        shell.addMenus(to: menu)
        // Avoid reading or writing app window-layout preferences in the test runner.
        window.setFrameAutosaveName("")
        window.setContentSize(NSSize(width: 1024,height: 720))
        window.orderFront(nil)
        let directory = root.appendingPathComponent("Sources/CubeClub/Resources/Web")
        web.loadFileURL(directory.appendingPathComponent("index.html"),allowingReadAccessTo: directory)
        DispatchQueue.main.asyncAfter(deadline: .now()+55) { self.fail("Native shell timed out") }
    }
    func fail(_ message: String) -> Never { fputs("Native shell failure: \(message)\n",stderr); exit(1) }
    func reply(_ id: Int, _ result: [String: Any]) {
        let json = String(data: try! JSONSerialization.data(withJSONObject: [id,result]), encoding: .utf8)!
        web.evaluateJavaScript("window.nativeResult(...\(json))")
    }
    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        switch action {
        case "solve":
            solver.solve(facelets: body["facelets"] as! String, method: body["method"] as? String ?? "general") { self.reply(id, $0) }
        case "continuityTestInput":
            importReply = body["reply"] as? [String: Any] ?? ["cancelled": true]
            failRestore = body["failRestore"] as? Bool ?? false
            reply(id,["ok": true])
        case "exportBackup":
            do { _ = try BackupFiles.data(body["value"] as! String); reply(id,["ok": true]) }
            catch { reply(id,["error": error.localizedDescription]) }
        case "importBackup": reply(id,importReply)
        case "loadRecovery": reply(id,["value": recovery])
        case "restoreProgress":
            if failRestore { reply(id,["error": "Test restore failure"]) }
            else { recovery = saved; saved = body["value"] as! String; reply(id,["ok": true]) }
        case "loadProgress": reply(id,["value": saved])
        case "saveProgress": saved = body["value"] as! String; reply(id,["ok": true])
        case "appearance":
            let mode = body["mode"] as? String
            NSApplication.shared.appearance = mode == "dark" ? NSAppearance(named:.darkAqua) : mode == "light" ? NSAppearance(named:.aqua) : nil
            reply(id,["ok": true])
        case "chromeState": shell.update(body); reply(id,["ok": true])
        case "updateTestState": updateState = body["state"] as? [String: Any] ?? ["available": false]; reply(id,["ok": true])
        case "updateState": reply(id,updateState)
        case "voiceState": reply(id,voiceState)
        case "voiceTestNatural": naturalVoice = body["natural"] as? Bool ?? false; reply(id,["ok": true])
        case "setVoice": chosenVoice = body["voice"] as? String ?? ""; reply(id,voiceState)
        case "previewVoice": voicePreviews += 1; reply(id,["ok": true, "previews": voicePreviews])
        case "voiceTestPreviews": reply(id,["previews": voicePreviews])
        case "setAutomaticUpdates": updateState["automatic"] = body["enabled"] as? Bool ?? false; reply(id,updateState)
        case "checkForUpdates": updateState["lastChecked"] = Date().timeIntervalSince1970*1000; reply(id,updateState)
        case "shellTestCommand": shell.perform(body["command"] as! String); reply(id,["ok": true])
        case "shellTestBrandClick":
            let button = window.toolbar!.items.first { $0.itemIdentifier.rawValue == "brand" }!.view as! ClubBrandButton
            button.performClick(nil)
            reply(id,["ok": true])
        case "shellSnapshot":
            let item = { (name: String) in self.window.toolbar!.items.first { $0.itemIdentifier.rawValue == name }! }
            let brand = item("brand").view as! ClubBrandButton
            let brandFrame = brand.convert(brand.bounds, to: nil)
            let parentItem = menu.items.first { $0.submenu?.title == "Go" }!.submenu!.items.first!
            let parentAvailable = shell.validateMenuItem(parentItem)
            reply(id,["brandTitle": brand.sectionTitle, "brandEnabled": brand.isEnabled,
                      "brandFits": brandFrame.minX >= 0 && brandFrame.maxX <= window.frame.width && brandFrame.height >= 42,
                      "integratedTitle": window.titleVisibility == .hidden && window.titlebarAppearsTransparent,
                      "title": window.title, "parentAvailable": parentAvailable, "parentLabel": parentItem.title, "hasBackArrow": window.toolbar!.items.contains { $0.itemIdentifier.rawValue == "back" }, "scan": item("scan").isEnabled, "settings": item("settings").isEnabled, "voice": item("voice").label, "sidebar": item("sidebar").label, "contentWidth": web.bounds.width])
        default: reply(id,["ok": true])
        }
    }
    func webView(_ webView: WKWebView,didFinish navigation: WKNavigation!) {
        guard !started else { return }; started = true
        do {
            let script = try String(contentsOf: root.appendingPathComponent(CommandLine.arguments.dropFirst().first ?? "Tests/native-shell-tests.js"),encoding: .utf8)
            web.callAsyncJavaScript(script,arguments: ["testLaunch": launch, "previousChecks": accumulatedChecks],in: nil,in: .page) { result in
                switch result {
                case .failure(let error): self.fail("\(error.localizedDescription) \((error as NSError).userInfo)")
                case .success(let value):
                    if let result = value as? [String: Any], result["reload"] as? Bool == true, self.launch < 2 {
                        self.accumulatedChecks = result["checks"] as? Int ?? 0; self.launch += 1; self.started = false; self.web.reload()
                    } else { print(value); exit(0) }
                }
            }
        } catch { fail(error.localizedDescription) }
    }
}
