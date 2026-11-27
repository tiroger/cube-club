// Runs inside the iPad app on a simulator (scripts/test-ipad.sh passes it with --debug-script).
// Reports one line through the native bridge: "PASS n iPad checks" or "FAIL …".
const failures = [];
let checks = 0;
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const fits = () => document.documentElement.scrollWidth <= innerWidth;
const report = text => window.webkit.messageHandlers.native.postMessage({ action: 'debugLog', text });

try {
  check(location.href.startsWith('cubeclub://app/'), 'The interface is served from cubeclub://app');
  check(DEVICE === 'iPad' && window.cubeClubSolverInPage === true, 'The iPad shell sets its flags');
  check(native, 'The native bridge is present');
  check(fits(), `The clubhouse fits without sideways scrolling (${document.documentElement.scrollWidth} > ${innerWidth})`);

  settings('progress');
  await pause(400);
  check($('.settings-footer')?.textContent.includes('this iPad'), 'Settings say progress is saved on this iPad');
  check(!$('#update-settings') || $('#update-settings').hidden, 'Settings show no Mac update section');
  check(!document.body.textContent.includes('this Mac'), 'No "this Mac" wording on the iPad');
  closeModal();

  startLesson('hello');
  await pause(400);
  check(route === 'lesson' && fits(), 'A lesson opens and fits');
  navigate('home');

  // The solver runs in the page's Web Worker: iPadOS gives in-app JavaScriptCore no JIT.
  const facelets = new Cube().move("R U F2 L' D B R2 U' F D2").asString();
  const general = await solveFacelets(facelets, 'general');
  check(!general.error && Cube.fromString(facelets).move(general.algorithm).isSolved(), `The general solve is verified (${general.error || 'ok'})`);
  const beginner = await solveFacelets(facelets, 'beginner');
  check(!beginner.error, `The beginner solve answers (${beginner.error || 'ok'})`);

  // Progress goes through native storage and comes back unchanged; the original is restored after.
  const original = (await bridge('loadProgress')).value;
  const marker = JSON.stringify({ ipadCheck: Date.now() });
  check((await bridge('saveProgress', { value: marker })).ok, 'Progress saves');
  check((await bridge('loadProgress')).value === marker, 'Saved progress loads back');
  check((await bridge('saveProgress', { value: original || '{}' })).ok, 'The original progress is restored');

  // The simulator has no camera: starting it must answer, not hang or crash.
  const camera = await bridge('cameraStart', { token: 'ipad-check' });
  check(camera.ok || /camera/i.test(camera.error || ''), `Starting the camera answers (${JSON.stringify(camera)})`);
  await bridge('cameraStop');
} catch (error) {
  failures.push(`Exception: ${error.message}`);
}

report(failures.length ? `FAIL ${failures.join(' | ')}` : `PASS ${checks} iPad checks`);
