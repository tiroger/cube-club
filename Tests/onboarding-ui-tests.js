window.cubeClubVoiceAudit = true;
// First-time tours, driven through the real screens. The harness turns tours off for every
// other suite; this one turns them back on.
let checks = 0;
const assert = (value, message) => { checks++; if (!value) throw Error(message); };
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
const waitFor = async (test, ms = 3000) => { const start = Date.now(); while (!test()) { if (Date.now() - start > ms) return false; await tick(); } return true; };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const rect = el => el.getBoundingClientRect();
const inside = (outer, inner) => outer.left <= inner.left && outer.top <= inner.top && outer.right >= inner.right && outer.bottom >= inner.bottom;
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const onScreen = r => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
const next = async () => { $('[data-tour="next"]').click(); await pause(320); };

window.cubeClubNoTours = false;
progress = normalizeProgress({});
applyPreferences(false);
navigate('home');

// The welcome tour: a centered greeting, then one highlighted control per step.
maybeTour('home');
assert(await waitFor(() => $('#tour')), 'The welcome tour appears on a first visit');
assert($('#tour-title').textContent.includes('cube buddy') && $('.tour-spot').hidden, 'It starts with a centered welcome');
assert(document.activeElement === $('.tour-bubble'), 'The tour bubble takes focus');
for (let step = 1; step < TOURS.home.length; step++) {
  await next();
  const target = [...document.querySelectorAll(TOURS.home[step].target)].find(visibleTarget);
  assert(target, `Step ${step + 1} has its control on screen`);
  const spot = rect($('.tour-spot')), bubble = rect($('.tour-bubble')), t = rect(target);
  assert(!$('.tour-spot').hidden && inside(spot, t), `Step ${step + 1} spotlights its control`);
  assert(onScreen(bubble) && !overlaps(bubble, t), `Step ${step + 1} keeps its bubble on screen and off the control`);
  const x = t.left + t.width / 2, y = t.top + t.height / 2;
  assert($('#tour').contains(document.elementFromPoint(x, y)), `Step ${step + 1} blocks taps on the page underneath`);
}
assert($('[data-tour="next"]').textContent === 'Let’s go!' && $('[data-tour="skip"]').hidden, 'The last step says Let’s go!');
await next();
assert(!$('#tour') && progress.tours.includes('home'), 'Finishing the tour remembers it');
maybeTour('home');
await pause(700);
assert(!$('#tour'), 'A seen tour does not come back');

// The lesson tour, closed with Escape, which must not reach the lesson underneath.
startLesson('hello');
assert(await waitFor(() => $('#tour')), 'The lesson tour appears in the first lesson');
assert($('#tour-title').textContent === 'Your practice cube' && inside(rect($('.tour-spot')), rect($('#cube-canvas'))), 'It starts at the practice cube');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
await tick();
assert(!$('#tour') && progress.tours.includes('lesson') && route === 'lesson' && $('#overlay').hidden, 'Escape closes the tour and nothing else');

// The turn tour on the first "Your turn", stepped through with the keyboard.
for (let i = 0; i < session.algorithm.length; i++) await nextMove();
await click_('[data-answer="' + session.lesson.correct + '"]');
await click_('[data-quest-mode="recall"]');
assert(await waitFor(() => $('#tour')), 'The turn tour appears on the first turn');
assert(inside(rect($('.tour-spot')), rect($('#recall-pad'))), 'It points at the move buttons under the cube');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await pause(320);
assert($('#tour-title').textContent === 'Need help?' && inside(rect($('.tour-spot')), rect($('#stage-actions [data-action="hint"]'))), 'Enter moves on to the Hint button');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await tick();
assert(!$('#tour') && progress.tours.includes('turn') && session.mode === 'recall' && session.index === 0, 'Finishing the turn tour leaves the turn untouched');

// Tours never interrupt a dialog.
progress.tours = [];
settings('learning');
maybeTour('home');
await pause(700);
assert(!$('#tour'), 'A tour waits while a dialog is open');

// Settings can show the tours again; Skip marks a tour as seen.
progress.tours = ['home', 'lesson', 'turn'];
settings('learning');
await click_('[data-action="replayTours"]');
assert(await waitFor(() => $('#tour')) && route === 'home' && $('#overlay').hidden, 'Show me around brings the welcome tour back');
assert(progress.tours.length === 0, 'Showing the tours again forgets which were seen');
$('[data-tour="skip"]').click();
await tick();
assert(!$('#tour') && progress.tours.join() === 'home', 'Skip closes the tour and marks it seen');

async function click_(selector) {
  const button = $(selector);
  assert(button && !button.disabled, 'Available control: ' + selector);
  button.click();
  await pause(60);
}
if (voiceMissing.size) throw Error('Spoken with no recording: ' + [...voiceMissing].join(' | '));
return checks + ' onboarding checks passed: welcome, lesson and turn tours, spotlight placement, blocked taps, keyboard, dialogs, replay and skip.';
