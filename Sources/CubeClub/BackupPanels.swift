import AppKit
import UniformTypeIdentifiers

// The Mac's Save and Open panels keep file access deliberate.
extension BackupFiles {
    static func export(_ value: String, window: NSWindow, completion: @escaping ([String: Any]) -> Void) {
        do { _ = try data(value) } catch { completion(["error": error.localizedDescription]); return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        panel.canCreateDirectories = true
        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
        panel.nameFieldStringValue = "Cube-Club-Backup-\(formatter.string(from: Date())).json"
        panel.title = "Save your Cube Club backup"
        panel.message = "Includes progress, settings, saved sessions, and learned colors. No camera pictures."
        panel.beginSheetModal(for: window) { response in
            guard response == .OK, let url = panel.url else { completion(["cancelled": true]); return }
            do { try write(value, to: url); completion(["ok": true]) }
            catch { completion(["error": "The backup could not be saved. \(error.localizedDescription)"]) }
        }
    }
    static func open(window: NSWindow, completion: @escaping ([String: Any]) -> Void) {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.title = "Choose a Cube Club backup"
        panel.message = "You’ll review the backup before anything is replaced."
        panel.beginSheetModal(for: window) { response in
            guard response == .OK, let url = panel.url else { completion(["cancelled": true]); return }
            do { completion(["value": try read(url)]) }
            catch { completion(["error": "The backup could not be opened. \(error.localizedDescription)"]) }
        }
    }
}
