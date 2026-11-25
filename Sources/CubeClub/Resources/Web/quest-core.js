/* Progression is independent from exploration badges and guided-solve counts. */
(function(root){
 'use strict';
 const {LESSONS,moves}=CubeClubCore;
 const STAGES=[
  {id:'beginner',name:'Beginner',title:'First Solve',icon:'flower',color:'yellow',description:'Meet your cube, build the layers, and explain your first solve.',physical:'I watched my child solve a scrambled physical cube without the app’s move-by-move solver, and explain the main steps.'},
  {id:'intermediate',name:'Intermediate',title:'Piece Partners',icon:'team',color:'mint',description:'Plan a direct cross, build F2L pairs, and discover the jobs of the last layer.',physical:'I watched my child build a matching white cross, solve corner-edge pairs, and explain orientation versus permutation on a physical cube.'},
  {id:'advanced',name:'Advanced',title:'Clever Solutions',icon:'spark',color:'peach',description:'Reduce wasted F2L turns and begin a larger PLL toolkit with T and Y cases.',physical:'I watched my child recognize a ready pair, explain the difference between T and Y cases, and practice the matching plans on a physical cube.'},
  {id:'speed',name:'Speed Solver',title:'Smooth Moves',icon:'flag',color:'lavender',description:'Practice inspection, comfortable finger tricks, and looking ahead. Grow at your own pace.',physical:'I watched an untimed inspection, comfortable-turning and lookahead practice session. My child chose one thing to improve next.'},
  // An optional branch: it opens after its starting stage and leads nowhere else.
  {id:'roux',after:'beginner',name:'Roux',title:'Block Builders',icon:'layers',color:'sky',description:'An optional side path after First Solve. Build a block on each side, solve the top corners, then finish six edges with middle-slice turns.',physical:'I watched my child build both 1×2×3 side blocks on a scrambled physical cube and explain which turns keep the first block safe.'}
 ];
 function stageFor(id){const l=LESSONS.find(l=>l.id===id);return l?(l.questStage||(l.level==='next'?'intermediate':'beginner')):null;}
 function lessonsFor(id){return LESSONS.filter(l=>stageFor(l.id)===id);}
 // MAIN is the ordered path. A branch names the stage it starts from in after.
 const MAIN=STAGES.filter(s=>!s.after), stageInfo=id=>STAGES.find(s=>s.id===id);
 // The stage that must be graduated first: the previous main stage, or a branch's starting stage.
 function before(id){const s=stageInfo(id);if(!s)return null;return s.after?stageInfo(s.after):MAIN[MAIN.indexOf(s)-1]||null;}
 // The main-path stage that follows. Branches do not lead to another stage.
 function after(id){const s=stageInfo(id);return s&&!s.after?MAIN[MAIN.indexOf(s)+1]||null:null;}
 function branchesFrom(id){return STAGES.filter(s=>s.after===id);}
 const validStage=id=>STAGES.some(s=>s.id===id),list=x=>Array.isArray(x)?[...new Set(x.filter(validStage))]:[];
 function normalize(input){
  const q=input&&typeof input==='object'?input:{},records={};
  for(const l of LESSONS){const r=q.records?.[l.id];if(r&&typeof r==='object')records[l.id]={practiced:r.practiced===true,understood:r.understood===true,independent:r.independent===true};}
  const times=Array.isArray(q.times)?q.times.filter(t=>t&&Number.isFinite(t.ms)&&t.ms>=1000&&t.ms<=86400000&&Number.isFinite(t.at)&&t.at>0).slice(-50).map(t=>({ms:Math.round(t.ms),at:Math.round(t.at),reflection:['cross','pairs','last-layer','steady'].includes(t.reflection)?t.reflection:'steady'})):[];
  return {version:1,selected:validStage(q.selected)?q.selected:'beginner',records,graduated:list(q.graduated),challenges:list(q.challenges),grants:list(q.grants),independentSolve:q.independentSolve===true,times};
 }
 function state(p,id){const r=p.quest?.records?.[id]||{};return {learned:p.completed.includes(id),practiced:r.practiced===true,understood:r.understood===true,independent:r.independent===true};}
 function mastered(p,id){const s=state(p,id);return s.learned&&s.practiced&&s.understood&&s.independent;}
 // A main-path grant opens that stage and every earlier main stage. A branch opens only with its own grant.
 function granted(p,stage){const s=stageInfo(stage);if(!s)return false;if(s.after)return p.quest.grants.includes(stage);const i=MAIN.indexOf(s);return p.quest.grants.some(id=>MAIN.findIndex(m=>m.id===id)>=i);}
 function unlocked(p,stage){const s=stageInfo(stage);if(!s)return false;const prev=before(stage);return !prev||granted(p,stage)||p.quest.graduated.includes(stage)||p.quest.graduated.includes(prev.id);}
 function canOpen(p,id){const stage=stageFor(id),ls=lessonsFor(stage),i=ls.findIndex(l=>l.id===id);return i>=0&&unlocked(p,stage)&&(i===0||granted(p,stage)||mastered(p,id)||p.quest.graduated.includes(stage)||mastered(p,ls[i-1].id));}
 function lessonRequirement(p,id){const stage=stageFor(id),i=STAGES.findIndex(s=>s.id===stage),ls=lessonsFor(stage),n=ls.findIndex(l=>l.id===id);if(i<0)return 'Choose a lesson from Cube Quest.';if(!unlocked(p,stage))return `Graduate from ${before(stage).title} to open this stage.`;if(!canOpen(p,id))return `Master “${ls[n-1].title}” to open this lesson.`;return '';}
 function record(p,id){return p.quest.records[id]||(p.quest.records[id]={practiced:false,understood:false,independent:false});}
 function finishAttempt(p,id,attempt){
  if(!canOpen(p,id)||!attempt||attempt.complete!==true||attempt.solved!==true)return false;
  const l=LESSONS.find(l=>l.id===id),n=moves(l.algorithm).length;
  if(attempt.turns!==n)return false;
  if(attempt.mode==='guide'){if(!p.completed.includes(id))p.completed.push(id);return true;}
  if(!state(p,id).learned)return false;
  if(attempt.mode==='recall'){record(p,id).practiced=true;return true;}
  if(attempt.mode==='check'&&state(p,id).practiced&&state(p,id).understood&&attempt.assisted===false){record(p,id).independent=true;return true;}
  return false;
 }
 function answerConcept(p,id,answer){const l=LESSONS.find(l=>l.id===id);if(!l||!canOpen(p,id)||!state(p,id).learned||answer!==l.correct)return false;record(p,id).understood=true;if(!p.quiz.includes(id))p.quiz.push(id);return true;}
 function ready(p,id){return unlocked(p,id)&&lessonsFor(id).every(l=>mastered(p,l.id));}
 function finishChallenge(p,id,answers){const qs=QUESTIONS[id];if(!qs||!ready(p,id)||!Array.isArray(answers)||answers.length!==qs.length||!qs.every((q,i)=>answers[i]===q.answer))return false;if(!p.quest.challenges.includes(id))p.quest.challenges.push(id);return true;}
 function graduate(p,id){if(!ready(p,id)||!p.quest.challenges.includes(id))return false;if(!p.quest.graduated.includes(id))p.quest.graduated.push(id);if(id==='beginner')p.quest.independentSolve=true;return true;}
 function grant(p,id){if(!validStage(id))return false;if(!p.quest.grants.includes(id))p.quest.grants.push(id);return true;}
 function nextLesson(p){const open=s=>unlocked(p,s.id)&&!p.quest.graduated.includes(s.id);const s=STAGES.find(s=>s.id===p.quest.selected&&open(s))||MAIN.find(open)||MAIN[MAIN.length-1];return lessonsFor(s.id).find(l=>!mastered(p,l.id))||lessonsFor(s.id)[0];}
 function timerOpen(p){return p.quest.independentSolve;}
 function addTime(p,ms,at,reflection){if(!timerOpen(p)||!Number.isFinite(ms)||ms<1000||ms>86400000||!Number.isFinite(at)||at<=0)return false;p.quest.times=normalize({times:[...p.quest.times,{ms,at,reflection}]}).times;return true;}
 const QUESTIONS={
  beginner:[
   {prompt:'This yellow line is ready for the cross pattern. Which stickers tell you the shape?',lesson:'yellow',choices:['The top edges and center','Only the top corners','The bottom corners'],answer:0},
   {prompt:'A white cross is ready when…',choices:['Any four white stickers touch','Its edges are white-down and their side colors match the centers','The yellow corners face up'],answer:1},
   {prompt:'An edge for the middle layer should have…',choices:['Three colors','A yellow sticker','Two colors and no yellow'],answer:2}
  ],
  intermediate:[
   {prompt:'What makes these two pieces a ready pair?',lesson:'f2l-right',choices:['They are somewhere on top','They touch and both shared colors line up','White faces up'],answer:1},
   {prompt:'Before sending this white-green edge down, what should happen?',lesson:'cross-align',choices:['Line green up with its center','Break the finished cross','Twist any corner'],answer:0},
   {prompt:'Two-look OLL plus two-look PLL means…',choices:['Two turns total','Solving every case with Sune','Orient edges, orient corners, position corners, position edges'],answer:2}
  ],
  advanced:[
   {prompt:'The outlined pair is already matched. What avoids extra work?',lesson:'efficient-pair',choices:['Break it apart first','Add U then U′','Insert it directly with its matching plan'],answer:2},
   {prompt:'In this T case, which top corners need trading?',lesson:'pll-t',choices:['The two on the right, next to each other','A diagonal pair','All four corners need twisting'],answer:0},
   {prompt:'How do you choose a PLL algorithm when yellow already faces up?',choices:['Always use T','Inspect top-row stickers around the sides and match the case','Count the white stickers'],answer:1}
  ],
  speed:[
   {prompt:'Before starting this cross example, a useful plan is…',lesson:'speed-inspection',choices:['Turn randomly until it works','Picture U then F2 before turning','Try to beat someone else'],answer:1},
   {prompt:'When layers catch during finger practice, you should…',choices:['Force the next turn','Ignore alignment','Slow down, relax, and finish each turn'],answer:2},
   {prompt:'During a familiar pair insertion, lookahead means…',choices:['Noticing the next pair’s pieces','Watching only the current pair forever','Skipping inspection'],answer:0}
  ],
  roux:[
   {prompt:'Which pieces make the finished left block?',lesson:'roux-left-block',choices:['Any six red stickers','The red center with three edges and two corners that all match','The white cross'],answer:1},
   {prompt:'While you build the right block, which turns keep the left block safe?',choices:['L and D turns','Any turn at all','R, r, M and U turns'],answer:2},
   {prompt:'Three top edges point at one bottom edge. What fixes this arrow?',lesson:'roux-edge-arrow',choices:['M′ U M','R U R′ U′','A brand-new scramble'],answer:0}
  ]
 };
 root.CubeClubQuest={STAGES,MAIN,before,after,branchesFrom,QUESTIONS,normalize,state,mastered,stageFor,lessonsFor,granted,unlocked,canOpen,lessonRequirement,finishAttempt,answerConcept,ready,finishChallenge,graduate,grant,nextLesson,timerOpen,addTime};
})(globalThis);
