(function(){
  'use strict';
  const V=CubeClubVision;
  let passed=0;
  function assert(value,message){if(!value)throw new Error(message);passed++;}
  const rgb={U:[245,215,30],R:[235,110,25],F:[25,160,65],D:[235,235,225],L:[210,35,45],B:[35,85,210]};
  const patch=color=>({rgb:rgb[color].slice(),spread:2,clipped:0});
  const face=()=>({status:'found',gridScore:.97,corners:[[.2,.15],[.65,.15],[.65,.75],[.2,.75]],patches:[... 'URFDFLBRU'].map(patch)});
  let profile={};
  for(const f of Object.keys(rgb)){
    assert(V.classify(patch(f)).color===f,`Default ${f}`);
    const taught=V.teachColor(profile,f,patch(f));assert(!taught.error,`Teach ${f}`);profile=taught.profile;
  }
  assert(V.profileReady(profile),'All six centers enable lighting match');
  assert(!V.profileReady({F:rgb.F}),'Partial calibration does not bias classification');
  for(const f of Object.keys(rgb)){
    assert(V.classify(patch(f),profile).color===f,`Calibrated ${f}`);
    assert(V.classify({...patch(f),rgb:rgb[f].map(n=>n*.83)},profile).color===f,`Exposure tolerance ${f}`);
  }
  assert(!!V.teachColor({F:rgb.F},'R',patch('F')).error,'Reject indistinguishable taught colors');
  for(const bad of [{rgb:[20,20,20],spread:0,clipped:0},{rgb:rgb.F,spread:48,clipped:0},{rgb:[255,255,255],spread:0,clipped:1},{rgb:[NaN,2,3],spread:0,clipped:0},{rgb:[2,3],spread:0,clipped:0}]){
    assert(V.classify(bad).color==='?','Unreliable color stays unknown');
    assert(!!V.teachColor({},'F',bad).error,'Bad center cannot calibrate');
  }
  const tracker=new V.Consensus();let time=0,sequence=0;
  const read=(data=face(),expected='F',advance=200)=>tracker.update(data,{time:time+=advance,sequence:sequence++,expected,profile});
  for(let i=0;i<5;i++)assert(!read().ready,'Wait for six frames');
  assert(read().ready,'Steady matching frames are ready after a second');
  const duplicate=tracker.update(face(),{time:time+1,sequence:sequence-1,expected:'F',profile});
  assert(duplicate.status==='stale','Repeated/out-of-order evidence rejected');
  assert(!read(face(),'F',2000).ready,'Interrupted stream starts over');
  for(let i=0;i<5;i++)read();
  assert(!read(face(),'R').ready,'Changing requested face clears evidence');
  let result;for(let i=0;i<5;i++)result=read(face(),'R');
  assert(result.status==='wrong-center'&&!result.ready,'Wrong center blocks capture');
  const moved=face();moved.corners=moved.corners.map(([x,y])=>[x+.06,y]);
  assert(!read(moved,'R').ready,'Moving face resets hold period');
  assert(read({status:'searching'}).status==='searching','Losing the face clears evidence');
  assert(!read().ready,'Returning face needs fresh evidence');
  for(let i=0;i<5;i++)read();
  const glare=face();glare.patches[0]={rgb:[255,255,255],spread:0,clipped:1};
  result=read(glare);assert(result.status==='uncertain'&&result.colors[0]==='?','Current glare cannot be hidden by older frames');
  for(let i=0;i<6;i++){const noisy=face();noisy.patches[0]=patch(i%2?'U':'R');result=read(noisy);}
  assert(!result.ready&&result.colors[0]==='?','Flickering colors do not capture');
  for(let i=0;i<6;i++)result=read();
  assert(result.ready,'Clear evidence recovers after flicker');
  tracker.reset();
  for(let i=0;i<5;i++)read();
  result=read({status:'searching'});
  assert(result.status==='recovering'&&!result.ready&&!result.geometryReady,'One brief miss preserves progress without permitting capture or calibration');
  assert(read().ready,'Fresh verified face completes consensus after a single missed detection');
  read({status:'searching'});result=read({status:'searching'});
  assert(result.status==='searching'&&!read().ready,'Repeated losses need a fresh hold');
  tracker.reset();
  for(let i=0;i<6;i++){
    const drifting=face();drifting.corners=drifting.corners.map(([x,y])=>[x+i*.009,y]);result=read(drifting);
  }
  assert(result.ready,'Gentle hand drift does not endlessly restart the hold');
  const jumped=face();jumped.corners=jumped.corners.map(([x,y])=>[x+.17,y]);
  assert(!read(jumped).ready,'A sudden large move still resets evidence');
  tracker.reset();for(let i=0;i<6;i++)read();
  read({status:'searching'});
  const hiddenGlare=face();hiddenGlare.patches[0]={rgb:[255,255,255],spread:0,clipped:1};
  result=read(hiddenGlare);
  assert(!result.ready&&result.colors[0]==='?','Recovered geometry cannot conceal new glare with older colors');
  read({status:'found',gridScore:.3});
  assert(!read().ready,'Weak grid evidence clears consensus immediately');
  tracker.reset();for(let i=0;i<5;i++)read();read({status:'searching'});
  assert(!read(face(),'R').ready,'Changing requested face after a miss clears all evidence');
  tracker.reset();for(let i=0;i<5;i++)read(face(),'F',400);
  assert(!read(face(),'F',400).ready,'Widely spaced evidence cannot accumulate outside the freshness window');
  const before=JSON.stringify(face());read(face());assert(JSON.stringify(face())===before,'Evidence stays immutable');
  for(const bad of [{},null,{...face(),gridScore:.4},{...face(),corners:[[0,NaN]]},{...face(),patches:[]}])assert(!read(bad).ready,'Malformed/weak detections rejected');
  assert(read({status:'too-small'}).status==='too-small','Small cube guidance');
  // Consistent geometry can support explicit teaching even when the current
  // classifier cannot identify the center; expected colors are never filled in.
  const unknown=face();unknown.patches[4]={rgb:[210,80,35],spread:2,clipped:0};
  for(let i=0;i<6;i++)result=read(unknown,'F');
  assert(result.geometryReady,'Stable wrong center can be explicitly taught');
  assert(!result.ready,'User teaching is separate from accepting the requested center');
  return `${passed} camera vision checks passed: calibration, uncertainty, temporal agreement, motion, stale evidence and wrong centers.`;
})();
