// Collects every line the cube buddy can say -> voice/lines.json ({ key: text }), plus the app's list of
// recorded keys (Sources/CubeClub/Resources/Web/voice-lines.js). Whole messages are recorded in one take
// so the intonation flows; every sentence is recorded on its own too, so lines built from pieces
// (a teaching step's title, move and reason) are still covered.
// Run from the repo root: node voice/lines.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const WEB = 'Sources/CubeClub/Resources/Web';
const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
for (const f of ['vendor/cube.js', 'vendor/solve.js', 'core.js', 'beginner-core.js', 'beginner-lessons.js', 'cube-view.js', 'next-core.js', 'quest-lessons.js', 'roux-lessons.js', 'quest-core.js', 'coach-core.js'])
  vm.runInContext(fs.readFileSync(`${WEB}/${f}`, 'utf8'), ctx, { filename: f });
const { CubeClubCore: C, CubeClubQuest: Q, CubeClubCoach: Coach, CubeClubNext: Next, CubeClubBeginner: B } = ctx;
const src = name => fs.readFileSync(`${WEB}/${name}`, 'utf8');

// Keep these three in step with voice.js in the app.
const plain = t => String(t).replace(/<[^>]+>/g, '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const sentences = t => (plain(t).match(/[^.!?…]+[.!?…]+["']?|[^.!?…]+$/g) || []).map(s => s.trim()).filter(Boolean);
const vkey = s => { s = s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };

const messages = new Set(), pieces = new Set();
const say = (...texts) => texts.forEach(t => t && messages.add(plain(t)));
const piece = (...texts) => texts.forEach(t => t && pieces.add(plain(t)));

// Moves: every face, slice, wide and whole-cube turn, plain, prime and double.
const moves = [];
for (const base of 'URFDLBMESrlufdbxyz') for (const s of ['', "'", '2']) moves.push(base + s);
for (const l of C.LESSONS) for (const m of C.moves(l.algorithm)) if (!moves.includes(m)) moves.push(m);
say(...moves.map(m => C.speakMove(m)));

// Lessons: the goal when a lesson opens, the question, and the lesson-step lines in quest-ui.js.
for (const l of C.LESSONS) say(l.goal, `What did you notice? ${l.quiz}`);
say('Great thinking! Now it’s your turn. Do the same moves on your own.', 'Gold star! You did every move by yourself.',
  'So close! Your lesson still counts. You can try for the gold star again any time.',
  'You did it! The next lesson is open.', 'You did it! You finished every lesson here.', 'You did it!');
for (const s of Q.STAGES) say(`Hooray! You graduated from ${s.title}!`);

// Literal lines: pick([...]) lists and quoted speak/autoSpeak calls anywhere in the app.
for (const file of fs.readdirSync(WEB).filter(f => f.endsWith('.js'))) {
  const code = src(file);
  for (const m of code.matchAll(/pick\(\[([^\]]*)\]\)/g)) for (const q of m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) say(q[1].replace(/\\'/g, "'"));
  for (const m of code.matchAll(/(?:autoSpeak|speak)\('((?:[^'\\]|\\.)*)'\)/g)) say(m[1].replace(/\\'/g, "'"));
}

// First-time tours: the title, then the words.
const tours = vm.runInNewContext('(' + src('onboarding.js').match(/const TOURS = (\{[\s\S]*?\n\});/)[1] + ')');
for (const steps of Object.values(tours)) for (const s of steps) say(`${/[.!?]$/.test(s.title) ? s.title : s.title + '.'} ${s.text}`);

// Case detective and pattern practice: question, read-aloud with choices, feedback and explanations.
const detective = (c, right, wrong) => {
  say(c.question, `${c.question} ${c.choices.join('. ')}`, c.hint, right + ' ' + c.explanation, wrong ? wrong + ' ' + c.hint : null);
};
for (const c of Coach.CHALLENGES) detective(c, 'You found it! That is a useful clue.'), say('You found it! That is a useful clue.', 'Good guess. Look at the outlined stickers and try another idea.');
for (const c of Next.CASES) detective(c, 'You spotted a useful clue!', 'Take another look.');

// Together time.
say('What changed? Tell each other something you noticed.', 'You learned something together. Nice teamwork!', 'You finished your shared pattern!',
  'Almost! Ask your caller to say the move again. Your cube is right where you left it.');
for (const [caller, turner] of [['Young cuber', 'Grown-up'], ['Grown-up', 'Young cuber']]) {
  say(`${caller} calls. ${turner} turns. Reveal the move, then predict together before turning.`, `${caller} calls. ${turner} turns. Tell each other what changed and what stayed the same.`);
  piece(`${caller} calls. ${turner} turns.`);
}

// Solving a real cube with the beginner teaching guide: plans come from the scramble, so collect the
// step titles and reasons from many scrambles and record their sentences.
say('Hold your cube with yellow on top and green facing you. We’ll go one move at a time.', 'Check all six faces of your real cube.');
const titles = new Set(), whys = new Set(), Cube = ctx.Cube;
for (const s of B.STAGES) say(`Pause and check. ${s.goal}`);
for (let i = 0; i < 600; i++) {
  const cube = new Cube();
  cube.move(Array.from({ length: 25 }, () => 'URFDLB'[Math.random() * 6 | 0] + ['', "'", '2'][Math.random() * 3 | 0]).join(' '));
  const result = B.plan(cube.asString());
  for (const c of result.chunks || result.teaching?.chunks || []) { titles.add(c.title); whys.add(c.why); }
}
if (!titles.size) throw Error('The beginner planner returned no teaching steps');
piece(...[...titles].map(t => t + '.'), ...whys);

// The voice preview in Settings.
say('Hi! I’m your cube buddy. R. Push the right side up!');

const out = {};
for (const m of messages) out[vkey(m)] ??= m;
// A bare move name ("R two.") is only ever spoken with its directions, which are recorded whole.
const bareMove = s => /^[A-Za-z]( prime| two)?\.$/.test(s);
for (const t of [...messages, ...pieces]) for (const s of sentences(t)) if (!bareMove(s)) out[vkey(s)] ??= s;
for (const p of pieces) out[vkey(p)] ??= p;
fs.writeFileSync('voice/lines.json', JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync(`${WEB}/voice-lines.js`, `/* Generated by voice/lines.mjs: the key of every recorded line. */\n'use strict';\nconst VOICE_KEYS = new Set(${JSON.stringify(Object.keys(out).sort())});\n`);
console.log(Object.keys(out).length, 'lines:', messages.size, 'messages,', titles.size, 'teaching titles,', whys.size, 'teaching reasons');
