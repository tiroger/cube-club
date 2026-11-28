import AVFoundation

// Every clip in every bundled voice pack decodes as audio the way ClubVoice slices it, and none is silent-short.
let folder = URL(fileURLWithPath: "Sources/CubeClub/Resources/Web/voice")
let packs = try FileManager.default.contentsOfDirectory(atPath: folder.path).filter { $0.hasSuffix(".json") }.sorted()
var clips = 0, seconds = 0.0
for name in packs {
    let audio = try Data(contentsOf: folder.appendingPathComponent(name.replacingOccurrences(of: ".json", with: ".mp3")))
    let map = try JSONSerialization.jsonObject(with: Data(contentsOf: folder.appendingPathComponent(name))) as! [String: [Int]]
    for (key, range) in map {
        let player = try AVAudioPlayer(data: audio.subdata(in: range[0]..<range[0] + range[1]), fileTypeHint: AVFileType.mp3.rawValue)
        guard player.duration > 0.25 else { fputs("\(name) \(key): only \(player.duration) s\n", stderr); exit(1) }
        clips += 1; seconds += player.duration
    }
}
guard packs.count == 3 else { fputs("Expected 3 voice packs, found \(packs.count)\n", stderr); exit(1) }
print("\(clips) voice clips in \(packs.count) packs decode with AVAudioPlayer: \(Int(seconds / 60)) minutes of audio.")
