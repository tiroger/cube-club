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

/// AppKit owns the window chrome and navigation; WebKit owns the teaching canvas.
final class ClubShell: NSObject, NSToolbarDelegate, NSMenuItemValidation {
    let split = NSSplitViewController()
    let sidebar = ClubSidebar()
    private weak var window: NSWindow?
    private var command: (String) -> Void
    private var ready = false
    private var modal = false
    private var parent = ""
    private var voice = false
    private var items: [String: NSToolbarItem] = [:]

    init(window: NSWindow, webView: WKWebView, savesWindowLayout: Bool = true, command: @escaping (String) -> Void) {
        self.window = window
        self.command = command
        super.init()
        split.splitView.isVertical = true
        split.splitView.dividerStyle = .thin
        if savesWindowLayout { split.splitView.autosaveName = "ClubSidebar" }
        let sidebarItem = NSSplitViewItem(sidebarWithViewController: sidebar)
        sidebarItem.minimumThickness = 205
        sidebarItem.maximumThickness = 270
        sidebarItem.canCollapse = true
        sidebarItem.canCollapseFromWindowResize = false
        sidebarItem.holdingPriority = .defaultHigh
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
        let contentItem = NSSplitViewItem(viewController: content)
        contentItem.minimumThickness = 740
        split.addSplitViewItem(sidebarItem)
        split.addSplitViewItem(contentItem)
        window.contentViewController = split
        window.setContentSize(NSSize(width: 1320, height: 860))
        split.splitView.setPosition(224, ofDividerAt: 0)
        sidebar.onSelect = { [weak self] id in self?.perform(id) }
        sidebar.onSettings = { [weak self] in self?.perform("settings") }
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
        sidebar.select(state["destination"] as? String ?? "home")
        let largeText = state["largeText"] as? Bool ?? false
        split.splitViewItems[0].minimumThickness = largeText ? 235 : 205
        sidebar.setLargeText(largeText)
        updateControls()
    }

    func perform(_ action: String) {
        guard ready, !modal else { return }
        command(action)
    }

    private func updateControls() {
        sidebar.navigationEnabled = ready && !modal
        for item in items.values { item.isEnabled = ready && !modal }
        items["back"]?.isEnabled = ready && !modal && !parent.isEmpty
        let parentName = ClubDestination.all.first { $0.id == parent }?.title ?? "My clubhouse"
        items["back"]?.label = "Back to \(parentName)"
        items["back"]?.toolTip = "Back to \(parentName) (⌘[)"
        items["voice"]?.image = NSImage(systemSymbolName: voice ? "speaker.wave.2.fill" : "speaker.slash", accessibilityDescription: nil)
        items["voice"]?.label = "Turn read-aloud \(voice ? "off" : "on")"
        items["voice"]?.toolTip = items["voice"]?.label
    }

    func toolbarDefaultItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] {
        [.toggleSidebar, .sidebarTrackingSeparator, .init("back"), .flexibleSpace, .init("scan"), .init("voice"), .init("settings")]
    }
    func toolbarAllowedItemIdentifiers(_ toolbar: NSToolbar) -> [NSToolbarItem.Identifier] { toolbarDefaultItemIdentifiers(toolbar) }
    func toolbar(_ toolbar: NSToolbar, itemForItemIdentifier id: NSToolbarItem.Identifier, willBeInsertedIntoToolbar flag: Bool) -> NSToolbarItem? {
        if id == .toggleSidebar {
            let item = NSToolbarItem(itemIdentifier: id)
            item.label = "Show or hide sidebar"
            item.toolTip = "Show or hide sidebar (⌃⌘S)"
            item.image = NSImage(systemSymbolName: "sidebar.left", accessibilityDescription: nil)
            item.target = self
            item.action = #selector(toggleSidebar)
            return item
        }
        let definitions = ["back": ("Back", "chevron.left"), "scan": ("Solve my cube", "camera"), "voice": ("Turn read-aloud on", "speaker.slash"), "settings": ("Settings", "gearshape")]
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
    @objc func toggleSidebar() { split.toggleSidebar(nil) }

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
        if item.action == #selector(toggleSidebar) { return true }
        if item.action == #selector(openSettings) { return ready && !modal }
        guard let action = item.representedObject as? String else { return true }
        if action == "voice" { item.state = voice ? .on : .off }
        return ready && !modal && (action != "back" || !parent.isEmpty)
    }
}

