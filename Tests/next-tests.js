(function(){
 'use strict';
 const N=CubeClubNext,{LESSONS,moves,normalizeProgress,validate}=CubeClubCore;
 let checks=0;const assert=(value,message)=>{if(!value)throw Error(message);checks++;};
 const initial=id=>new Cube().move(Cube.inverse(N.LESSONS.find(l=>l.id===id).algorithm));
 assert(LESSONS.filter(l=>!l.questStage).length===15&&N.LESSONS.length===6,'Nine beginner lessons and six next-step lessons');
 assert(new Set(LESSONS.map(l=>l.id)).size===LESSONS.length,'Stable unique lesson IDs');
 // Check the advertised starting locations and sticker orientation independently
 // of the UI's matching/diagram helpers.
 let s=initial('cross-direct').asString();assert(s[7]==='D'&&s[19]==='F','Direct cross edge is white-up and green-front');
 s=initial('cross-align').asString();assert(s[5]==='D'&&s[10]==='F','Cross alignment starts above the orange center');
 s=initial('cross-align').move('U').asString();assert(s[7]==='D'&&s[19]==='F','U actually aligns green with green');
 s=initial('cross-sideways').asString();assert(s[7]==='R'&&s[19]==='D','Sideways case is orange-up, white-front');
 s=initial('f2l-right').asString();assert(s[6]==='F'&&s[18]==='R'&&s[38]==='D'&&s[7]==='F'&&s[19]==='R','Right pair has shared colors lined up at UFL/UF');
 s=initial('f2l-left').asString();assert(s[8]==='F'&&s[20]==='L'&&s[9]==='D'&&s[7]==='F'&&s[19]==='L','Left pair has shared colors lined up at UFR/UF');
 s=initial('f2l-build').asString();assert(s[8]==='D'&&s[9]==='F'&&s[20]==='R'&&s[5]==='F'&&s[10]==='R','Pair-building case is white-up with mismatched neighbors');
 for(const l of N.LESSONS){
  assert(['tag','title','goal','when','hint','why'].every(k=>typeof l[k]==='string'&&l[k].length>0),`${l.id}: complete teaching content`);
  let cube=initial(l.id);const crossStart=N.crossCount(cube),target=l.id==='f2l-left'?'FL':'FR';
  assert(validate(cube.asString()).ok,`${l.id}: physical legal setup`);
  assert(l.steps.length===moves(l.algorithm).length,`${l.id}: an explanation for every move`);
  assert(crossStart===(l.skill==='pair'?4:3),`${l.id}: advertised cross starting state`);
  if(l.skill==='pair')for(const slot of ['FR','FL','BL','BR'].filter(p=>p!==target))assert(N.slotSolved(cube,slot),`${l.id}: other slot ${slot} starts finished`);
  for(let turn=0;turn<=moves(l.algorithm).length;turn++){
   const state=cube.asString(),indices=N.pieceIndices(state,l.focusPieces);
   assert(new Set(indices).size===l.focusPieces.reduce((n,p)=>n+p.length,0),`${l.id}/${turn}: all target stickers tracked`);
   for(const colors of l.focusPieces){const p=N.piece(state,colors);assert(p&&p.indices.map(i=>state[i]).sort().join('')===[...colors].sort().join(''),`${l.id}/${turn}: correct physical piece`);}
   if(turn<moves(l.algorithm).length)cube.move(moves(l.algorithm)[turn]);
  }
  assert(N.crossCount(cube)===4,`${l.id}: cross restored at end`);
  if(l.skill==='pair')for(const slot of ['FR','FL','BL','BR'])assert(N.slotSolved(cube,slot),`${l.id}: all first-two-layer slots restored`);
 }
 for(const id of ['f2l-right','f2l-left']){
  const l=N.LESSONS.find(l=>l.id===id),cube=initial(id);
  assert(N.paired(cube.asString(),...l.focusPieces),`${id}: genuine matching pair`);
  for(const move of moves(l.algorithm)){cube.move(move);assert(N.paired(cube.asString(),...l.focusPieces),`${id}: insertion never splits the pair`);}
 }
 const building=initial('f2l-build');assert(!N.paired(building.asString(),'DFR','FR'),'Adjacent mismatched pieces are not called a pair');
 building.move("R U2 R' U' R");assert(N.paired(building.asString(),'DFR','FR'),'Pair really forms at the advertised fifth move');
 const side=initial('cross-sideways');side.move("F R'");assert(side.ep[4]===4&&side.eo[4]===0,'White-orange is home after the second move');assert(!(side.ep[5]===5&&side.eo[5]===0),'Front edge needs the promised restoration');side.move("F'");assert(N.crossCount(side)===4,'Final undo restores the front edge');
 for(const c of N.CASES){
  const state=N.caseState(c);assert(validate(state).ok,`${c.id}: legal practice state`);assert(c.answer>=0&&c.answer<c.choices.length,`${c.id}: valid choice`);
  if(!c.setup){const l=N.LESSONS.find(l=>l.id===c.lessonID);assert(Cube.fromString(state).move(l.algorithm).isSolved(),`${c.id}: watch button uses the same setup`);}
 }
 const unfinished=Cube.fromString(N.caseState(N.CASES.find(c=>c.id==='cross-first')));
 assert(N.crossCount(unfinished)<4,'Cross-first case actually has an unfinished cross');
 let p=normalizeProgress({completed:['right','cross-direct'],quiz:['f2l-right'],moves:17,learningLevel:'next',patternPractice:{'pair-ready':{correct:1,misses:0},bad:{correct:3}}});
 assert(p.completed.join(',')==='right,cross-direct'&&p.quiz[0]==='f2l-right'&&p.moves===17,'New curriculum preserves saved learning');
 assert(p.learningLevel==='next'&&Object.keys(p.patternPractice).join()==='pair-ready','Saved path and practice are sanitized');
 const legacy=normalizeProgress({completed:['hello']});assert(legacy.learningLevel==='beginner'&&Object.keys(legacy.patternPractice).length===0,'Existing learners keep their beginner path');
 const corrupt=normalizeProgress({patternPractice:{'pair-ready':{correct:Infinity,misses:-5,needsReview:'yes'}},learningLevel:'bad'});assert(corrupt.patternPractice['pair-ready'].correct===0&&corrupt.patternPractice['pair-ready'].misses===0&&!corrupt.patternPractice['pair-ready'].needsReview&&corrupt.learningLevel==='beginner','Corrupt progress cannot unlock fake practice results');
 let practice=N.recordAnswer({},'pair-not-ready',false);assert(practice['pair-not-ready'].needsReview&&N.reviewOrder(practice)[0].id==='pair-not-ready','A mistake gets priority for review');
 practice=N.recordAnswer(practice,'pair-not-ready',true);assert(!practice['pair-not-ready'].needsReview&&practice['pair-not-ready'].correct===1&&practice['pair-not-ready'].misses===1,'A corrected answer records discovery and keeps attempt history');
 const correctedAfterHint=N.recordAnswer(practice,'pair-not-ready',true,true);assert(correctedAfterHint['pair-not-ready'].needsReview,'A case needing another guess remains in the next review');
 assert(N.reviewOrder(practice)[0].id!=='pair-not-ready','Unseen cases precede already practiced ones');
 assert(JSON.stringify(N.recordAnswer(practice,'unknown',true))===JSON.stringify(practice),'Unknown case cannot change progress');
 return `${checks} next-step checks passed: teaching states, tracked pieces, pair geometry, cross/slot preservation, case plans and progress migration.`;
})();
