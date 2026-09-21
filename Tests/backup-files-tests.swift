import Foundation

@main struct BackupFileTests {
    static func main() throws {
        var checks = 0
        func check(_ value: Bool, _ name: String) { checks += 1; if !value { fatalError(name) } }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("cube-club-backup-tests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let file = directory.appendingPathComponent("backup.json")
        let value = "{\"format\":\"club.cube.backup\",\"version\":1,\"progress\":{\"note\":\"A cuber’s journey ✦\"}}"
        try BackupFiles.write(value, to: file)
        check(try BackupFiles.read(file) == value, "Exact UTF-8 file round trip")
        let replacement = value.replacingOccurrences(of: "journey", with: "discovery")
        try BackupFiles.write(replacement, to: file)
        check(try BackupFiles.read(file) == replacement, "Atomic replacement")
        do { try BackupFiles.write("{}", to: file); fatalError("Invalid export accepted") } catch { checks += 1 }
        check(try BackupFiles.read(file) == replacement, "Invalid export leaves old file intact")
        try Data(repeating: 65, count: BackupFiles.limit+1).write(to: file)
        do { _ = try BackupFiles.read(file); fatalError("Oversized import accepted") } catch { checks += 1 }
        try Data([0xff,0xfe]).write(to: file)
        do { _ = try BackupFiles.read(file); fatalError("Invalid UTF8 accepted") } catch { checks += 1 }
        do { _ = try BackupFiles.read(directory); fatalError("Directory import accepted") } catch { checks += 1 }
        do { _ = try BackupFiles.read(directory.appendingPathComponent("missing.json")); fatalError("Missing import accepted") } catch { checks += 1 }
        let name = "club.cube.backup-tests.\(UUID().uuidString)", defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let storage = ClubStorage(defaults: defaults)
        check(storage.progress == "{}" && storage.recovery == nil, "Clean isolated storage")
        let old = "{\"moves\":25}", next = "{\"moves\":30}"
        check(storage.save(old), "Progress saved")
        check(!storage.save("[1,2]", restoring: true), "Invalid restore rejected")
        check(storage.progress == old && storage.recovery == nil, "Failed restore changes neither saved copy")
        check(storage.save(next, restoring: true), "Restore saved")
        check(storage.progress == next && storage.recovery == old, "Previous journey retained for recovery")
        let relaunched = ClubStorage(defaults: UserDefaults(suiteName: name)!)
        check(relaunched.progress == next && relaunched.recovery == old, "Fresh storage instance reads journey and recovery")
        check(storage.save(old, restoring: true) && storage.recovery == next, "Recovery itself is reversible")
        check(!storage.save(String(repeating: "x", count: 262145)), "Progress size bounded")
        check(storage.save("{\"data\":\""+String(repeating:"a", count: 33000)+"\"}"), "Larger journey fits new limit")
        print("\(checks) native backup and storage checks passed: atomic files, bounds, invalid input, recovery, and fresh-instance persistence.")
    }
}
