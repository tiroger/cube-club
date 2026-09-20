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
    var saved = "{}"
    var checks = 0
    var started = false
    let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
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
        // Avoid reading or writing app window-layout preferences in the test runner.
        window.setFrameAutosaveName("")
        shell.split.splitView.autosaveName = nil
        window.setContentSize(NSSize(width: 1024,height: 720))
        window.orderFront(nil)
        let directory = root.appendingPathComponent("Sources/CubeClub/Resources/Web")
        web.loadFileURL(directory.appendingPathComponent("index.html"),allowingReadAccessTo: directory)
        DispatchQueue.main.asyncAfter(deadline: .now()+55) { self.fail("Native shell timed out") }
    }
    func fail(_ message: String) -> Never { fputs("Native shell failure: \(message)\n",stderr); exit(1) }
    func check(_ value: Bool, _ message: String) { checks += 1; if !value { fail(message) } }
    func reply(_ id: Int, _ result: [String: Any]) {
        let json = String(data: try! JSONSerialization.data(withJSONObject: [id,result]), encoding: .utf8)!
        web.evaluateJavaScript("window.nativeResult(...\(json))")
    }
    func userContentController(_ userContentController: WKUserContentController,didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        let id = body["id"] as? Int ?? 0
        switch action {
        case "loadProgress": reply(id,["value": saved])
        case "saveProgress": saved = body["value"] as! String; reply(id,["ok": true])
        case "appearance":
            let mode = body["mode"] as? String
            NSApplication.shared.appearance = mode == "dark" ? NSAppearance(named:.darkAqua) : mode == "light" ? NSAppearance(named:.aqua) : nil
            reply(id,["ok": true])
        case "chromeState": shell.update(body); reply(id,["ok": true])
        case "shellTestCommand": shell.perform(body["command"] as! String); reply(id,["ok": true])
        case "shellSnapshot":
            let table = shell.sidebar.view.subviews.compactMap { $0 as? NSScrollView }.first!.documentView as! NSTableView
            let item = { (name: String) in self.window.toolbar!.items.first { $0.itemIdentifier.rawValue == name }! }
            reply(id,["title": window.title, "back": item("back").isEnabled, "scan": item("scan").isEnabled, "settings": item("settings").isEnabled, "voice": item("voice").label, "selected": table.selectedRow, "rowHeight": table.delegate!.tableView!(table,heightOfRow: 1), "contentWidth": web.bounds.width])
        case "shellSelect":
            let table = shell.sidebar.view.subviews.compactMap { $0 as? NSScrollView }.first!.documentView as! NSTableView
            table.selectRowIndexes(IndexSet(integer: body["row"] as! Int), byExtendingSelection: false)
            reply(id,["ok": true])
        case "shellCollapse":
            let collapsed = shell.split.splitViewItems[0].isCollapsed
            shell.split.splitViewItems[0].isCollapsed = !collapsed
            window.contentView?.layoutSubtreeIfNeeded()
            check(shell.split.splitViewItems[0].isCollapsed != collapsed,"Sidebar toggles")
            reply(id,["ok": true])
        default: reply(id,["ok": true])
        }
    }
    func webView(_ webView: WKWebView,didFinish navigation: WKNavigation!) {
        guard !started else { return }; started = true
        do {
            let script = try String(contentsOf: root.appendingPathComponent("Tests/native-shell-tests.js"),encoding: .utf8)
            web.callAsyncJavaScript(script,arguments: [:],in: nil,in: .page) { result in
                switch result {
                case .failure(let error): self.fail(error.localizedDescription)
                case .success(let value): print("\(value); \(self.checks) native sidebar collapse checks passed."); exit(0)
                }
            }
        } catch { fail(error.localizedDescription) }
    }
}
