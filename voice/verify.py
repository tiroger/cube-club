"""Checks the recordings match the script: the app's key list (Web/voice-lines.js) is voice/lines.json, and every
voice in Web/voice.js has a pack with every line, each clip inside its file. Run from the repo root (scripts/test.sh does)."""
import json, os, re, sys
WEB = 'Sources/CubeClub/Resources/Web'
lines = json.load(open('voice/lines.json'))
keys = set(json.loads(re.search(r'new Set\((\[.*?\])\)', open(f'{WEB}/voice-lines.js').read()).group(1)))
problems = [] if keys == set(lines) else ['Web/voice-lines.js is out of date: run node voice/lines.mjs']
voices = re.findall(r"\{ id: '([a-z]+)'", open(f'{WEB}/voice.js').read())
for v in voices:
    mp3, man = f'{WEB}/voice/{v}.mp3', f'{WEB}/voice/{v}.json'
    if not (os.path.exists(mp3) and os.path.exists(man)): problems.append(f'{v}: no pack; run python3 voice/record.py'); continue
    size, offsets = os.path.getsize(mp3), json.load(open(man))
    missing = set(lines) - set(offsets)
    if missing: problems.append(f'{v}: {len(missing)} lines not recorded; run python3 voice/record.py {v}')
    if any(o < 0 or n <= 0 or o + n > size for o, n in offsets.values()): problems.append(f'{v}: a clip lies outside its pack')
if problems: sys.exit('Voice check failed:\n  ' + '\n  '.join(problems))
print(f'{len(lines)} recorded lines checked in {len(voices)} voices: every line in every pack.')
