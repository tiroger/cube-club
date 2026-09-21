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

/// The branded Mac toolbar and clubhouse sidebar share one continuous color treatment.
final class ClubShell: NSObject, NSToolbarDelegate, NSMenuItemValidation {
    private weak var window: NSWindow?
    private var command: (String) -> Void
    private var ready = false
    private var modal = false
    private var parent = ""
    private var voice = false
    private var sidebarHidden = false
    private let brandButton = ClubBrandButton(frame: .zero)
    private var items: [String: NSToolbarItem] = [:]

    init(window: NSWindow, webView: WKWebView, savesWindowLayout: Bool = true, command: @escaping (String) -> Void) {
        self.window = window
        self.command = command
        super.init()
        let content = NSViewController()
        content.view = ClubChromeView()
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
        window.toolbarStyle = .unified
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.backgroundColor = ClubPalette.chrome
        window.toolbar = toolbar
        window.titlebarSeparatorStyle = .none
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
        brandButton.sectionTitle = title
        sidebarHidden = state["sidebarHidden"] as? Bool ?? false
        updateControls()
    }

    func perform(_ action: String) {
        guard ready, !modal else { return }
        command(action)
    }

    private func updateControls() {
        for item in items.values { item.isEnabled = ready && !modal }
        brandButton.isEnabled = ready && !modal
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
        [.init("brand"), .init("back"), .flexibleSpace, .init("sidebar"), .init("scan"), .init("voice"), .init("settings")]
    }
    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] { toolbarDefaultItemIdentifiers(toolbar) }
    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier id: NSToolbarItem.Identifier, willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        if id.rawValue == "brand" {
            let item = NSToolbarItem(itemIdentifier: id)
            brandButton.target = self
            brandButton.action = #selector(goHome)
            brandButton.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                brandButton.widthAnchor.constraint(equalToConstant: 238),
                brandButton.heightAnchor.constraint(equalToConstant: 42)
            ])
            item.view = brandButton
            item.label = "Cube Club home"
            item.toolTip = "Go to my clubhouse (⌘1)"
            item.isNavigational = true
            item.visibilityPriority = .high
            item.autovalidates = false
            items["brand"] = item
            return item
        }
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
    @objc private func goHome() { perform("home") }
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

private enum ClubPalette {
    static func color(_ red: Int, _ green: Int, _ blue: Int) -> NSColor {
        NSColor(srgbRed: CGFloat(red) / 255, green: CGFloat(green) / 255, blue: CGFloat(blue) / 255, alpha: 1)
    }
    static let chrome = NSColor(name: "ClubChrome") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? color(28, 45, 35) : color(241, 243, 235)
    }
    static let ink = NSColor(name: "ClubInk") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? color(237, 244, 237) : color(35, 63, 55)
    }
    static let muted = NSColor(name: "ClubMuted") { appearance in
        appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? color(185, 201, 190) : color(123, 135, 125)
    }
}

/// Paint behind the transparent title bar using the sidebar’s light/dark palette.
private final class ClubChromeView: NSView {
    override func draw(_ dirtyRect: NSRect) { ClubPalette.chrome.setFill(); dirtyRect.fill() }
    override func viewDidChangeEffectiveAppearance() { super.viewDidChangeEffectiveAppearance(); needsDisplay = true }
}

final class ClubBrandButton: NSButton {
    var sectionTitle = "My clubhouse" {
        didSet { needsDisplay = true; setAccessibilityHelp("\(sectionTitle). Go to my clubhouse.") }
    }
    override var isFlipped: Bool { true }
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        title = "Cube Club home"
        isBordered = false
        setButtonType(.momentaryPushIn)
        setAccessibilityLabel("Cube Club home")
        focusRingType = .exterior
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override func viewDidChangeEffectiveAppearance() { super.viewDidChangeEffectiveAppearance(); needsDisplay = true }
    override func draw(_ dirtyRect: NSRect) {
        let opacity: CGFloat = isEnabled ? (isHighlighted ? 0.75 : 1) : 0.65
        NSGraphicsContext.saveGraphicsState()
        let tilt = AffineTransform(translationByX: 17, byY: 21)
        var transform = tilt
        transform.rotate(byDegrees: -9)
        (transform as NSAffineTransform).concat()
        let colors = [ClubPalette.color(57,131,101), ClubPalette.color(229,185,81), ClubPalette.color(238,151,115), ClubPalette.color(140,171,148)]
        for index in 0..<4 {
            colors[index].withAlphaComponent(opacity).setFill()
            NSBezierPath(roundedRect: NSRect(x: (index % 2) * 15 - 14, y: (index / 2) * 15 - 14, width: 12, height: 12), xRadius: 3, yRadius: 3).fill()
        }
        NSGraphicsContext.restoreGraphicsState()
        let base = NSFont.systemFont(ofSize: 22, weight: .heavy)
        let font = NSFont(descriptor: base.fontDescriptor.withDesign(.rounded) ?? base.fontDescriptor, size: 22) ?? base
        let name = NSMutableAttributedString(string: "cube club", attributes: [.font: font, .foregroundColor: ClubPalette.ink.withAlphaComponent(opacity), .kern: -0.7])
        name.append(NSAttributedString(string: ".", attributes: [.font: font, .foregroundColor: ClubPalette.color(214,153,80).withAlphaComponent(opacity)]))
        name.draw(at: NSPoint(x: 40, y: 0))
        let paragraph = NSMutableParagraphStyle()
        paragraph.lineBreakMode = .byTruncatingTail
        NSAttributedString(string: sectionTitle, attributes: [.font: NSFont.systemFont(ofSize: 11, weight: .medium), .foregroundColor: ClubPalette.muted.withAlphaComponent(opacity), .paragraphStyle: paragraph]).draw(in: NSRect(x: 41, y: 27, width: 193, height: 15))
    }
    override func drawFocusRingMask() { NSBezierPath(roundedRect: bounds, xRadius: 6, yRadius: 6).fill() }
    override var focusRingMaskBounds: NSRect { bounds }
}
