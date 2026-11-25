/* The practice playground: free turns, undo, reset, and scramble. */
'use strict';
function playPage() {
  return `<div class="page-intro"><div class="eyebrow">NO WRONG TURNS HERE</div><h1>The practice playground <em>✦</em></h1><p>Twist it. Try it. Undo it. This cube is yours to explore.</p></div><div class="lesson-layout">${stage()}<div><div class="why-panel" style="margin-top:0"><h3>${icon('spark')}Meet your cube’s alphabet</h3><p>R = right · L = left · U = top · D = bottom · F = front · B = back.<br>A letter means clockwise, looking straight at that face. An apostrophe (′) means the other way. A 2 means a half turn.</p></div>${turnPad()}<div class="history" id="move-history">Your moves will appear here.</div><div class="status-line" id="play-status"></div><div class="mode-row"><button class="button secondary" data-action="scramble">${icon('swap')}Mix it up</button><button class="button secondary" data-action="resetPlay">Fresh cube</button></div><div class="path-note">${icon('heart')}Try R four times. What do you notice? Centers stay in place, and every piece comes home.</div></div></div>`;
}
function updatePlay() {
  if (session?.type !== 'play')
    return;
  $('#move-history').textContent = session.history.slice(-24).join('  ') || 'Your moves will appear here.';
  $('#play-status').textContent = session.cube.isSolved() ? 'Every piece is home. Try a new pattern!' : `${session.history.length} turns explored. Undo is always here.`;
  const undo = $('[data-action="undoPlay"]');
  if (undo)
    undo.disabled = !session.history.length || busy;
}
// Playground controls.
async function playClick(d) {
  switch (d.action) {
    case 'undoPlay':
      if (!busy && session?.history?.length) {
        busy = true;
        const current = session;
        await view.turn(Cube.inverse(current.history.pop()), turnDuration(600, 250));
        if (current === session) {
          busy = false;
          updatePlay();
        }
      }
      break;
    case 'resetPlay':
      if (!busy && session?.type === 'play') {
        session.cube = new Cube();
        session.history = [];
        view.setCube(session.cube);
        updatePlay();
      }
      break;
    case 'scramble':
      if (!busy && session?.type === 'play') {
        const alg = [];
        let last = '';
        for (let i = 0; i < 20; i++) {
          const choices = FACES.filter(f => f !== last);
          last = choices[Math.floor(Math.random() * choices.length)];
          alg.push(last + ['', "'", '2'][Math.floor(Math.random() * 3)]);
        }
        session.cube.move(alg.join(' '));
        session.history.push(...alg);
        view.draw();
        updatePlay();
        toast('A fresh puzzle! Try a few turns, then undo to explore.');
      }
      break;
    default: return false;
  }
  return true;
}
