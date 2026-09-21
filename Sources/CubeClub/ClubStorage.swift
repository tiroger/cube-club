import Foundation

struct ClubStorage {
    let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    var progress: String { defaults.string(forKey: "progress.v1") ?? "{}" }
    var recovery: String? { defaults.string(forKey: "progress.restoreRecovery.v1") }
    func save(_ value: String, restoring: Bool = false) -> Bool {
        guard value.utf8.count <= 262144,
              let data = value.data(using: .utf8),
              (try? JSONSerialization.jsonObject(with: data)) is [String: Any] else { return false }
        if restoring { defaults.set(progress, forKey: "progress.restoreRecovery.v1") }
        defaults.set(value, forKey: "progress.v1")
        return true
    }
}
