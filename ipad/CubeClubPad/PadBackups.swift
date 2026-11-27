import UIKit
import UniformTypeIdentifiers

/// Backups on iPad go through the Files picker: export a JSON copy, or open one to review before
/// restoring. Validation is shared with the Mac app (BackupFiles.swift).
final class PadBackups: NSObject, UIDocumentPickerDelegate {
    private var completion: (([String: Any]) -> Void)?
    private var exporting = false

    func export(_ value: String, from presenter: UIViewController, completion: @escaping ([String: Any]) -> Void) {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Cube-Club-Backup-\(formatter.string(from: Date())).json")
        do { try BackupFiles.write(value, to: url) }
        catch { completion(["error": "The backup could not be saved. \(error.localizedDescription)"]); return }
        present(UIDocumentPickerViewController(forExporting: [url], asCopy: true), exporting: true, from: presenter, completion: completion)
    }

    func open(from presenter: UIViewController, completion: @escaping ([String: Any]) -> Void) {
        present(UIDocumentPickerViewController(forOpeningContentTypes: [.json], asCopy: true), exporting: false, from: presenter, completion: completion)
    }

    private func present(_ picker: UIDocumentPickerViewController, exporting: Bool, from presenter: UIViewController, completion: @escaping ([String: Any]) -> Void) {
        guard self.completion == nil else { completion(["error": "A file picker is already open."]); return }
        self.completion = completion
        self.exporting = exporting
        picker.delegate = self
        picker.allowsMultipleSelection = false
        presenter.present(picker, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return finish(["cancelled": true]) }
        if exporting { return finish(["ok": true]) }
        do { finish(["value": try BackupFiles.read(url)]) }
        catch { finish(["error": "The backup could not be opened. \(error.localizedDescription)"]) }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { finish(["cancelled": true]) }

    private func finish(_ result: [String: Any]) {
        let done = completion
        completion = nil
        done?(result)
    }
}
