(function(){
 let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);},D=CubeClubContinuity,C=CubeClubCore,Q=CubeClubQuest;
 const copy=x=>JSON.parse(JSON.stringify(x)),p=C.normalizeProgress({quest:{grants:['speed']}});
 assert(p.calibration===null&&!p.savedSessions.lesson&&!p.savedSessions.solve,'Legacy progress migrates without lost milestones');
 for(const l of C.LESSONS){for(const mode of ['guide','recall','check']){
  const progress=C.normalizeProgress({completed:[l.id],quest:{grants:['speed'],records:{[l.id]:{practiced:true,understood:true}}}});
  const s={type:'lesson',lesson:l,initial:C.lessonInitial(l),algorithm:C.moves(l.algorithm),index:Math.min(2,C.moves(l.algorithm).length),mode,attempt:{assisted:true}};
  const saved=D.capture(s,progress,1000),result=D.restore(saved,progress),index=mode==='check'?0:s.index;
  assert(!result.error&&result.session.index===index,'Restores '+l.id+' '+mode);
  assert(result.session.cube.asString()===s.initial.clone().move(s.algorithm.slice(0,index).join(' ')).asString(),'Exact reconstructed lesson state');
  assert(result.session.attempt.turns===index&&result.session.attempt.assisted===(mode!=='check'),'Preserve hint history; independent check restarts');
  progress.savedSessions.lesson=saved;const backup=D.decode(D.encode(progress,1000));assert(!backup.error&&backup.progress.savedSessions.lesson.index===s.index,'Lesson backup round trip');
 }}
 const state=new Cube().move("R U F2 L' D B R2 U' F D2").asString(),plan=CubeClubBeginner.plan(state),algorithm=C.moves(plan.algorithm);
 for(const index of [0,1,Math.floor(algorithm.length/2),algorithm.length]){
  const s={type:'solve',initial:Cube.fromString(state),algorithm,index,teaching:plan,checkpoints:new Set(plan.stages.filter(x=>!x.skipped&&x.end<index).map(x=>x.id))};
  const saved=D.capture(s,p,1000),res=D.restore(saved,p);assert(!res.error&&res.session.cube.asString()===s.initial.clone().move(algorithm.slice(0,index).join(' ')).asString(),'Beginner exact state at '+index);
  assert(res.session.checkpoints.size===s.checkpoints.size,'Retains only checked milestones');
  p.savedSessions.solve=saved;assert(!D.decode(D.encode(p,1000)).error,'Beginner backup round trip');
 }
 const bad=copy(p.savedSessions.solve);bad.checkpoints=[];assert(D.restore(bad,p).error,'Cannot skip required teaching milestones');
 const general={version:1,type:'solve',initial:new Cube().move('R U').asString(),algorithm:"U' R'",index:1,method:'general',checkpoints:[],updatedAt:1000};
 const restored=D.restore(general,p);assert(!restored.error&&restored.session.cube.asString()===new Cube().move('R').asString(),'General save restored without solving again');
 p.savedSessions.solve=general;p.savedSessions.lesson=null;
 const raw=D.encode(p,1000);assert(!D.decode(raw).error,'Valid backup accepted');
 for(const mutate of [x=>x.version=9,x=>x.format='other',x=>x.createdAt='yesterday',x=>delete x.progress.quest,x=>x.progress.moves=-1,x=>x.progress.preferences.appearance='<script>',x=>x.progress.savedSessions.solve.algorithm='R2',x=>x.progress.savedSessions.solve.index=900,x=>x.progress.savedSessions.solve.initial='?'.repeat(54),x=>x.progress.savedSessions.solve.checkpoints=['edges'],x=>x.progress.extra='unsupported']){const d=JSON.parse(raw);mutate(d);assert(D.decode(JSON.stringify(d)).error,'Reject malformed backup');}
 assert(D.decode('{').error&&D.decode('a'.repeat(D.MAX_BYTES+1)).error,'Reject corrupt and oversized files');
 assert(D.decode(JSON.stringify({format:'club.cube.backup',version:1,createdAt:1000,progress:p,extra:'é'.repeat(140000)})).error,'Enforce byte limit for Unicode too');
 const initial=C.normalizeProgress({completed:['hello'],quest:{times:[{ms:5000,at:1000,reflection:'cross'}]}});const before=JSON.stringify(initial);D.decode('{');assert(JSON.stringify(initial)===before,'Decode cannot mutate current progress');
 const colors={U:[250,205,50],R:[245,130,45],F:[50,165,100],D:[235,235,230],L:[205,35,40],B:[35,95,205]};
 p.calibration={colors,updatedAt:1000};assert(Object.keys(D.decode(D.encode(p,1000)).progress.calibration.colors).length===6,'All calibration samples travel in backup');
 assert(CubeClubVision.profileReady(p.calibration.colors),'Restored calibration usable by actual classifier');
 for(const f of C.FACES)assert(CubeClubVision.classify({rgb:colors[f],spread:0,clipped:0},p.calibration.colors).color===f,'Saved color recognizes '+f);
 const partial=C.normalizeProgress({calibration:{colors:{F:colors.F},updatedAt:1000}});assert(Object.keys(partial.calibration.colors).length===1&&!CubeClubVision.profileReady(partial.calibration.colors),'Partial calibration can resume teaching');
 const reset=C.resetLearningProgress(p);assert(reset.calibration&&reset.calibration.colors.F[1]===165&&!reset.savedSessions.solve,'Learning reset retains calibration and clears saved solve');
 for(const rgb of [[-1,0,0],[256,0,0],[1,2],['red',0,0],[NaN,0,0]])assert(!D.calibration({colors:{F:rgb},updatedAt:1000}),'Reject malformed saved sample');
 assert(!D.capture({...restored.session,credited:true},p),'Finished solve removed from saved places');
 const locked={version:1,type:'lesson',lessonID:'pll-t',algorithm:C.LESSONS.find(l=>l.id==='pll-t').algorithm,index:1,mode:'guide',assisted:false,updatedAt:1000};assert(D.restore(locked,C.normalizeProgress({})).error,'Resume cannot bypass progression locks');
 const payload=JSON.parse(D.encode(p,1000));payload.progress.calibration.colors.F=[1,2,3,4];assert(D.decode(JSON.stringify(payload)).error,'Invalid calibration blocks restore');
 return checks+' continuity model checks passed: exact cube states, all lesson modes, migration, milestone gates, calibration, reset and strict backup validation.';
})();
