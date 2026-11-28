/* The cube buddy's voice: natural recordings made ahead of time (voice/record.py) and bundled with the app.
   A message is matched to recordings sentence by sentence, taking the longest recorded run each time so
   whole messages keep their natural flow. Nothing falls back to the device's robotic speech voices. */
'use strict';
const VOICES = [
  { id: 'cedar', name: 'Cedar', note: 'Calm and natural' },
  { id: 'kid', name: 'Kid buddy', note: 'Young and cheerful' },
  { id: 'marin', name: 'Marin', note: 'Warm and friendly' },
];
const VOICE_SAMPLE = 'Hi! I’m your cube buddy. R. Push the right side up!';
// Keep these three in step with voice/lines.mjs, which records the lines.
const voicePlain = t => String(t).replace(/<[^>]+>/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const voiceSentences = t => (voicePlain(t).match(/[^.!?…]+[.!?…]+["']?|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean);
const vkey = s => { s = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
// Sentences that were spoken with no recording. They stay silent; the tests check none turn up.
const voiceMissing = new Set();

function voicePieces(text) {
  const s = voiceSentences(text), out = [];
  for (let i = 0; i < s.length;) {
    let j = s.length - 1, key = null;
    for (; j >= i; j--) { const k = vkey(s.slice(i, j + 1).join(' ')); if (VOICE_KEYS.has(k)) { key = k; break; } }
    if (!key) j = i;
    out.push({ key, text: s.slice(i, j + 1).join(' ') });
    i = j + 1;
  }
  return out;
}
function currentVoice() {
  return VOICES.some(v => v.id === progress.preferences.voice) ? progress.preferences.voice : VOICES[0].id;
}
// The recordings a message needs; any sentence without one is noted (and stays silent).
function voiceAudit(text) {
  const pieces = voicePieces(text);
  for (const p of pieces.filter(p => !p.key)) { voiceMissing.add(p.text); console.warn('No recording for:', p.text); }
  return pieces;
}
function speak(text) {
  const pieces = voiceAudit(text);
  const clips = pieces.filter(p => p.key).map(p => p.key);
  if (native)
    bridge('speak', { voice: currentVoice(), clips });
  else
    browserVoice.play(currentVoice(), clips);
}
function stopSpeech() {
  if (native)
    bridge('stopSpeech');
  else
    browserVoice.stop();
}
// In a plain browser (for development), the page plays the pack itself.
const browserVoice = {
  packs: {}, audio: null, token: 0,
  async pack(name) {
    return this.packs[name] ??= Promise.all([fetch(`voice/${name}.json`).then(r => r.json()), fetch(`voice/${name}.mp3`).then(r => r.arrayBuffer())]).catch(() => null);
  },
  stop() { this.token++; this.audio?.pause(); this.audio = null; },
  async play(name, clips) {
    this.stop();
    const my = this.token, pack = await this.pack(name);
    if (!pack)
      return;
    const [map, data] = pack;
    for (const key of clips) {
      if (my !== this.token || !map[key])
        return;
      const [start, length] = map[key], url = URL.createObjectURL(new Blob([data.slice(start, start + length)], { type: 'audio/mpeg' }));
      this.audio = new Audio(url);
      await new Promise(done => { this.audio.onended = this.audio.onerror = done; this.audio.play().catch(done); });
      URL.revokeObjectURL(url);
      await new Promise(r => setTimeout(r, 120));
    }
  },
};
