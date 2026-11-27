import AVFoundation

/// The read-aloud voice, shared by the Mac and iPad apps. Apple's Premium and Enhanced voices sound far
/// more natural than the compact default, but each device downloads them separately (Accessibility
/// settings), so the best installed voice is used unless a grown-up picks another one.
final class ClubVoice {
    private let synthesizer = AVSpeechSynthesizer()
    private let defaults: UserDefaults
    private static let key = "voice.identifier"
    static let sample = "Hi! I’m your cube buddy. R. Push the right side up!"

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    /// English voices worth offering, best first: Premium, then Enhanced, then standard; US English
    /// first within each. Novelty voices (Bubbles, Whisper…) and the robotic Eloquence voices are left out.
    static func choices() -> [AVSpeechSynthesisVoice] {
        AVSpeechSynthesisVoice.speechVoices()
            .filter { voice in
                guard voice.language.hasPrefix("en"),
                      !voice.identifier.contains(".eloquence."),
                      !voice.identifier.contains(".speech.synthesis.voice.") else { return false }
                if #available(macOS 14, iOS 17, *) {
                    return !voice.voiceTraits.contains(.isNoveltyVoice) && !voice.voiceTraits.contains(.isPersonalVoice)
                }
                return true
            }
            .sorted { a, b in
                if a.quality != b.quality { return a.quality.rawValue > b.quality.rawValue }
                if (a.language == "en-US") != (b.language == "en-US") { return a.language == "en-US" }
                return a.name < b.name
            }
    }

    var current: AVSpeechSynthesisVoice? {
        if let id = defaults.string(forKey: Self.key), let chosen = AVSpeechSynthesisVoice(identifier: id) { return chosen }
        return Self.choices().first ?? AVSpeechSynthesisVoice(language: "en-US")
    }

    /// Saves a grown-up's choice; an empty or unknown identifier goes back to the automatic best voice.
    func choose(_ identifier: String) {
        if Self.choices().contains(where: { $0.identifier == identifier }) { defaults.set(identifier, forKey: Self.key) }
        else { defaults.removeObject(forKey: Self.key) }
    }

    func speak(_ text: String) {
        synthesizer.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: String(text.prefix(2000)))
        utterance.voice = current
        // A touch slower than normal speech for young listeners; much slower sounds robotic.
        utterance.rate = 0.47
        utterance.preUtteranceDelay = 0.05
        synthesizer.speak(utterance)
    }

    func stop() { synthesizer.stopSpeaking(at: .immediate) }

    /// For the settings picker: every choice, which one is in use, and whether a natural voice is installed.
    var state: [String: Any] {
        let choices = Self.choices()
        func quality(_ voice: AVSpeechSynthesisVoice) -> String {
            switch voice.quality { case .premium: return "Premium"; case .enhanced: return "Enhanced"; default: return "Standard" }
        }
        return [
            "current": current?.identifier ?? "",
            "chosen": defaults.string(forKey: Self.key) ?? "",
            "natural": choices.contains { $0.quality != .default },
            "voices": choices.map { ["id": $0.identifier, "name": $0.name, "quality": quality($0), "language": $0.language] },
        ]
    }
}
