/* The clubhouse launcher and the discoveries page. */
'use strict';
// A little isometric cube for the Continue tile, three faces and a 3×3 grid on each.
function isoCube() {
  const T = [120, 28], R = [210, 80], B = [120, 132], L = [30, 80], L2 = [30, 182], B2 = [120, 234], R2 = [210, 182];
  const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f].map(n => +n.toFixed(1));
  const pts = ps => ps.map(p => p.join(',')).join(' '), seg = (a, b) => `M${a.join(' ')}L${b.join(' ')}`;
  let grid = '';
  for (const f of [1 / 3, 2 / 3])
    grid += seg(lerp(L, B, f), lerp(T, R, f)) + seg(lerp(L, T, f), lerp(B, R, f)) + seg(lerp(L, B, f), lerp(L2, B2, f)) + seg(lerp(L, L2, f), lerp(B, B2, f)) + seg(lerp(B, R, f), lerp(B2, R2, f)) + seg(lerp(B, B2, f), lerp(R, R2, f));
  return `<svg class="iso-cube" viewBox="0 0 240 240" aria-hidden="true"><polygon points="${pts([T, R, B, L])}" fill="#f4cd52"/><polygon points="${pts([L, B, B2, L2])}" fill="#7cc4a3"/><polygon points="${pts([B, R, R2, B2])}" fill="#ef9447"/><path d="${grid}" stroke="#1c4a37" stroke-width="3.5" stroke-linecap="round" fill="none"/><path d="M${[T, R, R2, B2, L2, L].map(p => p.join(' ')).join('L')}ZM${L.join(' ')}L${B.join(' ')}L${R.join(' ')}M${B.join(' ')}L${B2.join(' ')}" stroke="#1c4a37" stroke-width="6" stroke-linejoin="round" fill="none"/></svg>`;
}
// The big Continue tile: a saved lesson to pick up, or the next lesson on the quest.
function continueTile() {
  const saved = progress.savedSessions.lesson, started = progress.completed.length || Object.keys(progress.quest.records).length;
  if (saved) {
    const l = LESSONS.find(l => l.id === saved.lessonID);
    return `<button class="home-continue" data-resume="lesson">${isoCube()}<span class="continue-words"><span class="continue-eyebrow">PICK UP WHERE YOU LEFT OFF</span><strong>${l.title}</strong><span>${saved.index} of ${moves(saved.algorithm).length} turns done · ${{ guide: 'Watching', recall: 'Your turn', check: 'Gold star try' }[saved.mode]}</span></span><span class="continue-play">${icon('play')}</span></button>`;
  }
  const l = nextLesson(), stage = Quest.STAGES.find(s => s.id === Quest.stageFor(l.id)), ls = Quest.lessonsFor(stage.id);
  return `<button class="home-continue" data-lesson="${l.id}">${isoCube()}<span class="continue-words"><span class="continue-eyebrow">${started ? 'KEEP GOING' : 'START HERE'}</span><strong>${l.title}</strong><span>${stage.title} · lesson ${ls.indexOf(l) + 1} of ${ls.length} · about ${l.minutes} minutes</span></span><span class="continue-play">${icon('play')}</span></button>`;
}
// The launcher: the mascot says hello, one giant Continue tile, four activities, and three small links.
function home() {
  const started = progress.completed.length || Object.keys(progress.quest.records).length;
  const tiles = [['play', 'nav', 'cube', 'Playground', 'Turn the cube any way you like.', 'mint'], ['scan', 'action', 'camera', 'Solve my cube', 'Show your real cube to the camera.', 'peach'], ['detective', 'nav', 'search', 'Case detective', 'Find the clue on the cube.', 'lavender'], ['team', 'nav', 'team', 'Together time', 'Take turns with a grown-up.', 'sky']];
  const links = [['learn', 'book', 'All my lessons'], ['timer', 'sun', 'Solve timer'], ['badges', 'star', 'My discoveries']];
  return `<section class="home-greet">${mascot('greet')}<div class="speech"><h1>${started ? 'Welcome back! What shall we do today?' : 'Hi! What shall we do today?'}</h1></div></section>${continueTile()}${savedPlaces(['lesson'])}<div class="home-tiles">${tiles.map(([to, kind, i, title, text, color], n) => `<button class="home-tile ${color}" data-${kind}="${to}" style="--i:${n}"><span class="tile-icon">${icon(i)}</span><span class="tile-words"><strong>${title}</strong><span>${text}</span></span></button>`).join('')}</div><div class="home-links" role="group" aria-label="More to explore">${links.map(([to, i, title]) => `<button data-nav="${to}">${icon(i)}${title}</button>`).join('')}</div>`;
}
function learn() {
  return questPath();
}
function badgePage() {
  const n = progress.completed.length;
  const badges = [['spark', 'First little discovery', 'Finish your first mission.', n >= 1], ['book', 'Pattern explorer', 'Explore three different missions.', n >= 3], ['flag', 'Whole-cube thinker', 'Explore every First Solve mission.', Quest.lessonsFor('beginner').every(l => progress.completed.includes(l.id))], ['layers', 'Pair explorer', 'Explore all six next-step lessons.', Next.LESSONS.every(l => progress.completed.includes(l.id))], ['search', 'Pattern spotter', 'Explore all eight cross and pair cases.', Next.CASES.every(c => progress.patternPractice[c.id]?.correct > 0)], ['cube', 'Hands-on hero', 'Make 20 turns in the playground.', progress.moves >= 20], ['star', 'Curious mind', 'Answer three discovery questions.', progress.quiz.length >= 3], ['heart', 'Cube companion', 'Finish a guided cube solve.', progress.solves >= 1], ['search', 'Case detective', 'Discover all seven visual clues.', progress.detective.length === Coach.CHALLENGES.length], ['team', 'Better together', 'Finish a shared pattern round.', progress.teamRounds >= 1], ['camera', 'Careful observer', 'Review all six faces of a guided step.', progress.moveChecks >= 1]];
  return `<div class="page-intro"><div class="eyebrow">LOOK WHAT YOU’RE LEARNING</div><h1>Little discoveries. <em>Big smiles.</em></h1><p>Collect memories of what you’ve learned. Your pace, your discoveries, no lost streaks.</p></div><div class="badge-grid">${badges.map(([i, title, desc, earned]) => `<div class="badge-card ${earned ? '' : 'locked'}"><div class="badge-medal">${icon(i)}</div><h3>${title}</h3><p>${desc}</p><small>${earned ? 'DISCOVERED ✦' : 'WAITING TO BE DISCOVERED'}</small></div>`).join('')}</div><div class="empty-note">${progress.completed.length} missions explored · ${progress.moves} playground turns · ${progress.quiz.length} questions discovered. All saved on this ${DEVICE}.</div>`;
}