final class ClubSidebar: NSViewController, NSTableViewDataSource, NSTableViewDelegate {
    var onSelect: ((String) -> Void)?
    var onSettings: (() -> Void)?
    var navigationEnabled = false { didSet { settingsButton.isEnabled = navigationEnabled } }
    private let table = NSTableView()
    private let settingsButton = NSButton(title: "Settings…", target: nil, action: nil)
    private var updatingSelection = false
    private var largeText = false
    // Group rows use AppKit's source-list metrics and accessibility semantics.
    private let rows: [ClubDestination?] = [nil] + Array(ClubDestination.all.prefix(5)).map(Optional.some) + [nil] + Array(ClubDestination.all.suffix(3)).map(Optional.some)

    override func loadView() {
        let background = NSVisualEffectView()
        background.material = .sidebar
        background.blendingMode = .behindWindow
        background.state = .followsWindowActiveState
        view = background
        let scroll = NSScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.drawsBackground = false
        scroll.hasVerticalScroller = true
        scroll.autohidesScrollers = true
        table.addTableColumn(NSTableColumn(identifier: .init("destination")))
        table.headerView = nil
        table.style = .sourceList
        table.rowSizeStyle = .custom
        table.backgroundColor = .clear
        table.allowsEmptySelection = false
        table.columnAutoresizingStyle = .uniformColumnAutoresizingStyle
        table.dataSource = self
        table.delegate = self
        table.setAccessibilityLabel("Cube Club sidebar")
        scroll.documentView = table
        settingsButton.image = NSImage(systemSymbolName: "gearshape", accessibilityDescription: nil)
        settingsButton.imagePosition = .imageLeading
        settingsButton.bezelStyle = .inline
        settingsButton.alignment = .left
        settingsButton.target = self
        settingsButton.action = #selector(settingsClicked)
        settingsButton.translatesAutoresizingMaskIntoConstraints = false
        settingsButton.setAccessibilityLabel("Settings and grown-up corner")
        background.addSubview(scroll)
        background.addSubview(settingsButton)
        NSLayoutConstraint.activate([
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            scroll.bottomAnchor.constraint(equalTo: settingsButton.topAnchor, constant: -12),
            settingsButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 18),
            settingsButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
            settingsButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -18),
            settingsButton.heightAnchor.constraint(equalToConstant: 30)
        ])
    }
    @objc private func settingsClicked() { onSettings?() }
    func numberOfRows(in tableView: NSTableView) -> Int { rows.count }
    func tableView(_ tableView: NSTableView, isGroupRow row: Int) -> Bool { rows[row] == nil }
    func tableView(_ tableView: NSTableView, heightOfRow row: Int) -> CGFloat { rows[row] == nil ? 29 : largeText ? 40 : 34 }
    func tableView(_ tableView: NSTableView, shouldSelectRow row: Int) -> Bool { navigationEnabled && rows[row] != nil }
    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard let destination = rows[row] else {
            let label = NSTextField(labelWithString: row == 0 ? "Learn & explore" : "Your cube")
            label.font = .systemFont(ofSize: largeText ? 13 : 11, weight: .semibold)
            label.textColor = .secondaryLabelColor
            return label
        }
        let cell = NSTableCellView()
        let label = NSTextField(labelWithString: destination.title)
        label.font = .systemFont(ofSize: largeText ? 15 : 13)
        label.lineBreakMode = .byTruncatingTail
        let symbol = NSImageView(image: NSImage(systemSymbolName: destination.symbol, accessibilityDescription: nil)!)
        symbol.contentTintColor = .controlAccentColor
        label.translatesAutoresizingMaskIntoConstraints = false
        symbol.translatesAutoresizingMaskIntoConstraints = false
        cell.addSubview(symbol); cell.addSubview(label)
        cell.textField = label; cell.imageView = symbol
        NSLayoutConstraint.activate([
            symbol.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 2),
            symbol.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            symbol.widthAnchor.constraint(equalToConstant: 19),
            symbol.heightAnchor.constraint(equalToConstant: 19),
            label.leadingAnchor.constraint(equalTo: symbol.trailingAnchor, constant: 9),
            label.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
            label.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -3)
        ])
        return cell
    }
    func tableViewSelectionDidChange(_ notification: Notification) {
        guard !updatingSelection, navigationEnabled, table.selectedRow >= 0, let destination = rows[table.selectedRow] else { return }
        onSelect?(destination.id)
    }
    func select(_ destination: String) {
        guard let index = rows.firstIndex(where: { $0?.id == destination }) else { return }
        updatingSelection = true
        table.selectRowIndexes(IndexSet(integer: index), byExtendingSelection: false)
        updatingSelection = false
    }
    func setLargeText(_ enabled: Bool) {
        guard largeText != enabled else { return }
        largeText = enabled
        updatingSelection = true
        table.reloadData()
        table.noteHeightOfRows(withIndexesChanged: IndexSet(integersIn: 0..<rows.count))
        updatingSelection = false
        settingsButton.font = .systemFont(ofSize: enabled ? 15 : 13)
    }
}
