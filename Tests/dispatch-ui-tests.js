// Every click route in app.js and the per-screen *Click handlers, driven through
// the page's single delegated click listener. Synthetic buttons carry exactly one
// routing key, so each check proves that key reaches the right handler.
let checks = 0;
const assert = (value, message) => {
  checks++;
  if (!value) throw Error(message);
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function settle() {
  await tick();
  while (busy) await tick();
  await tick();
}
async function press(data) {
  const button = document.createElement('button');
  Object.assign(button.dataset, data);
  document.body.append(button);
  button.click();
  await settle();
  button.remove();
}
async function click(selector) {
  const button = document.querySelector(selector);
  assert(button && !button.disabled, 'Available control: ' + selector);
  button.click();
  await settle();
}
const roundOf = () => JSON.stringify(session.round);

// Every stage open, so each activity can start without parent steps.
progress = normalizeProgress({ voice: false, labels: true, quest: { grants: ['speed', 'roux'] } });
applyPreferences(false);
navigate('home');
assert(Quest.canOpen(progress, 'daisy') && Quest.canOpen(progress, Next.CASES[0].lessonID), 'Fixture opens every stage');

// app.js: navigation, learning level, and shared stage controls.
await press({ nav: 'play' });
assert(route === 'play' && session.type === 'play', 'data-nav opens the playground');
await press({ learningLevel: 'beginner' });
assert(route === 'learn' && progress.quest.selected === 'beginner', 'data-learning-level opens the beginner path');
await press({ nav: 'play' });
await press({ action: 'labels' });
assert(progress.labels === false && view.labels === false, 'labels toggles face letters');
await press({ action: 'labels' });
let homed = false;
const realHome = view.home.bind(view);
view.home = () => { homed = true; realHome(); };
await press({ action: 'homeView' });
assert(homed, 'homeView resets the viewing angle');
await press({ action: 'toggleVoice' });
assert(progress.voice === true, 'toggleVoice turns read-aloud on');
await press({ action: 'toggleVoice' });
assert(progress.voice === false, 'toggleVoice turns read-aloud off');

// play-ui.js: turns, undo, scramble, reset.
await press({ turn: 'R' });
assert(session.history.join() === 'R', 'data-turn turns the playground cube');
await press({ action: 'undoPlay' });
assert(session.history.length === 0 && session.cube.isSolved(), 'undoPlay reverses the last turn');
await press({ action: 'scramble' });
assert(session.history.length === 20 && !session.cube.isSolved(), 'scramble makes twenty turns');
await press({ action: 'resetPlay' });
assert(session.history.length === 0 && session.cube.isSolved(), 'resetPlay returns a fresh cube');
assert(['M', "M'", 'M2'].every(m => $(`.turn-grid [data-turn="${m}"]`)), 'the playground offers middle-slice turns');
await press({ turn: 'M' });
assert(session.history.join() === 'M' && !session.cube.isSolved(), 'an M turn moves the playground cube');
await press({ action: 'undoPlay' });
assert(session.cube.isSolved(), 'undo reverses an M turn');

// lesson-ui.js: guided moves, playback, hints, modes, concept answer, next lesson.
await press({ lesson: 'hello' });
assert(route === 'lesson' && session.lesson.id === 'hello' && session.mode === 'guide', 'data-lesson opens the lesson');
await press({ action: 'nextMove' });
assert(session.index === 1, 'nextMove plays one move');
await press({ action: 'backMove' });
assert(session.index === 0, 'backMove steps back');
await press({ action: 'hint' });
assert($('#toast').textContent.startsWith('R:'), 'hint names the next move');
let spoken = '';
const realSpeak = window.speak;
window.speak = text => { spoken = text; };
await press({ action: 'readStep' });
window.speak = realSpeak;
assert(spoken === describeMove('R'), 'readStep reads the next move aloud');
await press({ action: 'autoplay' });
await press({ action: 'pause' });
assert(!playing, 'pause stops autoplay');
await press({ action: 'replay' });
assert(session.index === 0 && session.cube.isSolved(), 'replay restarts the lesson');
for (let i = 0; i < 4; i++) await press({ action: 'nextMove' });
assert(Quest.state(progress, 'hello').learned, 'Finishing the guided pattern records it as learned');
if ($('#overlay').hidden) await press({ mode: 'recall' });
else {
  await press({ action: 'closeModal' });
  await press({ mode: 'recall' });
}
assert(session.mode === 'recall', 'data-mode starts memory practice');
const lesson = LESSONS.find(l => l.id === 'hello');
questCompletion(lesson);
await click(`[data-answer="${lesson.correct}"]`);
assert(Quest.state(progress, 'hello').understood, 'data-answer records the concept answer');
await press({ action: 'nextLesson' });
assert(route === 'lesson' && session.lesson.id === 'daisy' && $('#overlay').hidden, 'nextLesson opens the following lesson');
await press({ action: 'learnAfterSolve' });
assert(route === 'learn', 'learnAfterSolve returns to the learning path');

// Roux lessons: no cross wording, and the turn pad offers the wide turn they use.
await press({ lesson: 'roux-right-block' });
assert(route === 'lesson' && session.lesson.id === 'roux-right-block', 'a Roux lesson opens');
const rouxPanel = $('#lesson-pieces').textContent;
assert(!/cross/i.test(rouxPanel) && rouxPanel.includes('Shared colors line up'), 'the Roux piece panel talks about the pair, not a cross');
for (let i = 0; i < 3; i++) await press({ action: 'nextMove' });
if (!$('#overlay').hidden) await press({ action: 'closeModal' });
await press({ mode: 'recall' });
assert(['r', "r'", 'r2'].every(m => $(`#recall-pad [data-turn="${m}"]`)) && !$('#recall-pad [data-turn="M"]'), 'the turn pad adds only the slice turns this lesson uses');

// next-ui.js patternClick: pattern practice.
const patternCase = Next.CASES[0];
await press({ pattern: patternCase.id });
assert(route === 'patterns' && session.type === 'pattern' && session.challenge.id === patternCase.id, 'data-pattern opens a case');
await press({ action: 'patternHint' });
assert(session.feedback === patternCase.hint, 'patternHint shows the hint');
await press({ action: 'readPattern' });
await press({ patternAnswer: String(patternCase.answer) });
assert(session.solved && progress.patternPractice[patternCase.id], 'data-pattern-answer records a correct answer');
await press({ action: 'nextPattern' });
assert(session?.challenge?.id !== patternCase.id || route !== 'patterns' || !session.solved, 'nextPattern moves on');
await press({ nav: 'patterns' });
await press({ action: 'reviewPatterns' });
assert(session.type === 'pattern' && session.review?.ids.length > 0, 'reviewPatterns starts a review');

// coach-ui.js coachClick: case detective.
const [firstClue, secondClue] = Coach.CHALLENGES;
await press({ challenge: firstClue.id });
assert(route === 'detective' && session.challenge.id === firstClue.id, 'data-challenge opens a clue');
await press({ action: 'clueHint' });
assert(session.feedback === firstClue.hint, 'clueHint shows the hint');
await press({ action: 'readClue' });
await press({ clueAnswer: String(firstClue.answer) });
assert(session.solved && progress.detective.includes(firstClue.id), 'data-clue-answer records the discovery');
await press({ action: 'nextChallenge' });
assert(session.challenge.id === secondClue.id, 'nextChallenge opens the next clue');

// coach-ui.js coachClick: together time.
await press({ teamLesson: 'hello' });
assert(route === 'team' && session.round.phase === 'predict', 'data-team-lesson starts a shared round');
await press({ action: 'revealTeamMove' });
assert(session.round.phase === 'turn', 'revealTeamMove reveals the move');
await press({ teamTurn: session.round.algorithm[0] });
assert(session.round.phase === 'notice', 'data-team-turn makes the expected turn');
await press({ action: 'teamDiscussed' });
assert(session.round.index === 1 && session.round.phase === 'predict', 'teamDiscussed moves to the next move');
const beforeSwap = session.round.childFirst;
await press({ action: 'swapTeamRoles' });
assert(session.round.childFirst === !beforeSwap, 'swapTeamRoles swaps caller and turner');
const roundBeforeRead = roundOf();
await press({ action: 'readTeam' });
assert(roundOf() === roundBeforeRead, 'readTeam leaves the round unchanged');

// scan-ui.js scanClick: manual review editing (no camera hardware).
await press({ action: 'scan' });
assert(scan && !$('#overlay').hidden, 'scan opens the scanner');
await press({ scanFace: '2' });
assert(scan.index === 2, 'data-scan-face selects a face');
const face = scanOrder[2];
await press({ color: 'U' });
assert(scan.color === 'U', 'data-color picks a paint color');
await press({ sticker: '0' });
assert(scan.faces[face][0] === 'U', 'data-sticker paints a sticker');
await press({ action: 'rotateScan' });
assert(scan.faces[face][2] === 'U' && scan.faces[face][0] !== 'U', 'rotateScan turns the face a quarter');
await press({ action: 'clearScanFace' });
assert(scan.faces[face].every((c, i) => c === (i === 4 ? face : '?')), 'clearScanFace keeps only the center');
await press({ action: 'demoScan' });
assert(scan.confirmed.size === 6 && scan.faces[face].every(c => c !== '?'), 'demoScan loads a sample cube');
const current = scanOrder[scan.index];
scan.confirmed.delete(current);
await press({ action: 'confirmFace' });
assert(scan.confirmed.has(current), 'confirmFace confirms the current face');
await press({ action: 'stopCamera' });
assert(scan, 'stopCamera keeps the review open');
await press({ action: 'closeModal' });
assert(!scan && $('#overlay').hidden, 'closeModal closes the scanner');

return checks + ' WebKit dispatch checks passed: navigation, playground, lessons, patterns, detective, together time and scan review.';
