(function(){
  const {FACES,LESSONS,validate,sampleColor,normalizeProgress}=CubeClubCore;
  let passed=0;
  function assert(condition,message){if(!condition)throw new Error(message);passed++;}
  const solved=new Cube().asString();
  assert(validate(solved).ok,'Solved state is valid');
  for(const f of FACES){assert(new Cube().move(`${f} ${f} ${f} ${f}`).isSolved(),`${f} four turns restore cube`);assert(new Cube().move(`${f} ${f}'`).isSolved(),`${f} inverse restores cube`);}
  // Cross-check the visual geometry against the cubie engine for all 18 moves.
  function near(a,b){return a.every((v,i)=>Math.abs(v-b[i])<.001);}
  for(const f of FACES)for(const suffix of ['',"'",'2']){
    const normal=CubeGeometry.BASES[f].n,axis=normal.findIndex(x=>x!==0),sign=normal[axis],amount=suffix==='2'?2:suffix==="'"?-1:1,after=new Cube().move(f+suffix).asString();
    for(let source=0;source<54;source++){
      const g=CubeGeometry.faceletGeometry(source);let center=g.center,n=g.normal;
      if(center[axis]*sign>.9){center=CubeGeometry.rotate(center,axis,-sign*amount*Math.PI/2);n=CubeGeometry.rotate(n,axis,-sign*amount*Math.PI/2);}
      const dest=Array.from({length:54},(_,i)=>i).find(i=>{const d=CubeGeometry.faceletGeometry(i);return near(center,d.center)&&near(n,d.normal);});
      assert(dest!==undefined&&after[dest]===solved[source],`Animation matches ${f+suffix}, sticker ${source}`);
    }
  }
  for(const l of LESSONS){const cube=new Cube().move(Cube.inverse(l.algorithm));assert(validate(cube.asString()).ok,`${l.id} starts legal`);assert(cube.move(l.algorithm).isSolved(),`${l.id} demonstration completes`);assert(l.correct>=0&&l.correct<l.answers.length,`${l.id} valid quiz`);}
  const daisy=new Cube().move(Cube.inverse(LESSONS.find(l=>l.id==='cross').algorithm)).asString();assert([1,3,5,7].every(i=>daisy[i]==='D'),'Daisy lesson starts with white petals');
  const fish=new Cube().move(Cube.inverse(LESSONS.find(l=>l.id==='sune').algorithm)).asString();assert(fish[6]==='U'&&fish[20]==='U','Sune setup has yellow UFL and yellow on front of UFR');
  const middle=new Cube().move(Cube.inverse(LESSONS.find(l=>l.id==='middle').algorithm)).asString();assert(middle[19]==='F'&&middle[7]==='R','Right insert has matching front sticker and right color on top');
  assert(middle.slice(27,36)==='DDDDDDDDD','Middle lesson preserves white layer');
  assert(!validate('bad').ok,'Reject short input');
  assert(!validate('U'.repeat(54)).ok,'Reject bad color count');
  let invalid=solved.split('');[invalid[5],invalid[10]]=[invalid[10],invalid[5]];assert(!validate(invalid.join('')).ok,'Reject flipped edge');
  invalid=solved.split('');[invalid[8],invalid[9],invalid[20]]=[invalid[20],invalid[8],invalid[9]];assert(!validate(invalid.join('')).ok,'Reject twisted corner');
  const swapped=new Cube();[swapped.ep[0],swapped.ep[1]]=[swapped.ep[1],swapped.ep[0]];assert(!validate(swapped.asString()).ok,'Reject odd edge swap');
  invalid=solved.split('');[invalid[4],invalid[13]]=[invalid[13],invalid[4]];assert(!validate(invalid.join('')).ok,'Reject bad centers');
  assert(sampleColor(250,250,240)==='D','Classify white');assert(sampleColor(240,200,40)==='U','Classify yellow');assert(sampleColor(220,40,30)==='L','Classify red');assert(sampleColor(240,115,30)==='R','Classify orange');assert(sampleColor(40,160,90)==='F','Classify green');assert(sampleColor(40,95,200)==='B','Classify blue');
  const p=normalizeProgress({completed:['hello','hello','unknown'],moves:-4,quiz:['bad'],solves:'bad'});assert(p.completed.length===1&&p.moves===0&&p.solves===0&&p.quiz.length===0,'Stored progress is sanitized');
  assert(solveCubeRequest(solved).algorithm==='','Solved state returns no moves');
  assert(!!solveCubeRequest('U'.repeat(54)).error,'Solver rejects invalid scan before searching');
  // Seeded scrambles exercise independent states reproducibly.
  let seed=72821;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let trial=0;trial<20;trial++){
    const alg=Array.from({length:25},()=>FACES[Math.floor(random()*6)]+['',"'",'2'][Math.floor(random()*3)]).join(' '),cube=new Cube().move(alg);
    assert(validate(cube.asString()).ok,`Scramble ${trial} validates`);
    const result=solveCubeRequest(cube.asString());assert(!result.error&&cube.move(result.algorithm).isSolved(),`Scramble ${trial} solves exactly`);
  }
  return `${passed} checks passed: cube geometry, lesson setups, impossible states, color classification, progress, and 20 complete solves.`;
})();
