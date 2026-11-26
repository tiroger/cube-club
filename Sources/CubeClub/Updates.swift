import AppKit
import Sparkle

/// Sparkle reads the release feed named in Info.plist (SUFeedURL) and installs only
/// updates signed with the release workflow's EdDSA key (SUPublicEDKey).
/// Automatic mode checks once a day, downloads quietly and installs when the app quits.
final class ClubUpdates {
    private let controller: SPUStandardUpdaterController?

    init(bundle: Bundle = .main) {
        // Builds without a feed or key (swift run, test harnesses) never go online.
        if bundle.object(forInfoDictionaryKey: "SUFeedURL") != nil, bundle.object(forInfoDictionaryKey: "SUPublicEDKey") != nil {
            controller = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil)
        } else {
            controller = nil
        }
    }

    var state: [String: Any] {
        guard let updater = controller?.updater else { return ["available": false] }
        var state: [String: Any] = [
            "available": true,
            "automatic": updater.automaticallyChecksForUpdates,
            "canCheck": updater.canCheckForUpdates,
            "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
        ]
        if let date = updater.lastUpdateCheckDate { state["lastChecked"] = date.timeIntervalSince1970 * 1000 }
        return state
    }

    /// One parent switch controls both checking and quiet installation.
    func setAutomatic(_ enabled: Bool) {
        guard let updater = controller?.updater else { return }
        updater.automaticallyChecksForUpdates = enabled
        updater.automaticallyDownloadsUpdates = enabled
    }

    func checkNow() { controller?.checkForUpdates(nil) }

    /// "Check for Updates…" for the app menu, or nil when updates are unavailable.
    func menuItem() -> NSMenuItem? {
        guard let controller else { return nil }
        let item = NSMenuItem(title: "Check for Updates…", action: #selector(SPUStandardUpdaterController.checkForUpdates(_:)), keyEquivalent: "")
        item.target = controller
        return item
    }
}
