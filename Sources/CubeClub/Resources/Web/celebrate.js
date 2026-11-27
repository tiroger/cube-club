/* The cube mascot, its celebrations, the confetti that goes with them, and the gold-star count. */
'use strict';
// The waving mascot. The figure bobs while idle and hops to celebrate; the right arm waves on its own.
function mascotArt(label = 'Your cube buddy, a cheerful cube waving hello') {
  return `<svg class="mascot-art" viewBox="0 0 410 280" role="img" aria-label="${label}"><ellipse class="mascot-shadow" cx="224" cy="246" rx="94" ry="10" fill="#b9cdb2" opacity=".4"/><g class="mascot-sparkles"><path d="M68 120c-18-20-2-40 18-22" fill="none" stroke="#aec6a4" stroke-width="2" stroke-dasharray="5 6"/><path d="m327 43 5 12 13 3-11 7-1 13-9-10-13 3 7-11-5-12Z" fill="#e9ca71"/><path d="m88 192 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#89ad81"/><circle cx="333" cy="170" r="4" fill="#b6c5a2"/><circle cx="118" cy="53" r="3" fill="#c4bb83"/><path d="m82 73 5-10m7 18 12-2" stroke="#92b584" stroke-width="2" stroke-linecap="round"/></g><g class="mascot-figure"><path d="m159 212-6 26-15 3m113-30 9 23 17 3" stroke="#477359" stroke-width="8" stroke-linecap="round" fill="none"/><path d="M127 156l-21 12-17-15" stroke="#477359" stroke-width="7" stroke-linecap="round" fill="none"/><g class="mascot-arm"><path d="M285 137l25-18 2-19" stroke="#477359" stroke-width="7" stroke-linecap="round" fill="none"/><path d="m309 100-5-12m9 11 5-13" stroke="#477359" stroke-width="4" stroke-linecap="round"/></g><g transform="rotate(-9 207 144)"><path d="m130 102 92-44 76 41-89 49Z" fill="#fae5a0" stroke="#3d6853" stroke-width="4" stroke-linejoin="round"/><path d="m130 102 79 46v88l-79-45Z" fill="#fff9df" stroke="#3d6853" stroke-width="4" stroke-linejoin="round"/><path d="m209 148 89-49v88l-89 49Z" fill="#77b796" stroke="#3d6853" stroke-width="4" stroke-linejoin="round"/><path d="m160 88 77 45m-45-60 75 44M157 117l92-43m-65 59 89-45M155 117v88m27-73v88m-52-88 79 46m-79-17 79 47M239 132v88m30-105v88m-60-25 89-50m-89 79 89-49" fill="none" stroke="#3d6853" stroke-width="3" opacity=".7"/><ellipse cx="153" cy="157" rx="4" ry="6" fill="#345c49"/><ellipse cx="184" cy="174" rx="4" ry="6" fill="#345c49"/><path d="M161 177q7 13 15 8" fill="none" stroke="#345c49" stroke-width="3" stroke-linecap="round"/><ellipse cx="146" cy="167" rx="6" ry="3" fill="#efb7a1" transform="rotate(27 146 167)"/></g></g></svg>`;
}
function mascot(cls = '') {
  return `<div class="mascot ${cls}">${mascotArt()}</div>`;
}
// The mascot hopping and waving above a milestone. A gold star pops in beside it when one was earned.
function celebration(star = false) {
  return `<div class="celebration">${mascot('party')}${star ? '<span class="star-pop" aria-hidden="true">★</span>' : ''}</div>`;
}
function motionReduced() {
  return document.documentElement.dataset.reduceMotion === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}
// A short burst of paper confetti from the middle of an element. Skipped when motion is reduced.
function confetti(from) {
  if (motionReduced())
    return;
  const r = (from || document.body).getBoundingClientRect(), colors = ['#f4cd52', '#ef9447', '#7cc4a3', '#277656', '#e9a3c0', '#8fb4e8'];
  const burst = document.createElement('div');
  burst.className = 'confetti';
  burst.setAttribute('aria-hidden', 'true');
  burst.style.left = r.left + r.width / 2 + 'px';
  burst.style.top = r.top + r.height / 2 + 'px';
  burst.innerHTML = Array.from({ length: 34 }, (_, i) => {
    const x = (Math.random() * 2 - 1) * 300, up = -(110 + Math.random() * 170), fall = 120 + Math.random() * 200;
    return `<i style="--x:${x.toFixed(0)}px;--up:${up.toFixed(0)}px;--y:${fall.toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;--d:${(Math.random() * 160).toFixed(0)}ms;background:${colors[i % colors.length]}"></i>`;
  }).join('');
  document.body.append(burst);
  setTimeout(() => burst.remove(), 1900);
}
// Confetti from the celebration in the open dialog, once it has been laid out.
function celebrateDialog() {
  requestAnimationFrame(() => confetti($('#overlay .celebration')));
}
// The gold-star count in the top bar. It pops when a new star arrives.
let starsShown = null;
function updateStars() {
  const n = LESSONS.filter(l => Quest.mastered(progress, l.id)).length, pill = $('#star-pill');
  if (!pill)
    return;
  $('#star-count').textContent = `${n} gold star${n === 1 ? '' : 's'}`;
  if (starsShown !== null && n > starsShown) {
    pill.classList.remove('pop');
    void pill.offsetWidth;
    pill.classList.add('pop');
  }
  starsShown = n;
}
// When nothing has been tapped for a while, the one thing to tap next does a gentle wiggle.
// Any tap or key press stops it and starts the wait again.
const NUDGE_TARGETS = ['#overlay:not([hidden]) .button.primary', '.home-continue', '.trail-stop.current .trail-mark', '.quest-graduation .button.primary', '#stage-actions [data-action="nextMove"]', '#stage-actions [data-action="replay"]'];
let nudgeTimer = null;
function nudgeLater() {
  clearTimeout(nudgeTimer);
  document.querySelectorAll('.nudge').forEach(el => el.classList.remove('nudge'));
  nudgeTimer = setTimeout(() => {
    if (motionReduced() || busy || playing || $('#tour'))
      return nudgeLater();
    const target = NUDGE_TARGETS.map(s => $(s)).find(el => el && !el.disabled && el.getClientRects().length);
    target?.classList.add('nudge');
  }, 10000);
}
for (const type of ['pointerdown', 'keydown'])
  document.addEventListener(type, nudgeLater, true);
