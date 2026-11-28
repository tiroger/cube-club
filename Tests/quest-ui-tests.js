window.cubeClubVoiceAudit = true;
let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function click(selector){const b=document.querySelector(selector);assert(b&&!b.disabled,'Control available: '+selector);b.click();await tick();while(busy)await tick();}
function checked(selector){const b=document.querySelector(selector);assert(b,'Checkbox exists');b.checked=true;b.dispatchEvent(new Event('change',{bubbles:true}));}
progress=normalizeProgress({});render();
assert(document.querySelectorAll('.sidebar [data-nav="timer"]').length===1&&$('.home-links [data-nav="timer"]'),'Timer navigation exists');
await click('[data-nav="learn"]');assert(document.querySelectorAll('.quest-map .quest-stop').length===4&&document.querySelectorAll('.quest-branches .quest-stop.branch').length===1,'Four main stage cards and one branch card render');
await click('[data-quest-stage="advanced"]');assert(document.querySelector('.quest-gate').textContent.includes('Piece Partners'),'Locked stage states exact prerequisite');
await click('[data-lesson="pll-t"]');assert(!$('#overlay').hidden&&route==='learn','Locked lesson opens preview, not lesson');await click('[data-action="questReturn"]');assert(progress.quest.selected==='beginner','Locked preview returns to an actionable stage');
navigate('patterns');assert(route==='learn','Pattern route cannot bypass stage gate');
startPattern('pair-ready');assert(route==='learn'&&!$('#overlay').hidden,'Direct pattern cannot bypass lesson gate');closeModal();
startTeam('right');assert(route==='learn'&&!$('#overlay').hidden,'Together Time respects lesson gate');closeModal();
startLesson('hello');assert(session.lesson.id==='hello','First lesson opens');
questStartMode('check');assert(session.mode==='guide','Cannot start check before practice');
async function runMoves(mode){for(const move of [...session.algorithm]){await click(mode==='guide'?'[data-action="nextMove"]':`[data-turn="${move}"]`);}assert(!$('#overlay').hidden,'Completion dialog shown');}
await runMoves('guide');assert(progress.completed.includes('hello')&&!Quest.mastered(progress,'hello'),'Guided flow only explores');
assert($('.quiz-options')&&!$('[data-quest-mode="recall"]'),'The question comes before your turn');
await click('[data-answer="2"]');assert(!Quest.state(progress,'hello').understood,'Wrong quiz not credited');await click('[data-answer="0"]');assert(Quest.state(progress,'hello').understood,'Correct quiz credited');
assert($('[data-quest-mode="recall"]')&&$('#overlay').textContent.includes('your turn'),'A right answer leads to your turn');
await click('[data-quest-mode="recall"]');await click('[data-action="hint"]');await runMoves('recall');assert(Quest.state(progress,'hello').practiced&&!Quest.mastered(progress,'hello'),'Hinted practice cannot master');
assert(Quest.complete(progress,'hello')&&Quest.canOpen(progress,'daisy'),'Finishing your turn opens the next lesson');
assert($('[data-action="questNext"]')&&$('[data-quest-mode="check"]'),'Done offers the next lesson and a gold star try');
await click('[data-quest-mode="check"]');assert($('.lesson-copy>.why-panel').hidden,'Written algorithm explanation hidden in independent check');
const index=session.index;await nextMove();assert(session.index===index,'Guide and keyboard path cannot advance recall');await autoplay();assert(session.index===index&&!playing,'Autoplay cannot advance recall');
await click('[data-turn="U"]');await runMoves('check');assert(!Quest.mastered(progress,'hello'),'Wrong move fails independent credit');
assert($('#overlay').textContent.includes('Almost a gold star')&&$('[data-action="questNext"]'),'A missed star still lets the lesson count');
await click('[data-quest-mode="check"]');await click('[data-action="readStep"]');await runMoves('check');assert(!Quest.mastered(progress,'hello'),'Reading next instruction counts as assistance');
await click('[data-quest-mode="check"]');await click('[data-turn="R"]');await click('[data-action="backMove"]');await runMoves('check');assert(!Quest.mastered(progress,'hello'),'Backtracking counts as assistance');
await click('[data-quest-mode="check"]');await runMoves('check');assert(Quest.mastered(progress,'hello'),'Fresh independent attempt masters');
assert($('#overlay').textContent.includes('gold star'),'The pop-up celebrates the gold star');
await click('[data-action="questNext"]');assert(route==='lesson'&&session.lesson.id==='daisy'&&$('#overlay').hidden,'Next lesson opens from the pop-up');
// Exercise all real screen transitions and all three lesson modes in every stage.
for(const stageInfo of Quest.STAGES){
 for(const l of Quest.lessonsFor(stageInfo.id)){
  if(Quest.mastered(progress,l.id))continue;
  startLesson(l.id);await runMoves('guide');await click(`[data-answer="${l.correct}"]`);await click('[data-quest-mode="recall"]');
  // Alternate: a clean turn earns the star at once; a hinted turn opens the next lesson, then a no-hint try earns the star.
  const hinted=Quest.lessonsFor(stageInfo.id).indexOf(l)%2===1;
  if(hinted){await click('[data-action="hint"]');await runMoves('recall');assert(Quest.complete(progress,l.id)&&!Quest.mastered(progress,l.id),l.id+' hinted turn is done without a star');if(!nextInStage(l))assert($('#overlay [data-star-lesson="'+l.id+'"]')&&!$('#overlay [data-quest-mode="check"]'),l.id+' last lesson offers one gold-star button');await click($('[data-star-lesson]')?'[data-star-lesson]':'[data-quest-mode="check"]');await runMoves('check');}
  else await runMoves('recall');
  assert(Quest.mastered(progress,l.id),l.id+' UI mastery');if($('[data-action="questNext"]'))await click('[data-action="questNext"]');else assert($('#overlay [data-quest-challenge="'+stageInfo.id+'"]'),l.id+' last lesson leads straight to the stage challenge');
 }
 assert(Quest.ready(progress,stageInfo.id),'Stage ready through real lesson screens');
 await click(`[data-quest-challenge="${stageInfo.id}"]`);
 const first=Quest.QUESTIONS[stageInfo.id][0];await click(`[data-quest-answer="${(first.answer+1)%3}"]`);assert(!progress.quest.challenges.includes(stageInfo.id),'Wrong stage answer does not unlock');
 await click(`[data-quest-challenge="${stageInfo.id}"]`);
 for(const q of Quest.QUESTIONS[stageInfo.id])await click(`[data-quest-answer="${q.answer}"]`);
 assert(progress.quest.challenges.includes(stageInfo.id),'Stage challenge complete');
 await click(`[data-parent-graduate="${stageInfo.id}"]`);assert($('[data-action="confirmParent"]').disabled,'Parent checkpoint starts disabled');checked('#quest-parent');assert($('[data-action="confirmParent"]').disabled,'One confirmation is insufficient');checked('#quest-observed');await click('[data-action="confirmParent"]');assert(progress.quest.graduated.includes(stageInfo.id),'Physical milestone graduates stage');assert($('.graduation-stamp'),'Celebration shows graduation stamp');await click('#overlay [data-quest-stage]');
}
assert(progress.quest.graduated.length===Quest.STAGES.length&&progress.quest.graduated.includes('roux'),'Every stage and the Roux branch complete end to end');
const serialized=JSON.stringify(progress);progress=normalizeProgress(JSON.parse(serialized));assert(Quest.mastered(progress,'speed-lookahead')&&progress.quest.graduated.length===Quest.STAGES.length,'Progress survives serialized reload');
navigate('timer');await click('[data-action="startTimer"]');assert(solveTimer.phase==='running','Timer starts');solveTimer.started-=65000;await click('[data-action="stopTimer"]');assert(solveTimer.phase==='review'&&progress.quest.times.length===0,'Stopping does not save unconfirmed cube');await click('[data-action="saveTime"]');assert(progress.quest.times.length===1&&solveTimer.phase==='ready','Confirmed solved cube saves one time');
await click('[data-action="startTimer"]');navigate('learn');assert(solveTimer.phase==='review'&&timerInterval===null,'Leaving timing stops elapsed timer and interval');navigate('timer');await click('[data-action="discardTime"]');assert(progress.quest.times.length===1,'Discard does not change history');
progress=normalizeProgress({});navigate('timer');assert(!document.querySelector('[data-action="startTimer"]'),'Fresh timer remains locked');await click('[data-action="parentFirstSolve"]');checked('#quest-parent');checked('#quest-observed');await click('[data-action="confirmParent"]');assert(Quest.timerOpen(progress)&&!Quest.unlocked(progress,'intermediate'),'Early independent solve opens only timer');
settings('progress');await click('[data-parent-grant="advanced"]');checked('#quest-parent');checked('#quest-observed');await click('[data-action="confirmParent"]');assert(Quest.canOpen(progress,'pll-y')&&!Quest.unlocked(progress,'speed')&&!Quest.mastered(progress,'pll-y'),'Override opens selected practice without unearned mastery');
startLesson('pll-t');assert(document.querySelector('.piece-map'),'New last-layer case has a six-face illustration');
assert(document.documentElement.scrollWidth<=1024,'Minimum Mac window width has no horizontal overflow');
if (voiceMissing.size) throw Error('Spoken with no recording: ' + [...voiceMissing].join(' | '));
return checks+' WebKit quest integration checks passed: all lessons and stages, gate entry points, hints, parent confirmations, persistence, and timing.';
