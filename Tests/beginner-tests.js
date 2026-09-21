(function(){
 let checks=0;const ok=(v,m)=>{checks++;if(!v)throw Error('Beginner: '+m);},B=CubeClubBeginner,C=CubeClubCore;
 function verify(c,label){
  const original=c.asString(),p=B.plan(original);ok(!p.error,label+': '+p.error);ok(c.asString()===original,'planner does not change its input');
  ok(p.method==='beginner'&&p.stages.length===8,'explicit beginner method and eight milestones');
  const running=c.clone();let index=0;
  for(const ch of p.chunks){ok(ch.start===index&&ch.before===running.asString(),'chunk begins at the actual prior state');ok(C.moves(ch.algorithm).every(m=>/^[URFDLB](2|')?$/.test(m)),'supported face notation only');running.move(ch.algorithm);index+=C.moves(ch.algorithm).length;ok(ch.end===index&&ch.after===running.asString(),'chunk endpoint matches moves');}
  for(const stage of p.stages){const at=c.clone().move(C.moves(p.algorithm).slice(0,stage.end).join(' '));ok(at.asString()===stage.state,'milestone exact state '+stage.id);ok(stage.skipped||B.reached(at,stage.id),'milestone objective '+stage.id);}
  ok(running.isSolved()&&c.clone().move(p.algorithm).isSolved(),'complete plan solves '+label);
  ok(!B.reached(c,'cross')||p.chunks.every(ch=>ch.stage!=='cross'&&ch.stage!=='daisy'),'finished cross is never rebuilt');
  return p;
 }
 let seed=73619;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 for(let sample=0;sample<120;sample++){let alg=[],last='';for(let i=0;i<25;i++){const faces=C.FACES.filter(f=>f!==last);last=faces[rand(faces.length)];alg.push(last+['',"'",'2'][rand(3)]);}verify(new Cube().move(alg.join(' ')),'scramble '+sample);}
 // All 27 legal twist patterns with the corners already in their homes.
 // This catches premature stopping when a different corner temporarily occupies the working spot.
 for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let d=0;d<3;d++){const c=new Cube();c.co=[a,b,d,(9-a-b-d)%3,0,0,0,0];verify(c,'corner orientations '+a+b+d);}
 const permutations=[];function perm(a,left){if(!left.length){permutations.push(a);return;}for(const n of left)perm([...a,n],left.filter(x=>x!==n));}perm([],[0,1,2,3]);
 for(const cp of permutations){const c=new Cube();c.cp=[...cp,4,5,6,7];if(C.parity(cp))[c.ep[0],c.ep[1]]=[c.ep[1],c.ep[0]];verify(c,'corner homes '+cp);}
 for(const ep of permutations.filter(p=>C.parity(p)===0)){const c=new Cube();c.ep=[...ep,4,5,6,7,8,9,10,11];verify(c,'last edges '+ep);}
 ok(B.plan('bad').error,'rejects invalid facelets');const bad=new Cube();bad.co[0]=1;ok(B.plan(bad.asString()).error,'rejects a physically twisted corner');
 for(const l of CubeClubBeginnerLessons){const c=C.lessonInitial(l);ok(C.validate(c.asString()).ok,l.id+' setup legal');ok(!C.lessonComplete(l,c),l.id+' starts unfinished');ok(C.lessonComplete(l,c.move(l.algorithm)),l.id+' reaches teaching goal');}
 const daisy=C.LESSONS.find(l=>l.id==='daisy');ok(B.petals(C.lessonInitial(daisy)).length===3,'daisy lesson starts with three petals');
 const corner=C.lessonInitial(C.LESSONS.find(l=>l.id==='white-corners'));ok(B.reached(corner,'cross')&&corner.cp[0]===4&&corner.co[0]===0,'white-up corner lesson matches the pictured case');
 const left=C.lessonInitial(C.LESSONS.find(l=>l.id==='middle-left'));ok(B.reached(left,'white-corners'),'left insertion starts with white layer intact');
 const finish=C.lessonInitial(C.LESSONS.find(l=>l.id==='finish-corners'));ok(B.reached(finish,'corners')&&!B.reached(finish,'orient'),'corner finishing starts with correct homes and lower layers');
 const old=C.normalizeProgress({completed:['hello','cross','sune'],quest:{graduated:['beginner'],independentSolve:true,records:{cross:{practiced:true,understood:true,independent:true}}}});
 ok(CubeClubQuest.unlocked(old,'intermediate')&&CubeClubQuest.mastered(old,'cross')&&CubeClubQuest.canOpen(old,'daisy'),'earned graduation and mastery survive the expanded lessons');
 return checks+' beginner teaching checks passed: 120 scrambles, all corner twists and positions, all final edge cycles, milestone invariants, lesson setups and progress preservation.';
})();
