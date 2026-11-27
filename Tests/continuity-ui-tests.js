let checks=typeof previousChecks==='number'?previousChecks:0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function click(selector){const b=$(selector);assert(b&&!b.disabled,'Available: '+selector);b.click();await tick();while(busy||continuityWorking)await tick();}
async function acknowledge(){const el=$('#restore-acknowledged');el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));await tick();}
async function disk(){return JSON.parse((await bridge('loadProgress')).value);}
while(!$('#content h1'))await tick();
if(testLaunch===0){
 progress=normalizeProgress({preferences:{reduceMotion:true,textSize:'large'},quest:{grants:['speed']}});applyPreferences();render();
 startLesson('hello');await nextMove();await nextMove();
 assert((await disk()).savedSessions.lesson.index===2,'Completed turns save through native bridge');
 await click('[data-action="pauseSession"]');assert(route==='home'&&$('[data-resume="lesson"]'),'Pause goes to home with saved lesson');
 newScan();await click('[data-action="demoScan"]');await click('[data-action="solveScan"]');
 while(scan?.solving)await new Promise(r=>setTimeout(r,10));assert(session.teaching,'Native teaching plan built');
 for(let i=0;i<12;i++){if(teachingCheckpoint())await teachingClick({action:'confirmTeachingStage'});await nextMove();}
 await rememberSession(true);const expected=session.cube.asString();
 assert((await disk()).savedSessions.solve.index===session.index,'Teaching turn saves automatically');
 await click('[data-action="pauseSession"]');assert($('[data-resume="lesson"]')&&$('[data-resume="solve"]'),'Both adventures remain available');
 const copyBefore=JSON.stringify(progress.savedSessions);await click('[data-resume="solve"]');assert(!scan&&$('#overlay').textContent.includes('Hold yellow up'),'Resume comparison opens without camera');
 await click('[data-action="closeModal"]');assert(route==='home'&&JSON.stringify(progress.savedSessions)===copyBefore,'Cancel resume changes neither saved place');
 await click('[data-resume="solve"]');await click('[data-action="confirmResume"]');assert(session.cube.asString()===expected&&!playing,'Exact cube restored without autoplay');
 assert(!Object.keys(progress.quest.records).length&&progress.solves===0,'Resuming awards no mastery or solve credit');
 await backMove();assert(progress.savedSessions.solve.index===session.index,'Undo updates saved place');
 if(teachingCheckpoint())await teachingClick({action:'confirmTeachingStage'});await nextMove();
 const colors={U:[250,205,50],R:[245,130,45],F:[50,165,100],D:[235,235,230],L:[205,35,40],B:[35,95,205]};
 assert(await persistCameraPalette(colors),'Calibration saved');assert((await disk()).calibration.colors.F[1]===165,'Saved samples in native storage');
 navigate('home');await save();return {reload:true,checks};
}
assert(progress.savedSessions.lesson.index===2&&progress.savedSessions.solve.index===12,'Actual WebKit relaunch loads both saved sessions: '+JSON.stringify(progress.savedSessions)+' disk '+JSON.stringify((await disk()).savedSessions));
assert(cameraPalette.F[1]===165&&CubeClubVision.profileReady(cameraPalette),'Relaunch restores actual camera classifier palette');
assert($('[data-resume="lesson"]')&&$('[data-resume="solve"]'),'Relaunch exposes both continue buttons');
newScan();assert($('#color-teaching').textContent.includes('saved on this Mac')&&!scan.camera,'Scanner explains persisted colors and remains off');closeModal();
await click('[data-resume="lesson"]');await click('[data-action="confirmResume"]');assert(session.index===2&&session.lesson.id==='hello','Lesson resumes exact turn');
await nextMove();await nextMove();assert(progress.completed.includes('hello'),'Resumed lesson earns exploration only through completing remaining moves');
closeModal();Quest.answerConcept(progress,'hello',0);Quest.finishAttempt(progress,'hello',{mode:'recall',complete:true,solved:true,turns:4,assisted:true});replay('check');await playTurn('R');markAssisted();await rememberSession(true);
await pauseSession();showResume('lesson');assert($('#overlay').textContent.includes('fresh gold star try'),'Paused gold star tries explain the fresh attempt');confirmResume();assert(session.index===0&&session.attempt.turns===0&&!session.attempt.assisted&&!Quest.mastered(progress,'hello'),'A gold star try restarts without granting the star');
for(let i=0;i<4;i++)await playTurn('R');assert(Quest.mastered(progress,'hello')&&!progress.savedSessions.lesson,'Fresh independent completion clears mastered saved lesson');closeModal();navigate('home');
const original=JSON.stringify(progress),backup=Continuity.encode(progress),replacement=normalizeProgress({moves:123,preferences:{appearance:'dark',textSize:'large',reduceMotion:true}}),replacementFile=Continuity.encode(replacement);
settings('progress');assert($('[data-action="exportBackup"]')&&$('[data-action="importBackup"]'),'Backup controls available');await click('[data-action="exportBackup"]');assert(!continuityWorking,'Native backup export completes');
await bridge('continuityTestInput',{reply:{cancelled:true}});await click('[data-action="importBackup"]');assert(JSON.stringify(progress)===original&&$('.settings-modal'),'Cancelled picker preserves journey');
for(const value of ['{','{}',JSON.stringify({format:'club.cube.backup',version:999})]){await bridge('continuityTestInput',{reply:{value}});await click('[data-action="importBackup"]');assert(JSON.stringify(progress)===original&&!restorePending,'Invalid backup cannot change progress');}
await bridge('continuityTestInput',{reply:{value:replacementFile}});await click('[data-action="importBackup"]');assert($('[data-action="confirmRestore"]').disabled&&JSON.stringify(progress)===original,'Preview does not replace journey and requires acknowledgement');
await click('[data-action="cancelRestore"]');assert(JSON.stringify(progress)===original,'Cancel restore leaves all state untouched');
await click('[data-action="importBackup"]');await acknowledge();await bridge('continuityTestInput',{failRestore:true});await click('[data-action="confirmRestore"]');assert(JSON.stringify(progress)===original&&$('#restore-error').textContent.includes('failure'),'Failed native restore retains current journey and preview');
await bridge('continuityTestInput',{});await click('[data-action="confirmRestore"]');assert(progress.moves===123&&route==='home'&&$('#overlay').hidden&&document.documentElement.dataset.theme==='dark','Restore replaces journey and applies appearance');assert(Object.keys(cameraPalette).length===0,'Restore also replaces runtime camera palette');
settings('progress');await click('[data-action="restoreRecovery"]');await acknowledge();await click('[data-action="confirmRestore"]');assert(Quest.mastered(progress,'hello')&&progress.savedSessions.solve&&cameraPalette.F[1]===165,'Recovery brings back original progress, saved solve and calibration');
settings('learning');await click('[data-action="forgetCalibration"]');assert(!progress.calibration&&!Object.keys(cameraPalette).length&&!((await disk()).calibration),'Forget learned colors clears saved and runtime samples');
await bridge('continuityTestInput',{reply:{value:backup}});settings('progress');await click('[data-action="importBackup"]');await acknowledge();await click('[data-action="confirmRestore"]');assert(cameraPalette.F[1]===165,'Backup restores learned samples after reset');
// A failed pause stays in the lesson and reports a retryable error.
startLesson('hello');await nextMove();const realSave=save;save=async()=>false;await pauseSession();assert(route==='lesson'&&sessionSaveFailed&&$('#session-save-status').textContent.includes('not saved'),'Failed pause keeps active lesson and visible error');save=realSave;await pauseSession();assert(route==='home'&&!sessionSaveFailed,'Retry saves and pauses');
// Calibration write failure rolls back both saved model and live classifier.
const oldColors=JSON.stringify(cameraPalette);save=async()=>false;assert(!await persistCameraPalette({})&&JSON.stringify(cameraPalette)===oldColors&&progress.calibration,'Failed calibration save keeps the old classifier');save=realSave;
for(const appearance of ['light','dark']){progress.preferences.appearance=appearance;applyPreferences();render();assert(document.documentElement.scrollWidth<=innerWidth,'Saved places fit '+appearance+' large-text minimum window');showResume('solve');assert($('.modal').scrollWidth<=$('.modal').clientWidth,'Resume diagrams fit minimum window');closeModal();}
return checks+' continuity UI checks passed: relaunch, exact resume, separate places, independent mastery, native backup preview/cancel/restore/recovery, calibration and failure handling.';
