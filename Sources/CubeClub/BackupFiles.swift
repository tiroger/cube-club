import AppKit
import UniformTypeIdentifiers

// Native file pickers keep file access deliberate. No camera images are included.
enum BackupFiles {
    static let limit = 262144
    enum Failure: LocalizedError {
        case invalid, tooLarge
        var errorDescription: String? {
            switch self {
            case .invalid: return "Choose a readable Cube Club JSON backup."
            case .tooLarge: return "Choose a Cube Club backup smaller than 256 KB."
            }
        }
    }
    static func data(_ value: String) throws -> Data {
        let data = Data(value.utf8)
        guard data.count <= limit else { throw Failure.tooLarge }
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              object["format"] as? String == "club.cube.backup" else { throw Failure.invalid }
        return data
    }
    static func read(_ url: URL) throws -> String {
        guard try url.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile == true else { throw Failure.invalid }
        let file = try FileHandle(forReadingFrom: url)
        defer { try? file.close() }
        let data = try file.read(upToCount: limit + 1) ?? Data()
        guard data.count <= limit else { throw Failure.tooLarge }
        guard let value = String(data: data, encoding: .utf8) else { throw Failure.invalid }
        return value
    }
    static func write(_ value: String, to url: URL) throws {
        try data(value).write(to: url, options: .atomic)
    }
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
