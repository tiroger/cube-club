import AppKit
import WebKit

// Uses an ephemeral WebKit profile and deterministic reduced-motion rendering.
// This never reads or writes the learner's UserDefaults or camera.
@main
struct QuestUITests {
    static func main() {
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        let runner = QuestUIRunner()
        app.delegate = runner
        app.run()
        withExtendedLifetime(runner) {}
    }
}
final class QuestUIRunner: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        // First-time tours would cover the screens these tests drive; Tests/onboarding-ui-tests.js turns them back on.
        config.userContentController.addUserScript(WKUserScript(source: "window.cubeClubNoTours=true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.websiteDataStore = .nonPersistent()
        config.userContentController.addUserScript(WKUserScript(source: "const realMedia=window.matchMedia.bind(window); window.matchMedia=q=>q.includes('prefers-reduced-motion')?{matches:true}:realMedia(q);", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: NSRect(x: 0,y: 0,width: 1024,height: 720),configuration: config)
        web.navigationDelegate = self
        window = NSWindow(contentRect: web.frame,styleMask: [.titled],backing: .buffered,defer: false)
        window.title = "Cube Club Quest Check — isolated test progress"
        window.contentView = web
        window.orderFront(nil)
        let directory = root.appendingPathComponent("Sources/CubeClub/Resources/Web")
        web.loadFileURL(directory.appendingPathComponent("index.html"),allowingReadAccessTo: directory)
        // A hang guard, not a speed check: the walkthrough plays every lesson in all three modes.
        DispatchQueue.main.asyncAfter(deadline: .now()+300) { self.fail("WebKit quest test timed out") }
    }
    func fail(_ message: String) { fputs("Quest UI failure: \(message)\n",stderr); exit(1) }
    func webView(_ webView: WKWebView,didFinish navigation: WKNavigation!) {
        do {
            let script = try String(contentsOf: root.appendingPathComponent(CommandLine.arguments.dropFirst().first ?? "Tests/quest-ui-tests.js"),encoding: .utf8)
            web.callAsyncJavaScript(script,arguments: [:],in: nil,in: .page) { result in
                switch result {
                case .failure(let error): self.fail("\(error.localizedDescription) \((error as NSError).userInfo)")
                case .success(let value): print(value); exit(0)
                }
            }
        } catch { fail(error.localizedDescription) }
    }
}
