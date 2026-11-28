"""Record every line in voice/lines.json with OpenAI's gpt-4o-mini-tts, one pack per voice:
Sources/CubeClub/Resources/Web/voice/<voice>.mp3 (all clips back to back) + <voice>.json (byte offset and length of each).
Usage: python3 voice/record.py [voice ...]   (default: every voice in VOICES; only new or changed lines are recorded)
Needs an OpenAI API key in .env at the repo root (OPENAI_API_KEY=sk-...) or in the environment, and ffmpeg.
Run from the repo root after node voice/lines.mjs. Never print the key."""
import json, os, re, subprocess, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

MODEL = 'gpt-4o-mini-tts-2025-12-15'
BUDDY = ("You are the cube buddy, a cheerful little puzzle cube who teaches an 8-year-old to solve a Rubik's cube one move at a time. "
         "Speak warmly and naturally, like a favorite teacher sitting next to one child: a smiling voice, patient and encouraging, "
         "with real excitement when something works. Clear pronunciation, relaxed moderate pace, natural pauses. "
         "Single capital letters such as R, U or F are names of cube moves: say them as letters. Friendly, not cartoonish or over the top.")
CARTOON = ("You are the cube buddy, a little puzzle cube who helps kids learn to solve a Rubik's cube. Voice: a bright, young, kid-like cartoon voice, "
           "like a cheerful 8-year-old hero of an animated show. Lighter and higher than a grown-up, bouncy and curious, with a big smile in the voice. "
           "Natural and playful, quick but always clear, never robotic or shouty. Single capital letters such as R, U or F are names of cube moves: say them as letters. "
           "Speech only: say exactly the words given, with no music, sound effects, beats, humming or background sounds.")
# name -> (OpenAI voice, instructions, semitones to raise afterwards). Keep in step with VOICES in Web/voice.js.
VOICES = {'cedar': ('cedar', BUDDY, 0), 'kid': ('coral', CARTOON, 3), 'marin': ('marin', BUDDY, 0)}
PACKS = 'Sources/CubeClub/Resources/Web/voice'

def api_key():
    if os.environ.get('OPENAI_API_KEY'): return os.environ['OPENAI_API_KEY']
    found = re.search(r'(sk-[A-Za-z0-9_\-]+)', open('.env').read()) if os.path.exists('.env') else None
    if not found: sys.exit('No OpenAI API key: put OPENAI_API_KEY=sk-... in .env at the repo root.')
    return found.group(1)

KEY = api_key()
lines = json.load(open('voice/lines.json'))

def record(voice, clips, item):
    key, text = item; mp3 = f'{clips}/{key}.mp3'
    if os.path.exists(mp3): return 'cached'
    oa_voice, instructions, semis = VOICES[voice]
    body = json.dumps({'model': MODEL, 'voice': oa_voice, 'input': text, 'instructions': instructions, 'response_format': 'wav'}).encode()
    for attempt in range(6):
        try:
            req = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body, headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'})
            wav = urllib.request.urlopen(req, timeout=180).read(); break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 5: time.sleep(2 ** attempt); continue
            raise
    tmp = f'{clips}/{key}.wav'; open(tmp, 'wb').write(wav)
    # Raising the pitch with the sample rate also moves the formants up (a smaller, younger voice); atempo keeps the speed.
    r = 2 ** (semis / 12); lift = f'asetrate=24000*{r:.5f},aresample=24000,atempo={1 / r:.5f},' if semis else ''
    trim = lift + 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.1'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', trim, '-ac', '1', '-ar', '24000', '-b:a', '48k',
                    '-write_xing', '0', '-id3v2_version', '0', '-map_metadata', '-1', '-f', 'mp3', mp3], check=True)
    os.remove(tmp); return 'new'

os.makedirs(PACKS, exist_ok=True)
for voice in sys.argv[1:] or VOICES:
    clips = f'voice/clips/{voice}'; os.makedirs(clips, exist_ok=True)
    with ThreadPoolExecutor(4) as ex: results = list(ex.map(lambda item: record(voice, clips, item), lines.items()))
    offsets, blob = {}, bytearray()
    for key in lines:
        b = open(f'{clips}/{key}.mp3', 'rb').read(); offsets[key] = [len(blob), len(b)]; blob += b
    open(f'{PACKS}/{voice}.mp3', 'wb').write(blob)
    json.dump(offsets, open(f'{PACKS}/{voice}.json', 'w'), separators=(',', ':'))
    print(voice, results.count('new'), 'recorded,', len(offsets), 'clips,', len(blob) // 1024, 'KB')
