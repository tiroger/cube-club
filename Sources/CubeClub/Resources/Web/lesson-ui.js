/* Guided lessons and solves: the move sequence, recall checks, and concept questions. */
'use strict';
function sequencePage() {
  if (session.teaching)
    return teachingPage();
  const l = session.lesson, isSolve = session.type === 'solve';
  const why = `<details class="why-panel"><summary>${icon('spark')}${isSolve ? 'A helper for this exact scramble' : 'The little “why” behind it'}</summary><p>${isSolve ? 'This is a verified move-by-move solution for your scanned state. It may mix several techniques. Visit the learning path to learn reusable beginner patterns and how to recognize them.' : l.why}</p></details>`;
  const when = isSolve ? `<details class="when-panel"><summary>My real cube doesn’t match</summary><p>Pause. Undo the last move on your real cube and use Back here. If you have lost your place, scan again. “Check my last move” compares snapshots you review. It does not continuously track your hands.</p><button class="button secondary" data-action="scan">Scan again</button></details>` : `<details class="when-panel"><summary>When do I use this?</summary><p>${l.when}</p></details><div id="lesson-pieces"></div>`;
  return `<div class="lesson-top"><button class="back-link" data-nav="${isSolve ? 'home' : 'learn'}">${icon('arrow')}${isSolve ? 'Back to clubhouse' : 'Back to my quest map'}</button><span class="eyebrow">${isSolve ? 'GUIDED SOLVE' : l.tag.toUpperCase()}</span></div>${pauseControl()}<div class="lesson-head"><div><div class="eyebrow">${icon(isSolve ? 'camera' : l.icon)}${isSolve ? 'ONE TURN AT A TIME' : l.category}</div><h1>${isSolve ? 'Let’s solve it together.' : l.title}</h1></div>${isSolve ? '' : '<div id="lesson-stepper"></div>'}</div><div class="lesson-layout one-step">${stage(false)}<div class="lesson-copy"><p class="subtitle">${isSolve ? 'Make the shown turn, then tap “Next move.” Use “Check my last move” to compare it with the camera. Keep yellow up and green in front.' : l.goal}</p><div id="sequence-controls"></div><div id="stage-actions"></div>${why}${when}</div></div>`;
}
function startLesson(id) {
  if (busy || continuityWorking)
    return;
  const lesson = LESSONS.find(l => l.id === id);
  if (!lesson)
    return;
  if (!Quest.canOpen(progress, id)) {
    showLockedLesson(id);
    return;
  }
  rememberSession();
  if (route === 'timer')
    timerLeaving();
  cancelPlayback();
  busy = false;
  view?.destroy();
  route = 'lesson';
  progress.quest.selected = Quest.stageFor(id);
  progress.learningLevel = lesson.level === 'next' ? 'next' : 'beginner';
  save();
  const algorithm = moves(lesson.algorithm), initial = CubeClubCore.lessonInitial(lesson);
  session = { type: 'lesson', lesson, algorithm, initial: initial.clone(), cube: initial, index: 0, mode: 'guide', attempt: { turns: 0, assisted: false } };
  render();
  rememberSession();
  autoSpeak(lesson.goal);
  maybeTour('lesson');
}
function updateSequence() {
  if (!session || !['lesson', 'solve'].includes(session.type))
    return;
  const pauseButton = $('[data-action="pauseSession"]');
  if (pauseButton)
    pauseButton.disabled = busy;
  if (session.teaching) {
    updateTeaching();
    return;
  }
  const { index, algorithm, mode } = session, done = index === algorithm.length, recall = mode === 'recall' || mode === 'check';
  if (session.type === 'lesson')
    $('#lesson-stepper').innerHTML = lessonStepper(session.lesson);
  const words = done ? (session.lesson?.finish || 'Little moves add up. Ready to try it again?') : recall ? (mode === 'check' ? 'Tap each move yourself. No hints this time, so you can earn the gold star!' : 'Tap the move that comes next, right below.') : session.type === 'solve' ? 'Make this turn on your cube, then continue. Clockwise is viewed directly from the face you are turning.' : session.lesson.steps?.[index] || session.lesson.hint;
  $('#sequence-controls').innerHTML = `<div class="buddy-says">${cubeBuddy('buddy')}<div class="instruction-card" aria-live="polite"><div class="step-number">${done ? 'NICE WORK!' : recall ? (mode === 'check' ? 'GOLD STAR TRY' : 'YOUR TURN') : `MOVE ${index + 1} OF ${algorithm.length}`}</div><h3>${done ? 'You put the pattern together!' : recall ? 'What comes next?' : `<span class="say-move">${algorithm[index].replace("'", '′')}</span>${describeMove(algorithm[index])}`}</h3><p>${words}</p></div></div><div class="algorithm" aria-label="Algorithm">${algorithm.map((m, i) => `<span class="move-chip ${i < index ? 'past' : i === index ? 'current' : ''} ${recall && i >= index ? 'hidden-move' : ''}">${recall && i >= index ? '?' : m.replace("'", '′')}</span>`).join('')}</div>`;
  $('#stage-actions').innerHTML = `<div class="stage-controls"><button class="button secondary" data-action="backMove" ${index === 0 || busy ? 'disabled' : ''} aria-label="Previous move">${icon('undo')}Back</button><button class="button ${recall && !done ? 'secondary' : 'primary'}" data-action="${done ? 'replay' : playing ? 'pause' : recall ? 'hint' : 'nextMove'}" ${busy && !playing ? 'disabled' : ''}>${icon(done ? 'undo' : playing ? 'pause' : recall ? 'spark' : 'play')}${done ? 'Try again' : playing ? 'Pause' : recall ? 'Hint' : session.type === 'lesson' ? 'Show me the next move' : 'Next move'}</button>${session.type === 'lesson' && !recall && !done ? `<button class="icon-button" data-action="autoplay" aria-label="${playing ? 'Pause autoplay' : 'Watch the full pattern'}" title="Watch the full pattern">${icon(playing ? 'pause' : 'play')}</button>` : ''}<button class="icon-button" data-action="readStep" aria-label="Read instruction aloud">${icon('sound')}</button></div>${recall && !done ? `<div id="recall-pad">${turnPad(true, extraTurns(session.algorithm))}</div>` : ''}`;
  $('#stage-actions').classList.toggle('turn-mode', recall && !done);
  if (session.type === 'solve')
    $('#stage-actions').insertAdjacentHTML('beforeend', `<div class="check-step-button"><button class="button secondary" data-action="checkMove" ${index === 0 || busy ? 'disabled' : ''}>${icon('camera')}Check my last move${index > 0 ? ' · ' + algorithm[index - 1].replace("'", '′') : ''}</button><p class="small-note">${index > 0 ? 'Compare the turn you just completed.' : 'Follow the first move to unlock a camera check.'}</p></div>`);
  if ($('#lesson-pieces') && (session.lesson?.focusPieces || session.lesson?.questStage)) {
    const mapOpen = $('#lesson-pieces .piece-map')?.open;
    $('#lesson-pieces').innerHTML = session.lesson.focusPieces ? lessonPiecePanel() : lessonCasePanel();
    $('#lesson-pieces .piece-map').open = !!mapOpen;
  }
  if (session.type === 'lesson')
    document.querySelectorAll('.lesson-copy>.why-panel,.lesson-copy>.when-panel').forEach(el => el.hidden = mode === 'check');
}
async function nextMove(source = 'guide') {
  if (session?.teaching && teachingCheckpoint())
    return;
  if (busy || !session || !['lesson', 'solve'].includes(session.type) || session.index >= session.algorithm.length)
    return;
  if (session.type === 'lesson' && session.mode !== 'guide' && source !== 'recall')
    return;
  busy = true;
  const current = session, token = generation, move = current.algorithm[current.index];
  updateSequence();
  autoSpeak(speakMove(move));
  await view.turn(move, turnDuration());
  if (current !== session)
    return;
  if (token !== generation) {
    busy = false;
    return;
  }
  current.index++;
  if (current.type === 'lesson')
    current.attempt.turns++;
  busy = false;
  updateSequence();
  rememberSession();
  if (current.teaching)
    return;
  if (current.index === current.algorithm.length) {
    playing = false;
    if (current.type === 'lesson') {
      Quest.finishAttempt(progress, current.lesson.id, { ...current.attempt, mode: current.mode, complete: true, solved: CubeClubCore.lessonComplete(current.lesson, current.cube) });
      rememberSession(true);
      completion(current.lesson);
    }
    else if (current.cube.isSolved()) {
      if (!current.credited) {
        progress.solves++;
        current.credited = true;
        rememberSession(true);
      }
      showModal(`<div class="completion"><div class="big-star">✦</div><h2>You brought it home!</h2><p>The cube on screen is solved! Check your real cube’s six faces to see that they match, too.</p><button class="button primary" data-action="checkMove">Check my last move ${icon('camera')}</button><button class="button secondary" data-action="closeModal">Look at my cube</button><button class="button secondary" data-action="learnAfterSolve">Learn the patterns</button></div>`, 'small-modal');
    }
  }
}
async function autoplay() {
  if (session?.teaching)
    return;
  if (session?.type === 'lesson' && session.mode !== 'guide')
    return;
  if (busy && !playing)
    return;
  if (playing) {
    playing = false;
    updateSequence();
    return;
  }
  playing = true;
  const current = session, token = generation;
  while (playing && session === current && generation === token && current.index < current.algorithm.length) {
    await nextMove();
    if (playing)
      await new Promise(r => setTimeout(r, progress.slow ? 1000 : 500));
  }
  playing = false;
  if (session === current)
    updateSequence();
}
async function backMove() {
  if (busy || !session || session.index === 0)
    return;
  markAssisted();
  playing = false;
  busy = true;
  const current = session;
  const index = --current.index;
  if (current.teaching)
    current.checkpoints = new Set([...current.checkpoints].filter(id => current.teaching.stages.find(s => s.id === id).end < index));
  if (current.type === 'lesson')
    current.attempt.turns = Math.max(0, current.attempt.turns - 1);
  updateSequence();
  await view.turn(Cube.inverse(current.algorithm[index]), turnDuration(550, 250));
  if (session === current) {
    busy = false;
    updateSequence();
    await rememberSession();
  }
}
function replay(mode) {
  if (busy)
    return;
  cancelPlayback();
  if (session.teaching)
    session.checkpoints = new Set();
  session.index = 0;
  session.mode = mode || session.mode;
  session.attempt = { turns: 0, assisted: false };
  session.cube = session.initial.clone();
  view.setCube(session.cube);
  updateSequence();
  rememberSession();
  if (session.mode === 'recall')
    maybeTour('turn');
}
function completion(l) {
  questCompletion(l);
}
async function playTurn(move) {
  if (busy)
    return;
  if (session?.type === 'lesson' && ['recall', 'check'].includes(session.mode)) {
    const expected = session.algorithm[session.index];
    if (session.index >= session.algorithm.length)
      return;
    if (move !== expected) {
      markAssisted();
      toast('Good try! Think about the next face, or ask for a hint.');
      autoSpeak(pick(['Almost! Have a look at the hint.', 'Good try! The hint can help.', 'Not quite. Try another move.']));
      return;
    }
    await nextMove('recall');
    return;
  }
  if (session?.type !== 'play')
    return;
  busy = true;
  const current = session;
  autoSpeak(speakMove(move));
  await view.turn(move, turnDuration(650, 250));
  if (current !== session)
    return;
  current.history.push(move);
  progress.moves++;
  busy = false;
  save();
  updatePlay();
}
// Lesson buttons, concept answers, and the cube turn pad.
async function lessonClick(d, button) {
  if (d.lesson) {
    if (!$('#overlay').hidden)
      closeModal();
    startLesson(d.lesson);
    return true;
  }
  if (d.turn) {
    await playTurn(d.turn);
    return true;
  }
  if (d.mode) {
    questStartMode(d.mode);
    return true;
  }
  if (d.answer !== undefined) {
    const l = session?.lesson;
    if (!l)
      return true;
    const correct = Quest.answerConcept(progress, l.id, Number(d.answer));
    if (correct) {
      rememberSession(true);
      questCompletion(l);
    }
    else {
      button.classList.add('wrong');
      $('#quiz-feedback').textContent = 'Take another look and try again. You can revisit the explanation in the lesson.';
    }
    return true;
  }
  switch (d.action) {
    case 'nextMove':
      await nextMove();
      break;
    case 'backMove':
      await backMove();
      break;
    case 'autoplay':
      autoplay();
      break;
    case 'pause':
      playing = false;
      updateSequence();
      break;
    case 'replay':
      replay();
      break;
    case 'hint': {
      markAssisted();
      const text = session?.index < session?.algorithm.length ? `${session.algorithm[session.index]}: ${describeMove(session.algorithm[session.index])}` : 'You know the whole pattern!';
      toast(text);
      speak(text);
      break;
    }
    case 'readStep':
      markAssisted();
      speak(session?.index < session?.algorithm.length ? speakMove(session.algorithm[session.index]) : 'You did it!');
      break;
    case 'nextLesson': {
      const index = LESSONS.findIndex(l => l.id === session?.lesson?.id);
      closeModal();
      if (index === LESSONS.length - 1)
        navigate('badges');
      else
        startLesson(LESSONS[index + 1].id);
      break;
    }
    case 'learnAfterSolve':
      closeModal();
      navigate('learn');
      break;
    default: return false;
  }
  return true;
}
