'use strict';
// Screens live in home-, lesson-, play- and scan-ui.js (plus the other *-ui.js
// files); each handles its own buttons through a *Click function called below.
// Build markup that includes anything not bundled with the app using html`...`.
const { FACES, COLORS, COLOR_NAMES, FACE_NAMES, LESSONS, moves, describeMove, validate, sampleColor, normalizeProgress, escapeHTML, html, raw } = CubeClubCore;
const $ = s => document.querySelector(s), icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const native = !!window.webkit?.messageHandlers?.native;
let progress = normalizeProgress({}), route = 'home', view = null, session = null, playing = false, busy = false, generation = 0, requestID = 0, worker = null, workerTimer = null, scan = null, lastFrame = null, lastFrameTime = 0, modalFocus = null;
const pending = new Map();
function bridge(action, data = {}) {
  if (!native)
    return Promise.resolve({ error: 'This feature is available in the Mac app.' });
  return new Promise(resolve => {
    const id = ++requestID;
    const timeout = setTimeout(() => {
      pending.delete(id);
      resolve({ error: 'This is taking a little longer. Please try again.' });
    }, ['exportBackup', 'importBackup'].includes(action) ? 3600000 : 90000);
    pending.set(id, { resolve, timeout });
    window.webkit.messageHandlers.native.postMessage({ action, id, ...data });
  });
}
window.nativeResult = (id, result) => {
  const p = pending.get(id);
  if (p) {
    clearTimeout(p.timeout);
    pending.delete(id);
    p.resolve(result);
  }
};
async function save() {
  if (native) {
    const result = await bridge('saveProgress', { value: JSON.stringify(progress) });
    if (result.error) {
      toast('Could not save on this Mac. Please try again.');
      return false;
    }
    return result.ok === true;
  }
  try {
    localStorage.setItem('cubeclub.progress.v1', JSON.stringify(progress));
    return true;
  }
  catch (_) {
    toast('Could not save in this browser. Please try again.');
    return false;
  }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 3500);
}
function speak(text) {
  if (native)
    bridge('speak', { text });
  else if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}
