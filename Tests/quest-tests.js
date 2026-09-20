(function(){
 let n=0;function ok(test,message){n++;if(!test)throw new Error('Quest: '+message);}
 const Q=CubeClubQuest,C=CubeClubCore;
 const fresh=()=>C.normalizeProgress({});
 const attempt=(id,mode,assisted=false)=>({mode,complete:true,solved:true,turns:C.moves(C.LESSONS.find(l=>l.id===id).algorithm).length,assisted});
 function master(p,id){Q.finishAttempt(p,id,attempt(id,'guide'));Q.answerConcept(p,id,C.LESSONS.find(l=>l.id===id).correct);Q.finishAttempt(p,id,attempt(id,'recall',true));Q.finishAttempt(p,id,attempt(id,'check'));}
 let p=fresh();ok(Q.STAGES.length===4,'four usable stages');ok(Q.canOpen(p,'hello')&&!Q.canOpen(p,'cross'),'only first lesson initially opens');ok(!Q.unlocked(p,'intermediate')&&!Q.unlocked(p,'advanced')&&!Q.unlocked(p,'speed'),'later stages locked');ok(!Q.timerOpen(p),'timer starts locked');
 const migrated=C.normalizeProgress({completed:['hello','cross-direct'],quiz:['hello'],solves:7,moves:15,learningLevel:'next'});
 ok(migrated.completed.join(',')==='hello,cross-direct'&&migrated.quiz[0]==='hello'&&migrated.solves===7&&migrated.moves===15,'old exploration and badges survive');ok(!Q.mastered(migrated,'hello')&&!Q.unlocked(migrated,'intermediate')&&!Q.timerOpen(migrated),'legacy animations and guided solves do not award mastery or timing');
 ok(!Q.finishAttempt(p,'cross',attempt('cross','guide')),'locked lesson cannot credit progress');ok(!Q.finishAttempt(p,'hello',attempt('hello','check')),'independent check requires learning and practice');
 Q.finishAttempt(p,'hello',attempt('hello','guide'));ok(Q.state(p,'hello').learned&&!Q.mastered(p,'hello')&&!Q.canOpen(p,'cross'),'watching only explores');
 ok(!Q.answerConcept(p,'hello',2),'wrong explanation does not pass');Q.answerConcept(p,'hello',0);ok(Q.state(p,'hello').understood,'correct explanation persists');
 Q.finishAttempt(p,'hello',attempt('hello','recall',true));ok(Q.state(p,'hello').practiced&&!Q.mastered(p,'hello'),'hinted practice counts without mastery');
 for(const bad of [{...attempt('hello','check'),assisted:true},{...attempt('hello','check'),complete:false},{...attempt('hello','check'),solved:false},{...attempt('hello','check'),turns:3},{...attempt('hello','check'),mode:'unknown'}])ok(!Q.finishAttempt(p,'hello',bad),'incomplete or assisted independent attempts rejected');
 Q.finishAttempt(p,'hello',attempt('hello','check'));ok(Q.mastered(p,'hello')&&Q.canOpen(p,'cross'),'clean independent attempt unlocks next lesson');
 ok(!Q.graduate(p,'beginner')&&!Q.finishChallenge(p,'beginner',[0,1,2]),'stage checks cannot skip missing mastery');
 for(const stage of Q.STAGES){
  ok(Q.unlocked(p,stage.id),'stage unlocked after preceding graduation');
  for(const l of Q.lessonsFor(stage.id)){ok(Q.canOpen(p,l.id),l.id+' opens in order');master(p,l.id);ok(Q.mastered(p,l.id),l.id+' mastery recorded');}
  ok(Q.ready(p,stage.id),'all stage lessons ready');ok(!Q.graduate(p,stage.id),'real-cube confirmation cannot skip stage challenge');
  const answers=Q.QUESTIONS[stage.id].map(q=>q.answer);ok(!Q.finishChallenge(p,stage.id,answers.slice(1)),'short challenge rejected');ok(!Q.finishChallenge(p,stage.id,answers.map(i=>(i+1)%3)),'incorrect challenge rejected');ok(Q.finishChallenge(p,stage.id,answers),'independent challenge passes');ok(Q.graduate(p,stage.id),'graduation accepted after observed real-cube milestone');
  const reloaded=C.normalizeProgress(JSON.parse(JSON.stringify(p)));ok(reloaded.quest.graduated.includes(stage.id)&&Q.unlocked(reloaded,stage.id),'earned stages remain open after reload');
 }
 ok(Q.timerOpen(p),'first independent graduation opens timer');ok(p.quest.graduated.length===4,'all stages reachable without time thresholds');
 let override=fresh();Q.grant(override,'advanced');ok(Q.canOpen(override,'pll-y')&&Q.canOpen(override,'f2l-build')&&Q.canOpen(override,'edges'),'parent override opens through selected stage including lessons');ok(!Q.unlocked(override,'speed')&&!Q.mastered(override,'pll-y')&&!Q.timerOpen(override),'override does not award graduation mastery or independent solve');ok(!Q.grant(override,'bad'),'invalid override ignored');
 const corrupt=C.normalizeProgress({quest:{selected:'bad',grants:['evil'],graduated:[true],independentSolve:'true',records:{hello:{practiced:'yes',independent:1}},times:[{ms:Infinity,at:2},{ms:-8,at:2},{ms:1000,at:3,reflection:'<script>'}]}});
 ok(!Q.state(corrupt,'hello').practiced&&!Q.state(corrupt,'hello').independent&&!Q.timerOpen(corrupt)&&corrupt.quest.selected==='beginner','corrupt flags sanitized');ok(!Q.unlocked(corrupt,'advanced')&&corrupt.quest.times.length===1&&corrupt.quest.times[0].reflection==='steady','unknown grants and bad times rejected');
 ok(!Q.addTime(fresh(),5000,Date.now(),'cross'),'locked timer cannot save');ok(!Q.addTime(p,0,Date.now(),'pairs')&&!Q.addTime(p,Infinity,Date.now(),'pairs'),'invalid timing rejected');for(let i=0;i<60;i++)Q.addTime(p,12000+i,Date.now(),'pairs');ok(p.quest.times.length===50&&p.quest.times[0].ms===12010,'time history bounded and ordered');
 const ids=new Set();for(const stage of Q.STAGES){ok(Q.lessonsFor(stage.id).length>0,'every stage has lessons');for(const l of Q.lessonsFor(stage.id)){ok(!ids.has(l.id),'lesson belongs to one stage');ids.add(l.id);}}
 ok(ids.size===C.LESSONS.length,'every lesson assigned');
 for(const l of CubeClubQuestLessons){const cube=new Cube().move(Cube.inverse(l.algorithm));ok(C.validate(cube.asString()).ok,l.id+' valid setup');ok(C.moves(l.algorithm).every(m=>/^[URFDLB](2|')?$/.test(m)),l.id+' animation supports all notation');ok(!l.steps||l.steps.length===C.moves(l.algorithm).length,l.id+' instructions match turns');ok(cube.move(l.algorithm).isSolved(),l.id+' finishes exactly');}
 for(const id of ['pll-t','pll-y']){const l=C.LESSONS.find(l=>l.id===id),c=new Cube().move(Cube.inverse(l.algorithm));ok(c.co.every(v=>v===0)&&c.eo.every(v=>v===0),id+' starts fully oriented');ok([4,5,6,7].every(i=>c.cp[i]===i)&&[4,5,6,7,8,9,10,11].every(i=>c.ep[i]===i),id+' preserves first two layers');}
 const t=new Cube().move(Cube.inverse(C.LESSONS.find(l=>l.id==='pll-t').algorithm));ok(t.cp[0]===3&&t.cp[3]===0&&t.ep[0]===2&&t.ep[2]===0,'T teaching really swaps right corners and left/right edges');
 const y=new Cube().move(Cube.inverse(C.LESSONS.find(l=>l.id==='pll-y').algorithm));ok(y.cp[0]===2&&y.cp[2]===0,'Y teaching really swaps diagonal corners');
 const look=C.LESSONS.find(l=>l.id==='speed-lookahead'),cube=new Cube().move(Cube.inverse(look.algorithm));ok(!CubeClubNext.slotSolved(cube,'FR')&&!CubeClubNext.slotSolved(cube,'FL'),'lookahead begins with two unfinished front slots');ok(CubeClubNext.crossCount(cube)===4,'lookahead begins with complete cross');cube.move("R U' R'");ok(CubeClubNext.slotSolved(cube,'FR')&&!CubeClubNext.slotSolved(cube,'FL'),'first three moves finish only the right pair');ok(CubeClubNext.paired(cube.asString(),'DFL','FL'),'left pair ready after first insertion');
 for(const qs of Object.values(Q.QUESTIONS))for(const q of qs){ok(q.choices[q.answer]!==undefined,'stage question has valid answer');if(q.lesson)ok(C.LESSONS.some(l=>l.id===q.lesson),'stage visual references real lesson');}
 return n+' quest checks passed: migration, mastery, gates, graduation, overrides, timing, and teaching cases.';
})();
