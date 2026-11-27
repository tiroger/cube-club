/* First-time tours: one highlighted thing at a time, explained by the cube buddy. */
'use strict';
// Each step points at one control (or nothing, for a centered message). A tour is shown once per
// learner; progress.tours remembers which ones were seen, and Settings can show them again.
const TOURS = {
  home: [
    { title: 'Hi, I’m your cube buddy!', text: 'Welcome to Cube Club. Let me show you around. It only takes a moment.' },
    { target: 'nav [data-nav="learn"]', title: 'Your Cube Quest', text: 'Lessons go in order. Finish one, and the next one opens.' },
    { target: '.hero-actions [data-nav="learn"]', title: 'Start here', text: 'Tap this to begin your very first lesson.' },
    { target: 'nav [data-nav="play"]', title: 'Practice playground', text: 'Want to just play? Turn the cube any way you like.' },
    { target: 'nav [data-action="scan"]', title: 'Solve your real cube', text: 'Got a real cube? Show it to the camera and I’ll help you solve it.' },
    { target: '.settings-link', title: 'For grown-ups', text: 'Grown-ups can change the voice, the look, and more in here.' },
  ],
  lesson: [
    { target: '#cube-canvas', title: 'Your practice cube', text: 'Drag it to spin it around and see every side.' },
    { target: '[data-action="nextMove"]', title: 'Watch each move', text: 'Tap Next move, and the cube shows you one turn at a time.' },
    { target: '.mastery-strip', title: 'How a lesson works', text: 'First watch me, then answer one question, then it’s your turn!' },
    { target: '[data-action="readStep"]', title: 'Hear it', text: 'Tap the speaker any time to hear the move out loud.' },
  ],
  turn: [
    { target: '#recall-pad', title: 'Your turn!', text: 'Tap the move that comes next, right here under the cube.' },
    { target: '#stage-actions [data-action="hint"]', title: 'Need help?', text: 'Tap Hint to peek. Do it with no hints to earn a gold star!' },
  ],
};
let tour = null;

function cubeBuddy() {
  return `<svg class="tour-buddy" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 56 19v26L32 58 8 45V19z" fill="#f5d575"/><path d="M8 19l24 13v26L8 45z" fill="#fff8de"/><path d="M32 32l24-13v26L32 58z" fill="#76b398"/><path d="M32 6 56 19 32 32 8 19z" fill="#f7e19a"/><path d="M8 19 32 32 56 19M32 32v26" fill="none" stroke="#315f49" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 6 56 19v26L32 58 8 45V19z" fill="none" stroke="#315f49" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="36" r="2.2" fill="#315f49"/><circle cx="25" cy="41" r="2.2" fill="#315f49"/><path d="M15 44c3 4 7 5 10 3" fill="none" stroke="#315f49" stroke-width="2" stroke-linecap="round"/></svg>`;
}

// Starts a tour the first time it applies. Waits for the screen to settle, and never interrupts a dialog.
function maybeTour(id) {
  if (window.cubeClubNoTours || !TOURS[id] || progress.tours?.includes(id))
    return;
  setTimeout(() => {
    if (tour || window.cubeClubNoTours || progress.tours?.includes(id) || !$('#overlay').hidden || busy)
      return;
    startTour(id);
  }, 450);
}

function startTour(id) {
  endTour(false);
  const steps = TOURS[id];
  if (!steps)
    return;
  const root = document.createElement('div');
  root.id = 'tour';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'tour-title');
  root.innerHTML = `<div class="tour-shade"></div><div class="tour-spot" hidden></div><div class="tour-bubble" tabindex="-1">${cubeBuddy()}<div class="tour-words"><h2 id="tour-title"></h2><p id="tour-text"></p></div><div class="tour-footer"><span class="tour-dots" aria-hidden="true"></span><button class="text-button" data-tour="skip">Skip</button><button class="button primary" data-tour="next"></button></div></div>`;
  document.body.append(root);
  tour = { id, steps, index: 0, root };
  showTourStep();
}

function showTourStep() {
  if (!tour)
    return;
  const step = tour.steps[tour.index], last = tour.index === tour.steps.length - 1;
  const target = step.target ? [...document.querySelectorAll(step.target)].find(visibleTarget) : null;
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#tour-title').textContent = step.title;
  $('#tour-text').textContent = step.text;
  $('.tour-dots').innerHTML = tour.steps.map((_, i) => `<i class="${i === tour.index ? 'on' : ''}"></i>`).join('');
  $('[data-tour="next"]').textContent = last ? (tour.id === 'home' ? 'Let’s go!' : 'Got it!') : 'Next';
  $('[data-tour="skip"]').hidden = last;
  tour.target = target;
  placeTour();
  $('.tour-bubble').focus({ preventScroll: true });
  autoSpeak(`${step.title} ${step.text}`);
}

function visibleTarget(el) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}

// The spotlight is a rounded hole cut by a huge shadow; the bubble sits beside, below or above it.
function placeTour() {
  if (!tour)
    return;
  const spot = $('.tour-spot'), bubble = $('.tour-bubble'), pad = 8, gap = 16, edge = 12;
  const W = innerWidth, H = innerHeight, b = bubble.getBoundingClientRect();
  if (!tour.target || !tour.target.isConnected) {
    spot.hidden = true;
    $('.tour-shade').hidden = false;
    Object.assign(bubble.style, { left: `${Math.max(edge, (W - b.width) / 2)}px`, top: `${Math.max(edge, (H - b.height) / 2)}px` });
    return;
  }
  const r = tour.target.getBoundingClientRect();
  $('.tour-shade').hidden = true;
  spot.hidden = false;
  Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
  let left, top;
  if (r.right + gap + b.width <= W - edge && r.width < W / 2) {
    left = r.right + gap; top = r.top + r.height / 2 - b.height / 2;
  } else if (r.bottom + gap + b.height <= H - edge) {
    left = r.left + r.width / 2 - b.width / 2; top = r.bottom + gap;
  } else {
    left = r.left + r.width / 2 - b.width / 2; top = r.top - gap - b.height;
  }
  left = Math.min(Math.max(edge, left), W - b.width - edge);
  top = Math.min(Math.max(edge, top), H - b.height - edge);
  Object.assign(bubble.style, { left: `${left}px`, top: `${top}px` });
}

// Finishing or skipping marks the tour as seen.
function endTour(seen = true) {
  if (!tour)
    return;
  const { id, root } = tour;
  tour = null;
  root.remove();
  stopSpeech();
  if (seen && !progress.tours.includes(id)) {
    progress.tours.push(id);
    save();
  }
}

function tourClick(d) {
  if (!tour || !d.tour)
    return false;
  if (d.tour === 'skip')
    endTour();
  else if (tour.index < tour.steps.length - 1) {
    tour.index++;
    showTourStep();
  }
  else
    endTour();
  return true;
}

// Settings: forget every tour and show the welcome tour again from the clubhouse.
function replayTours() {
  progress.tours = [];
  save();
  closeModal();
  navigate('home');
  maybeTour('home');
}

addEventListener('resize', () => placeTour());
document.addEventListener('keydown', e => {
  if (!tour)
    return;
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    endTour();
  }
  else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    e.stopPropagation();
    tourClick({ tour: 'next' });
  }
}, true);