function stopSpeech() {
  if (native)
    bridge('stopSpeech');
  else
    window.speechSynthesis?.cancel();
}
function autoSpeak(text) {
  if (progress.voice)
    speak(text);
}
function updateVoice() {
  const b = $('#voice-toggle');
  b.classList.toggle('on', progress.voice);
  b.setAttribute('aria-label', `Turn read-aloud ${progress.voice ? 'off' : 'on'}`);
  b.setAttribute('aria-pressed', String(progress.voice));
  syncNativeChrome();
}
function nextLesson() {
  return Quest.nextLesson(progress);
}
function stage() {
  return `<div><div class="cube-stage"><div class="stage-top"><span>YOUR PRACTICE CUBE</span><button class="icon-button" data-action="homeView" aria-label="Reset cube viewing angle" title="Reset viewing angle">${icon('cube')}</button></div><canvas id="cube-canvas" tabindex="0" role="img" aria-label="Interactive 3D cube. Drag or use arrow keys to look around. Home resets the view."></canvas><div class="stage-bottom"><span>↔ Drag to look around</span><button data-action="labels">${icon('layers')}Face letters</button></div></div><div class="face-legend">${['U', 'F', 'R'].map(f => `<span><i style="background:${COLORS[f]}"></i>${f} = ${FACE_NAMES[f]}</span>`).join('')}<span>Keep your grip the same during moves</span></div><div id="stage-actions"></div></div>`;
}
// Face turns, plus a row for each slice or two-layer turn (such as M or r) in extra.
function turnPad(recall = false, extra = []) {
  const button = move => `<button data-turn="${move}" aria-label="${describeMove(move)}" ${busy ? 'disabled' : ''}>${move}</button>`;
  const faces = ['', '\'', '2'].map(s => FACES.map(f => button(f + s)).join('')).join('');
  const slices = extra.map(base => ['', '\'', '2'].map(s => button(base + s)).join('')).join('');
  return `<div class="turn-pad"><h3>${recall ? 'Your turn! Pick the next move.' : 'Try a turn. What changes?'}</h3><div class="turn-grid">${faces}${slices}</div></div>`;
}
// The non-face turns an algorithm uses, in first-use order: "M' U M r" → ['M', 'r'].
function extraTurns(algorithm) {
  return [...new Set(algorithm.map(move => move[0]).filter(base => !FACES.includes(base)))];
}
function cancelPlayback() {
  playing = false;
  generation++;
  stopSpeech();
}
function navigate(next) {
  if (busy || continuityWorking) {
    toast('Let this little step finish first.');
    return;
  }
  rememberSession();
  if (route === 'timer')
    timerLeaving();
  if (next === 'patterns' && !Quest.unlocked(progress, 'intermediate')) {
    progress.quest.selected = 'intermediate';
    save();
    next = 'learn';
    toast('Cross and pair practice opens in Piece Partners.');
  }
  cancelPlayback();
  busy = false;
  if (view)
    view.destroy();
  view = null;
  session = null;
  route = next;
  render();
}
function render() {
  document.querySelectorAll('[data-nav]').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === route || ((route === 'lesson' || route === 'patterns') && b.dataset.nav === 'learn'));
    if (b.closest('nav'))
      b.setAttribute('aria-current', b.classList.contains('active') ? 'page' : 'false');
  });
  $('#breadcrumb').textContent = { home: 'MY CLUBHOUSE', learn: 'LEARNING PATH', play: 'PRACTICE PLAYGROUND', badges: 'MY DISCOVERIES', lesson: 'LEARNING PATH / LET’S PRACTICE', solve: 'SOLVE MY CUBE', detective: 'CASE DETECTIVE', team: 'TOGETHER TIME', patterns: 'PIECE PARTNERS / PATTERN PRACTICE', timer: 'MY SOLVE TIMER' }[route];
  $('#content').innerHTML = route === 'home' ? home() : route === 'learn' ? learn() : route === 'timer' ? timerPage() : route === 'badges' ? badgePage() : route === 'play' ? playPage() : route === 'detective' ? detectivePage() : route === 'team' ? teamPage() : route === 'patterns' ? patternPage() : sequencePage();
  if (route === 'play') {
    session = { type: 'play', cube: new Cube(), history: [] };
    mountCube();
    $('#stage-actions').innerHTML = `<div class="stage-controls"><button class="button secondary" data-action="undoPlay">${icon('undo')}Undo a turn</button></div>`;
    updatePlay();
  }
  else if (route === 'lesson' || route === 'solve') {
    mountCube();
    updateSequence();
  }
  else if (route === 'patterns' && session?.type === 'pattern') {
    mountCube();
    view.highlightPieces = session.challenge.focusPieces || Next.LESSONS.find(l => l.id === session.challenge.lessonID).focusPieces;
    view.draw();
    updatePattern();
  }
  else if (route === 'detective' && session?.type === 'detective') {
    mountCube();
    view.highlightIndices = session.challenge.kind === 'yellow' ? [1, 3, 4, 5, 7] : session.challenge.kind === 'edge' ? [7, 19] : [8, 9, 20];
    view.draw();
    $('.stage-top span').textContent = 'TURN THE CUBE. FOLLOW THE CLUES.';
    updateDetective();
  }
  else if (route === 'team' && session?.type === 'team') {
    mountCube();
    $('.stage-top span').textContent = 'OUR SHARED PRACTICE CUBE';
    updateTeam();
  }
  $('.nav-count').textContent = LESSONS.length;
  updateVoice();
  window.scrollTo(0, 0);
}
function mountCube() {
  view = new CubeView($('#cube-canvas'), session.cube);
  view.labels = progress.labels;
  if (session.lesson?.focusPieces)
    view.highlightPieces = session.lesson.focusPieces;
  view.draw();
}
function showModal(html, cls = '', label = '') {
  const open = !$('#overlay').hidden, active = document.activeElement;
  const scrollPosition = $('#overlay .modal')?.scrollTop || 0;
  const key = open && $('#overlay').contains(active) ? ['action', 'color', 'sticker', 'scanFace'].find(k => active.dataset?.[k] !== undefined) : null;
  const value = key ? active.dataset[key] : null;
  if (!open)
    modalFocus = active;
  $('#overlay').innerHTML = `<section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label || (cls === 'small-modal' ? 'Cube Club discovery' : 'Scan your cube')}">${html}</section>`;
  $('#overlay').hidden = false;
  $('.app-shell').inert = true;
  const controls = [...$('#overlay').querySelectorAll('button:not(:disabled),input')];
  (controls.find(el => key && el.dataset[key] === value) || (value === 'teachCenter' ? $('#color-teaching summary') : null) || controls[0])?.focus({ preventScroll: true });
  if (open)
    $('#overlay .modal').scrollTop = scrollPosition;
  syncNativeChrome();
}
function closeModal() {
  if (continuityWorking)
    return;
  resumePending = null;
  restorePending = null;
  resetIntent = null;
  parentIntent = null;
  questChallenge = null;
  if (scan) {
    if (native)
      bridge('cameraStop');
    scan = null;
    lastFrame = null;
    lastFrameTime = 0;
  }
  $('.app-shell').inert = false;
  $('#overlay').hidden = true;
  $('#overlay').innerHTML = '';
  modalFocus?.focus();
  syncNativeChrome();
}
document.addEventListener('click', async (e) => {
  const button = e.target.closest('button,a');
  if (!button || button.disabled)
    return;
  if (button.matches('a.brand')) {
    e.preventDefault();
    navigate('home');
    return;
  }
  const d = button.dataset;
  if (continuityWorking)
    return;
  if (await continuityClick(d))
    return;
  if (await teachingClick(d))
    return;
  if (await settingsClick(d))
    return;
  if (await questClick(d))
    return;
  if (d.learningLevel) {
    progress.learningLevel = d.learningLevel === 'next' ? 'next' : 'beginner';
    progress.quest.selected = d.learningLevel === 'next' ? 'intermediate' : 'beginner';
    save();
    navigate('learn');
    return;
  }
  if (d.nav) {
    navigate(d.nav);
    return;
  }
  if (await patternClick(d))
    return;
  if (await coachClick(d))
    return;
  if (await lessonClick(d, button))
    return;
  if (await playClick(d))
    return;
  if (await scanClick(d, button))
    return;
  switch (d.action) {
    case 'closeModal':
      closeModal();
      break;
    case 'settings':
      settings();
      break;
    case 'toggleVoice':
      progress.voice = !progress.voice;
      save();
      updateVoice();
      if (progress.voice)
        speak('Hi, curious cuber. Let’s learn one move at a time.');
      else
        stopSpeech();
      break;
    case 'homeView':
      view?.home();
      break;
    case 'labels':
      progress.labels = !progress.labels;
      if (view) {
        view.labels = progress.labels;
        view.draw();
      }
      save();
      break;
  }
});
document.addEventListener('change', e => {
  if (continuityWorking)
    return;
  if (e.target.id === 'restore-acknowledged') {
    const button = $('[data-action="confirmRestore"]');
    if (button)
      button.disabled = !e.target.checked;
    return;
  }
  if (settingsChange(e.target))
    return;
  if (e.target.id === 'quest-parent' || e.target.id === 'quest-observed') {
    const b = $('[data-action="confirmParent"]');
    if (b)
      b.disabled = !$('#quest-parent')?.checked || !$('#quest-observed')?.checked;
    return;
  }
  const key = e.target.dataset.setting;
  if (key && ['voice', 'slow', 'labels'].includes(key)) {
    progress[key] = e.target.checked;
    save();
    updateVoice();
    if (key === 'labels' && view) {
      view.labels = progress.labels;
      view.draw();
    }
    if (key === 'voice' && !progress.voice)
      stopSpeech();
  }
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === ',') {
    e.preventDefault();
    window.openSettings();
    return;
  }
  if (!$('#overlay').hidden) {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = [...$('#overlay').querySelectorAll('button:not(:disabled),input,select,summary,[tabindex="0"]')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    return;
  }
  if (route === 'timer' && e.code === 'Space' && !e.repeat && !e.target.closest('button,input,select,textarea,a')) {
    e.preventDefault();
    if (solveTimer.phase === 'running')
      stopSolveTimer();
    else if (solveTimer.phase === 'ready')
      startSolveTimer();
    return;
  }
  if (e.code === 'Space' && e.target === document.body && (route === 'lesson' || route === 'solve')) {
    e.preventDefault();
    if (playing) {
      playing = false;
      updateSequence();
    }
    else
      nextMove();
  }
});
(async () => {
  try {
    const raw = native ? (await bridge('loadProgress')).value : localStorage.getItem('cubeclub.progress.v1');
    progress = normalizeProgress(JSON.parse(raw || '{}'));
  }
  catch (_) {
    progress = normalizeProgress({});
  }
  cameraPalette = JSON.parse(JSON.stringify(progress.calibration?.colors || {}));
  applyPreferences();
  render();
})();
