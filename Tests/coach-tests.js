(function(){
 'use strict';
 const {FACES,normalizeProgress}=CubeClubCore;
 const C=CubeClubCoach;
 let passed=0;
 function assert(condition,message){if(!condition)throw new Error(message);passed++;}
 const observations=state=>Object.fromEntries(FACES.map(f=>[f,C.faceString(state,f)]));
 const before=new Cube().move("R U F2 L' D B R2 U' F D2").asString();
 // Every possible requested turn, against no turn and every single-turn mistake.
 for(const intended of C.TURN_NAMES){
  const expected=Cube.fromString(before).move(intended).asString();
  const ready=C.inspectMove(before,intended);
  assert(ready.status==='ready'&&FACES.includes(ready.nextFace),`${intended}: starts with an informative face`);
  for(const actual of ['',...C.TURN_NAMES]){
   const actualState=Cube.fromString(before).move(actual).asString();
   const result=C.inspectMove(before,intended,observations(actualState));
   const status=actual===intended?'verified':actual===''?'waiting':'different';
   assert(result.status===status,`${intended} versus ${actual||'no turn'}: correct diagnosis`);
   if(result.repair)assert(Cube.fromString(actualState).move(result.repair).asString()===expected,`${actual} repair reaches exact expected state`);
  }
  for(const face of FACES){
   const result=C.inspectMove(before,intended,{[face]:C.faceString(expected,face)});
   assert(['partial','ambiguous'].includes(result.status),`${intended}/${face}: a single face never verifies the whole cube`);
   assert(result.faces===1&&result.nextFace!==face,`${intended}/${face}: next view is unobserved`);
  }
  const observed={};
  for(let count=0;count<6;count++){
   const report=C.inspectMove(before,intended,observed);
   assert(report.nextFace&&!observed[report.nextFace],`${intended}: adaptive face selection does not repeat`);
   observed[report.nextFace]=C.faceString(expected,report.nextFace);
  }
  assert(C.inspectMove(before,intended,observed).status==='verified',`${intended}: six reviewed faces confirm exact state`);
 }
 const expected=Cube.fromString(before).move('R').asString();
 const unknown=observations(expected);unknown.F='?'+unknown.F.slice(1);
 assert(C.inspectMove(before,'R',unknown).status==='uncertain','Unknown color cannot produce a confirmed match');
 const wrongCenter=observations(expected);wrongCenter.F=wrongCenter.F.slice(0,4)+'U'+wrongCenter.F.slice(5);
 assert(C.inspectMove(before,'R',wrongCenter).status==='orientation','Wrong center requests correct orientation');
 assert(C.inspectMove(before,'R',{F:'bad'}).status==='invalid','Malformed observation rejected');
 assert(C.inspectMove(before,'R',{X:'FFFFFFFFF'}).status==='invalid','Unknown face rejected');
 const other=Cube.fromString(before).move('F U L2').asString();
 assert(C.inspectMove(before,'R',observations(other)).status==='mismatch','Multi-turn divergence requests review instead of inventing a repair');
 const solved=new Cube().asString();
 assert(C.inspectMove(solved,'R',{R:'RRRRRRRRR'}).status==='ambiguous','Solid turning face alone cannot distinguish rotation');
 let rotation='URFDLBURF'.split('');const original=rotation.join('');for(let i=0;i<4;i++)rotation=C.rotateFace(rotation);
 assert(rotation.join('')===original,'Four review rotations restore sticker order');

 const shapes=['line','elbow','dot','cross'];
 for(let i=0;i<C.CHALLENGES.length;i++){
  const challenge=C.CHALLENGES[i],state=C.challengeState(challenge);
  assert(CubeClubCore.validate(state).ok,`${challenge.id}: legal cube state`);
  assert(challenge.answer>=0&&challenge.answer<challenge.choices.length,`${challenge.id}: valid answer`);
  if(i<4)assert(C.topPattern(state)===shapes[i],`${challenge.id}: illustration actually shows intended shape`);
  if(challenge.kind==='edge')assert(state[19]==='F'&&state[7]===(challenge.id==='edge-right'?'R':'L'),`${challenge.id}: highlighted edge matches target slot`);
  if(challenge.kind==='corner')assert([state[8],state[9],state[20]].sort().join('')==='DFR',`${challenge.id}: actual highlighted corner has advertised colors`);
 }
 for(const id of ['right','left','yellow']){
  let round=C.makeTeamRound(id);
  const cube=new Cube().move(Cube.inverse(round.algorithm.join(' ')));
  const initial=JSON.stringify(round);
  assert(JSON.stringify(C.teamTransition(round,'discussed'))===initial,`${id}: cannot skip prediction`);
  assert(JSON.stringify(C.teamTransition(round,'turn',round.algorithm[0]))===initial,`${id}: cannot turn before reveal`);
  for(let i=0;i<round.algorithm.length;i++){
   assert(C.teamRoles(i).caller===(i%2===0?'Young cuber':'Grown-up'),`${id}: roles alternate`);
   round=C.teamTransition(round,'reveal');
   const wrong=C.TURN_NAMES.find(m=>m!==round.algorithm[i]);
   assert(C.teamTransition(round,'turn',wrong).phase==='turn',`${id}: wrong move does not advance`);
   const next=C.teamTransition(round,'turn',round.algorithm[i]);
   assert(round.phase==='turn'&&next.phase==='notice',`${id}: transition does not mutate original`);
   cube.move(round.algorithm[i]);round=next;
   assert(round.index===i,`${id}: waits for discussion before moving on`);
   round=C.teamTransition(round,'discussed');
   assert(round.index===i+1,`${id}: discussion advances one step`);
  }
  assert(round.finished&&cube.isSolved(),`${id}: completed shared round solves its setup`);
  assert(JSON.stringify(C.teamTransition(round,'discussed'))===JSON.stringify(round),`${id}: repeated completion is inert`);
 }
 const swapped=C.teamTransition(C.makeTeamRound('right'),'swap');
 assert(C.teamRoles(0,swapped.childFirst).caller==='Grown-up','Swapping callers updates the first role');
 const patch=(r,g,b)=>new Uint8ClampedArray(Array.from({length:25},()=>[r,g,b,255]).flat());
 for(const [rgb,expectedColor]of [[[250,250,240],'D'],[[240,200,40],'U'],[[220,40,30],'L'],[[240,115,30],'R'],[[40,160,90],'F'],[[40,95,200],'B']])assert(C.samplePatch(patch(...rgb)).color===expectedColor,`Uniform ${expectedColor} patch classified`);
 assert(C.samplePatch(patch(20,10,10)).color==='?','Dark patch remains unknown');
 assert(C.samplePatch(new Uint8ClampedArray([255,255,255,255,0,0,0,255])).color==='?','Uneven patch remains unknown');
 assert(C.samplePatch(patch(250,50,0)).color==='?','Boundary hue remains unknown');
 const legacy=normalizeProgress({completed:['right'],moves:8});
 assert(legacy.completed[0]==='right'&&legacy.detective.length===0&&legacy.teamRounds===0&&legacy.moveChecks===0,'Existing progress migrates without losing lessons');
 const corrupt=normalizeProgress({detective:['yellow-line','yellow-line','oops'],teamRounds:-2,moveChecks:Infinity});
 assert(corrupt.detective.length===1&&corrupt.teamRounds===0&&corrupt.moveChecks===0,'New progress fields reject corrupt values');
 return `${passed} new checks passed: move observation and repairs, uncertainty, seven real cube cases, shared-round transitions, camera samples, and progress migration.`;
})();
