import AppKit
import WebKit

struct ClubDestination {
    let id: String
    let title: String
    let symbol: String
    static let all: [ClubDestination] = [
        .init(id: "home", title: "My clubhouse", symbol: "house"),
        .init(id: "learn", title: "Cube Quest", symbol: "book.closed"),
        .init(id: "play", title: "Practice playground", symbol: "cube"),
        .init(id: "detective", title: "Case detective", symbol: "magnifyingglass"),
        .init(id: "team", title: "Together time", symbol: "person.2"),
        .init(id: "scan", title: "Solve my cube", symbol: "camera"),
        .init(id: "timer", title: "My solve timer", symbol: "stopwatch"),
        .init(id: "badges", title: "My discoveries", symbol: "star")
    ]
}

/// AppKit supplies the compact title bar; the sidebar shares the teaching canvas’s design.
final class ClubShell: NSObject, NSToolbarDelegate, NSMenuItemValidation {
    private weak var window: NSWindow?
    private var command: (String) -> Void
    private var ready = false
    private var modal = false
    private var parent = ""
    private var voice = false
    private var sidebarHidden = false
    private var items: [String: NSToolbarItem] = [:]

    init(window: NSWindow, webView: WKWebView, savesWindowLayout: Bool = true, command: @escaping (String) -> Void) {
        self.window = window
        self.command = command
        super.init()
        let content = NSViewController()
        content.view = NSView()
        webView.translatesAutoresizingMaskIntoConstraints = false
        content.view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: content.view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: content.view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: content.view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: content.view.bottomAnchor)
        ])
        window.contentViewController = content
        window.setContentSize(NSSize(width: 1320, height: 860))
        let toolbar = NSToolbar(identifier: "CubeClubToolbar")
        toolbar.delegate = self
        toolbar.displayMode = .iconOnly
        toolbar.allowsUserCustomization = false
        window.toolbarStyle = .unifiedCompact
        window.toolbar = toolbar
        window.titlebarSeparatorStyle = .automatic
        if savesWindowLayout {
            window.setFrameAutosaveName("CubeClubWindow")
            if !window.setFrameUsingName("CubeClubWindow") { window.center() }
        }
        window.collectionBehavior.insert(.fullScreenPrimary)
        updateControls()
    }

    func update(_ state: [String: Any]) {
        ready = true
        modal = state["modal"] as? Bool ?? false
        parent = state["parent"] as? String ?? ""
        voice = state["voice"] as? Bool ?? false
        let title = String((state["title"] as? String ?? "Cube Club").prefix(100))
        window?.title = title
        sidebarHidden = state["sidebarHidden"] as? Bool ?? false
        updateControls()
    }

    func perform(_ action: String) {
        guard ready, !modal else { return }
        command(action)
    }

    private func updateControls() {
        for item in items.values { item.isEnabled = ready && !modal }
        items["back"]?.isEnabled = ready && !modal && !parent.isEmpty
        items["sidebar"]?.label = sidebarHidden ? "Show sidebar" : "Hide sidebar"
        items["sidebar"]?.toolTip = "\(sidebarHidden ? "Show" : "Hide") sidebar (⌃⌘S)"
        let parentName = ClubDestination.all.first { $0.id == parent }?.title ?? "My clubhouse"
        items["back"]?.label = "Back to \(parentName)"
        items["back"]?.toolTip = "Back to \(parentName) (⌘[)"
        items["voice"]?.image = NSImage(systemSymbolName: voice ? "speaker.wave.2.fill" : "speaker.slash", accessibilityDescription: nil)
        items["voice"]?.label = "Turn read-aloud \(voice ? "off" : "on")"
        items["voice"]?.toolTip = items["voice"]?.label
    }

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.init("sidebar"), .init("back"), .flexibleSpace, .init("scan"), .init("voice"), .init("settings")]
    }
    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] { toolbarDefaultItemIdentifiers(toolbar) }
    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier id: NSToolbarItem.Identifier, willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        let definitions = ["sidebar": ("Hide sidebar", "sidebar.left"), "back": ("Back", "chevron.left"), "scan": ("Solve my cube", "camera"), "voice": ("Turn read-aloud on", "speaker.slash"), "settings": ("Settings", "gearshape")]
        guard let definition = definitions[id.rawValue] else { return nil }
        let item = NSToolbarItem(itemIdentifier: id)
        item.label = definition.0
        item.toolTip = id.rawValue == "settings" ? "Settings (⌘,)" : definition.0
        item.image = NSImage(systemSymbolName: definition.1, accessibilityDescription: nil)
        item.target = self
        item.action = #selector(toolbarCommand(_:))
        item.autovalidates = false
        item.isNavigational = id.rawValue == "back"
        items[id.rawValue] = item
        return item
    }
    @objc private func toolbarCommand(_ sender: NSToolbarItem) { perform(sender.itemIdentifier.rawValue) }
    @objc private func menuCommand(_ sender: NSMenuItem) { if let action = sender.representedObject as? String { perform(action) } }
    @objc func openSettings() { perform("settings") }
    @objc func toggleSidebar() { perform("sidebar") }

    func addMenus(to menu: NSMenu) {
        let go = NSMenu(title: "Go")
        func add(_ title: String, _ action: String, _ key: String) {
            let item = NSMenuItem(title: title, action: #selector(menuCommand(_:)), keyEquivalent: key)
            item.target = self
            item.representedObject = action
            go.addItem(item)
        }
        add("Back", "back", "[")
        go.addItem(.separator())
        for (index, destination) in ClubDestination.all.enumerated() { add(destination.title, destination.id, String(index + 1)) }
        let goItem = NSMenuItem(); goItem.submenu = go; menu.addItem(goItem)
        let view = NSMenu(title: "View")
        let sidebarItem = NSMenuItem(title: "Show or Hide Sidebar", action: #selector(toggleSidebar), keyEquivalent: "s")
        sidebarItem.keyEquivalentModifierMask = [.command, .control]
        sidebarItem.target = self
        view.addItem(sidebarItem)
        let voiceItem = NSMenuItem(title: "Read Moves Aloud", action: #selector(menuCommand(_:)), keyEquivalent: "")
        voiceItem.target = self; voiceItem.representedObject = "voice"; view.addItem(voiceItem)
        let viewItem = NSMenuItem(); viewItem.submenu = view; menu.addItem(viewItem)
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        let fullScreen = NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]
        windowMenu.addItem(fullScreen)
        let windowItem = NSMenuItem(); windowItem.submenu = windowMenu; menu.addItem(windowItem)
        NSApplication.shared.windowsMenu = windowMenu
    }
    func validateMenuItem(_ item: NSMenuItem) -> Bool {
        if item.action == #selector(toggleSidebar) { return ready && !modal }
        if item.action == #selector(openSettings) { return ready && !modal }
        guard let action = item.representedObject as? String else { return true }
        if action == "voice" { item.state = voice ? .on : .off }
        return ready && !modal && (action != "back" || !parent.isEmpty)
    }
}
