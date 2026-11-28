import AVFoundation

/// The cube buddy's voice, shared by the Mac and iPad apps. Every line is recorded ahead of time with a
/// natural voice (voice/record.py) and bundled; nothing falls back to the device's robotic speech voices.
/// Each voice is one pack: its clips back to back in Web/voice/<name>.mp3, and where each clip starts and
/// how long it is in Web/voice/<name>.json. The page works out which clips a message needs.
final class ClubVoice: NSObject, AVAudioPlayerDelegate {
    private let folder: URL
    private var packs: [String: (audio: Data, clips: [String: [Int]])] = [:]
    private var queue: [Data] = []
    private var player: AVAudioPlayer?
    private var token = 0

    init(folder: URL) {
        self.folder = folder
        super.init()
        #if os(iOS)
        // Spoken audio that plays even with the side switch on silent, and lowers other audio while it talks.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        #endif
    }

    /// Plays the named clips one after another, replacing whatever was playing.
    func speak(voice: String, clips: [String]) {
        stop()
        guard let pack = pack(voice) else { return }
        queue = clips.prefix(40).compactMap { key in
            guard let range = pack.clips[key], range.count == 2, range[0] >= 0, range[1] > 0, range[0] + range[1] <= pack.audio.count else { return nil }
            return pack.audio.subdata(in: range[0]..<range[0] + range[1])
        }
        playNext(token)
    }

    func stop() {
        token += 1
        queue = []
        player?.stop()
        player = nil
    }

    private func playNext(_ turn: Int) {
        guard turn == token, !queue.isEmpty else { return }
        let clip = queue.removeFirst()
        guard let next = try? AVAudioPlayer(data: clip, fileTypeHint: AVFileType.mp3.rawValue) else { return playNext(turn) }
        next.delegate = self
        player = next
        if !next.play() { playNext(turn) }
    }

    func audioPlayerDidFinishPlaying(_ finished: AVAudioPlayer, successfully flag: Bool) {
        guard finished === player else { return }
        // A short breath between the pieces of a longer message.
        let turn = token
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { [weak self] in self?.playNext(turn) }
    }

    /// Loads a pack once. Names are plain lowercase words, so a page can't reach other files.
    private func pack(_ name: String) -> (audio: Data, clips: [String: [Int]])? {
        if let pack = packs[name] { return pack }
        guard name.range(of: "^[a-z]{1,20}$", options: .regularExpression) != nil,
              let audio = try? Data(contentsOf: folder.appendingPathComponent("\(name).mp3"), options: .mappedIfSafe),
              let map = try? Data(contentsOf: folder.appendingPathComponent("\(name).json")),
              let clips = try? JSONSerialization.jsonObject(with: map) as? [String: [Int]] else { return nil }
        packs[name] = (audio, clips)
        return packs[name]
    }
}
