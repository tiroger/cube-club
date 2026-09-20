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
        DispatchQueue.main.asyncAfter(deadline: .now()+55) { self.fail("WebKit quest test timed out") }
    }
    func fail(_ message: String) { fputs("Quest UI failure: \(message)\n",stderr); exit(1) }
    func webView(_ webView: WKWebView,didFinish navigation: WKNavigation!) {
        do {
            let script = try String(contentsOf: root.appendingPathComponent("Tests/quest-ui-tests.js"),encoding: .utf8)
            web.callAsyncJavaScript(script,arguments: [:],in: nil,in: .page) { result in
                switch result {
                case .failure(let error): self.fail(error.localizedDescription)
                case .success(let value): print(value); exit(0)
                }
            }
        } catch { fail(error.localizedDescription) }
    }
}
