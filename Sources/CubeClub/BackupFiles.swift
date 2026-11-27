import Foundation

// Backup files are bounded JSON with no camera images. Shared by the Mac and iPad apps; each
// presents its own file picker (BackupPanels.swift on the Mac, the iPad's Files picker).
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
}
