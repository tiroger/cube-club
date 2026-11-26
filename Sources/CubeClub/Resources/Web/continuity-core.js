/* Versioned, bounded local data. A saved cube is reconstructed, never trusted. */
(function(root){
 'use strict';
 const C=CubeClubCore, MAX_BYTES=262144;
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const timestamp=x=>Number.isSafeInteger(x)&&x>0&&x<=8640000000000000;
 const algorithm=x=>typeof x==='string'&&x.length<=2400&&x.split(' ').length<=600&&x.split(' ').every(m=>/^[URFDLB](?:2|')?$/.test(m));
 function calibration(input){
  if(!object(input)||!object(input.colors)||!timestamp(input.updatedAt))return null;
  const colors={};
  for(const f of C.FACES){if(input.colors[f]!==undefined){const rgb=input.colors[f];if(!Array.isArray(rgb)||rgb.length!==3||!rgb.every(n=>Number.isFinite(n)&&n>=0&&n<=255))return null;colors[f]=rgb.slice();}}
  if(!Object.keys(colors).length)return null;
  return {colors,updatedAt:input.updatedAt};
 }
 function checkpoint(input,type){
  if(!object(input)||input.version!==1||input.type!==type||!timestamp(input.updatedAt)||!Number.isSafeInteger(input.index)||input.index<0)return null;
  if(type==='lesson'){
   const lesson=C.LESSONS.find(l=>l.id===input.lessonID);
   if(!lesson||input.algorithm!==lesson.algorithm||input.index>C.moves(lesson.algorithm).length||!['guide','recall','check'].includes(input.mode)||typeof input.assisted!=='boolean')return null;
   return {version:1,type,lessonID:lesson.id,algorithm:lesson.algorithm,index:input.index,mode:input.mode,assisted:input.assisted,updatedAt:input.updatedAt};
  }
  if(!['beginner','general'].includes(input.method)||!algorithm(input.algorithm)||input.index>C.moves(input.algorithm).length||!C.validate(input.initial).ok)return null;
  const cube=Cube.fromString(input.initial);
  if(cube.isSolved()||!cube.move(input.algorithm).isSolved())return null;
  if(!Array.isArray(input.checkpoints)||input.checkpoints.length>8||input.checkpoints.some(id=>!CubeClubBeginner.STAGES.some(s=>s.id===id))||new Set(input.checkpoints).size!==input.checkpoints.length)return null;
  if(input.method==='general'&&input.checkpoints.length)return null;
  return {version:1,type,initial:input.initial,algorithm:input.algorithm,index:input.index,method:input.method,checkpoints:input.checkpoints.slice(),updatedAt:input.updatedAt};
 }
 function normalize(input){return {lesson:checkpoint(input?.lesson,'lesson'),solve:checkpoint(input?.solve,'solve')};}
 function capture(s,p,at=Date.now()){
  if(!s||!['lesson','solve'].includes(s.type))return null;
  if(s.type==='lesson'){
   if(!CubeClubQuest.canOpen(p,s.lesson.id))return null;
   if(s.index===s.algorithm.length&&CubeClubQuest.mastered(p,s.lesson.id))return null;
   return {version:1,type:'lesson',lessonID:s.lesson.id,algorithm:s.lesson.algorithm,index:s.index,mode:s.mode,assisted:s.attempt.assisted===true,updatedAt:at};
  }
  if(s.credited)return null;
  return {version:1,type:'solve',initial:s.initial.asString(),algorithm:s.algorithm.join(' '),index:s.index,method:s.teaching?'beginner':'general',checkpoints:[...(s.checkpoints||[])],updatedAt:at};
 }
 function restore(input,p){
  const saved=checkpoint(input,input?.type);if(!saved)return {error:'This saved place could not be read. Start a fresh lesson or scan.'};
  if(saved.type==='lesson'){
   const lesson=C.LESSONS.find(l=>l.id===saved.lessonID),state=CubeClubQuest.state(p,lesson.id);
   if(!CubeClubQuest.canOpen(p,lesson.id)||saved.mode!=='guide'&&!state.learned||saved.mode==='check'&&(!state.practiced||!state.understood))return {error:'This lesson is locked. Continue along your learning path first.'};
   const index=saved.mode==='check'?0:saved.index,initial=C.lessonInitial(lesson),moves=C.moves(lesson.algorithm);
   return {session:{type:'lesson',lesson,initial,cube:initial.clone().move(moves.slice(0,index).join(' ')),algorithm:moves,index,mode:saved.mode,attempt:{turns:index,assisted:saved.mode==='check'?false:saved.assisted}},restarted:saved.mode==='check'};
  }
  // Rebuild teaching text and stage boundaries from trusted bundled content.
  // Never import arbitrary instructions, HTML, or a plan from a backup file.
  const teaching=saved.method==='beginner'?CubeClubBeginner.plan(saved.initial):null;
  if(teaching&&(teaching.error||teaching.algorithm!==saved.algorithm))return {error:'This teaching plan has changed. Scan your current cube to start a fresh guide.'};
  if(teaching){
   const required=teaching.stages.filter(s=>!s.skipped&&s.end<saved.index);
   if(required.some(s=>!saved.checkpoints.includes(s.id))||saved.checkpoints.some(id=>!teaching.stages.some(s=>s.id===id&&!s.skipped&&s.end<=saved.index)))return {error:'This saved guide has inconsistent milestones. Please scan your cube again.'};
  }
  const initial=Cube.fromString(saved.initial),moves=C.moves(saved.algorithm);
  return {session:{type:'solve',initial,cube:initial.clone().move(moves.slice(0,saved.index).join(' ')),algorithm:moves,index:saved.index,mode:'guide',teaching,checkpoints:new Set(saved.checkpoints),credited:false}};
 }
 const canonical=x=>Array.isArray(x)?x.map(canonical):object(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
 function encode(p,at=Date.now()){
  return JSON.stringify({format:'club.cube.backup',version:1,appVersion:'0.12.0',createdAt:at,progress:C.normalizeProgress(p)},null,2);
 }
 function decode(raw){
  if(typeof raw!=='string'||raw.length>MAX_BYTES)return {error:'Choose a Cube Club backup smaller than 256 KB.'};
  try{
   if(new TextEncoderFallback(raw).length>MAX_BYTES)return {error:'Choose a Cube Club backup smaller than 256 KB.'};
   const data=JSON.parse(raw);
   if(!object(data)||data.format!=='club.cube.backup')return {error:'This is not a Cube Club backup. Choose a file saved with “Save a backup”.'};
   if(data.version!==1)return {error:'This backup uses a different format. Update Cube Club before trying again.'};
   if(!timestamp(data.createdAt)||!object(data.progress))return {error:'This backup is incomplete. Your current progress has not changed.'};
   const normalized=C.normalizeProgress(data.progress);
   if(JSON.stringify(canonical(normalized))!==JSON.stringify(canonical(data.progress)))return {error:'This backup contains invalid or unsupported data. Your current progress has not changed.'};
   for(const saved of Object.values(normalized.savedSessions)){if(saved){const result=restore(saved,normalized);if(result.error)return {error:result.error+' Your current progress has not changed.'};}}
   return {progress:normalized,createdAt:data.createdAt};
  }catch(_){return {error:'This file is damaged or is not a readable backup. Your current progress has not changed.'};}
 }
 // JavaScriptCore model tests have no TextEncoder. Count UTF-8 without a DOM.
 function TextEncoderFallback(s){this.length=unescape(encodeURIComponent(s)).length;}
 root.CubeClubContinuity={MAX_BYTES,calibration,checkpoint,normalize,capture,restore,encode,decode};
})(globalThis);
