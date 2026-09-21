let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
const tick=()=>new Promise(r=>setTimeout(r,0));
async function click(selector){const b=$(selector);assert(b&&!b.disabled,'Available: '+selector);b.click();await tick();while(busy)await tick();}
while(!document.querySelector('#content h1'))await tick();
progress=normalizeProgress({preferences:{reduceMotion:true,textSize:'large'}});applyPreferences();render();
newScan();assert(scan.method==='beginner'&&!scan.camera,'Teaching is default and camera remains opt-in');
for(let i=0;i<6;i++){await click(`[data-scan-face="${i}"]`);assert($('.orientation-cube')&&$('.orientation-scene').getAttribute('aria-label').includes(COLOR_NAMES[scanOrder[i]]),'Illustrated grip for '+scanOrder[i]);assert($('.modal').scrollWidth<=$('.modal').clientWidth,'Scanner fits large text at minimum width');const f=scanOrder[i],top=f==='U'?'B':f==='D'?'F':'U',rotation=new DOMMatrix(getComputedStyle($('.orientation-cube')).transform);for(const [face,axis,expected] of [[f,'z',1],[top,'y',-1]]){const transform=rotation.multiply(new DOMMatrix(getComputedStyle($('.face-'+face)).transform)),normal={x:transform.m31,y:transform.m32,z:transform.m33};assert(Math.abs(normal[axis]-expected)<0.001,'Illustration physically presents correct '+axis+' center for '+f+' actual '+JSON.stringify(normal)+' matrix '+getComputedStyle($('.orientation-cube')).transform+' face '+getComputedStyle($('.orientation-face.face-'+face)).transform);}}
await click('[data-action="demoScan"]');const facelets=FACES.map(f=>scan.faces[f].join('')).join('');
await click('[data-solve-method="general"]');assert(scan.method==='general'&&scan.confirmed.size===6,'Method switch keeps reviewed faces');await click('[data-solve-method="beginner"]');
const records=JSON.stringify(progress.quest),completed=JSON.stringify(progress.completed);
await click('[data-action="solveScan"]');
let waits=0;while(scan?.solving&&waits++<1000)await new Promise(r=>setTimeout(r,10));
assert(session?.teaching&&route==='solve','Native solver builds an actual beginner guide from a six-face scan: '+$('#scan-error')?.textContent);assert(!scan&&$('#overlay').hidden,'Scanner closes after a verified plan');
assert(session.initial.asString()===facelets,'Guide starts at scanned state');assert($('.teaching-path').children.length===8,'Eight milestones are visible');
let pauses=0,steps=0,backChecked=false;
while(session.index<session.algorithm.length||teachingCheckpoint()){
 const cp=teachingCheckpoint();
 if(cp){pauses++;const before=session.index;await nextMove();assert(session.index===before,'Next cannot skip milestone review');await click('[data-action="confirmTeachingStage"]');assert(session.checkpoints.has(cp.id),'Reviewed milestone recorded');}
 else{await click('[data-action="nextMove"]');steps++;}
 if(session.index===2&&!backChecked){backChecked=true;const state=session.cube.asString();await click('[data-action="backMove"]');await click('[data-action="nextMove"]');assert(session.cube.asString()===state,'Previous turn and redo restore exact state');
  await click('[data-action="checkMove"]');assert(scan.mode==='check'&&!scan.camera,'Teaching reuses reviewed camera checks without turning camera on');assert($('.scan-orientation-guide'),'Move checker also has grip illustration');closeModal();
 }
 assert(document.documentElement.scrollWidth<=innerWidth,'Teaching layout fits minimum width');
 if(steps>600)throw Error('Teaching did not finish');
}
assert(pauses>4&&session.cube.isSolved(),'Guided solve reaches reviewed milestones and solved state');assert(progress.solves===0,'No solve is credited before final confirmation');
await click('[data-action="finishTeaching"]');assert(progress.solves===1,'Final self-confirmation credits one guided solve');assert(JSON.stringify(progress.quest)===records&&JSON.stringify(progress.completed)===completed,'Guided solve never awards independent progress or unlocks lessons');
closeModal();await teachingClick({action:'finishTeaching'});assert(progress.solves===1,'Repeated celebration cannot duplicate credit');
await backMove();assert(!session.cube.isSolved(),'Can inspect previous turn after completion');
// Changing direction invalidates any checkpoint at or after that point.
assert([...session.checkpoints].every(id=>session.teaching.stages.find(s=>s.id===id).end<session.index),'Backtracking clears later confirmations');
newScan();const owner=scan;const realSolve=solveFacelets;let deliver;
solveFacelets=()=>new Promise(resolve=>deliver=resolve);await click('[data-action="demoScan"]');solveScan();closeModal();deliver(CubeClubBeginner.plan(facelets));await tick();assert(scan!==owner&&session.index<session.algorithm.length,'Closing a pending scan cannot replace the guide');solveFacelets=realSolve;
// New custom-goal lesson earns mastery by making a daisy, not by solving all faces.
progress=normalizeProgress({quest:{grants:['beginner']},preferences:{reduceMotion:true}});startLesson('daisy');await click('[data-action="nextMove"]');assert(CubeClubBeginner.reached(session.cube,'daisy')&&!session.cube.isSolved()&&progress.completed.includes('daisy'),'Daisy completion uses its actual learning goal');
closeModal();newScan();await click('[data-action="demoScan"]');await click('[data-solve-method="general"]');await click('[data-action="solveScan"]');
waits=0;while(scan?.solving&&waits++<4000)await new Promise(r=>setTimeout(r,10));
assert(session?.type==='solve'&&!session.teaching&&session.initial.clone().move(session.algorithm.join(' ')).isSolved(),'General solution remains available through native solver');
return checks+' teaching UI checks passed: native solver, illustrated scan grips, method choice, milestone guards, camera review, undo, final confirmation, cancellation and custom lesson goals.';
