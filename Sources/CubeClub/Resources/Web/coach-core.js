/* Learning and observation logic, shared by the UI and JavaScriptCore tests. */
(function(root) {
  'use strict';
  const {FACES,LESSONS,validate,sampleColor}=CubeClubCore;
  const TURN_NAMES=FACES.flatMap(face=>['',"'",'2'].map(suffix=>face+suffix));
  const faceString=(state,face)=>state.slice(FACES.indexOf(face)*9,FACES.indexOf(face)*9+9);
  const rotateFace=values=>[6,3,0,7,4,1,8,5,2].map(i=>values[i]);

  function candidatesFor(before,move) {
    const checked=validate(before);
    if(!checked.ok || !TURN_NAMES.includes(move)) throw new Error('A legal starting cube and one face turn are required.');
    return [{move:'',state:before},...TURN_NAMES.map(turn=>({move:turn,state:checked.cube.clone().move(turn).asString()}))];
  }

  function recommendFace(candidates,observations) {
    const unseen=FACES.filter(face=>!observations[face]);
    let best=unseen[0]||null,bestScore=-1;
    for(const face of unseen) {
      const counts=new Map();
      for(const candidate of candidates) {
        const value=faceString(candidate.state,face);
        counts.set(value,(counts.get(value)||0)+1);
      }
      // Prefer the view that best separates the remaining explanations.
      const score=candidates.length*candidates.length-[...counts.values()].reduce((sum,n)=>sum+n*n,0);
      if(score>bestScore){bestScore=score;best=face;}
    }
    return best;
  }

  function inspectMove(before,move,observations={}) {
    const all=candidatesFor(before,move);
    const expected=all.find(candidate=>candidate.move===move).state;
    const faces=Object.keys(observations);
    for(const face of faces) {
      const value=observations[face];
      if(!FACES.includes(face)||typeof value!=='string'||value.length!==9||/[^URFDLB?]/.test(value)) {
        return {status:'invalid',faces:0,nextFace:null,matches:[],expected};
      }
      if(value[4]!==face)return {status:'orientation',faces:faces.length,nextFace:face,matches:[],expected};
      if(value.includes('?'))return {status:'uncertain',faces:faces.length,nextFace:face,matches:[],expected};
    }
    const fits=candidate=>faces.every(face=>faceString(candidate.state,face)===observations[face]);
    const matches=all.filter(fits);
    const nextFace=recommendFace(matches.length?matches:all,observations);
    const differences=faces.flatMap(face=>[...observations[face]].flatMap((color,index)=>color!==faceString(expected,face)[index]?[{face,index}]:[]));
    const base={faces:faces.length,nextFace,matches:matches.map(candidate=>candidate.move),expected,differences};
    if(!faces.length)return {...base,status:'ready'};
    if(!matches.length)return {...base,status:'mismatch'};
    if(matches.length>1)return {...base,status:'ambiguous'};
    const found=matches[0].move;
    if(found===move)return {...base,status:faces.length===6?'verified':'partial'};
    return {...base,status:found===''?'waiting':'different',observedMove:found,repair:found?`${Cube.inverse(found)} ${move}`:move};
  }

  function topPattern(state) {
    const yellow=[1,3,5,7].filter(i=>state[i]==='U');
    if(yellow.length===4)return 'cross';
    if(!yellow.length)return 'dot';
    if(yellow.length===2)return (yellow[0]===1&&yellow[1]===7)||(yellow[0]===3&&yellow[1]===5)?'line':'elbow';
    return 'other';
  }

  const yellowAlgorithm=LESSONS.find(lesson=>lesson.id==='yellow').algorithm;
  const shapeChoices=['A little dot','An L shape','A straight line','A yellow cross'];
  function shapeChallenge(id,setup,title,answer,explanation) {
    return {id,kind:'yellow',title,setup,focus:'U',question:'Look at the yellow center and edge stickers. Which shape do they make?',choices:shapeChoices,answer,hint:'Ignore the four corners. Only the center and its four neighbors count.',explanation};
  }
  const CHALLENGES=[
    shapeChallenge('yellow-line',Cube.inverse(yellowAlgorithm),'A clue on top',2,'Two opposite yellow edges make a line. Before the yellow-cross pattern, hold that line left-to-right.'),
    shapeChallenge('yellow-elbow',yellowAlgorithm,'Look at the neighbors',1,'Two neighboring yellow edges make an L. Hold the yellow arms toward the back and left before the yellow-cross pattern.'),
    shapeChallenge('yellow-dot',`${Cube.inverse(yellowAlgorithm)} U ${yellowAlgorithm}`,'A tiny starting point',0,'The center is yellow, but none of the four edges points yellow-up yet. Do one yellow-cross pattern, then inspect the new shape.'),
    shapeChallenge('yellow-cross','U','Ready for the next step?',3,'All four yellow edges face up. The cross is ready! Leave those edge orientations alone and move on to the corners.'),
    {id:'edge-right',kind:'edge',title:'Which way is home?',setup:Cube.inverse(LESSONS.find(l=>l.id==='middle').algorithm),focus:'UF',question:'The green sticker matches the front center. The other sticker is orange. Which middle slot is its home?',choices:['Front-left slot','Front-right slot','Keep it on top'],answer:1,hint:'Orange is the right center. Match both colors, not just the front one.',explanation:'Green plus orange belongs between the front and right centers. The right edge insert takes it there.'},
    {id:'edge-left',kind:'edge',title:'A mirror-image clue',setup:Cube.inverse("U' L' U L U F U' F'"),focus:'UF',question:'The green sticker matches the front center. The other sticker is red. Which middle slot is its home?',choices:['Front-left slot','Front-right slot','Any yellow slot'],answer:0,hint:'Find the red center on the left. It is the other half of this edge’s home.',explanation:'Green plus red belongs at the front-left. Use the left edge insert after matching the front sticker.'},
    {id:'corner-home',kind:'corner',title:'Three colors, one home',setup:Cube.inverse(LESSONS.find(l=>l.id==='right').algorithm),focus:'UFR',question:'The outlined corner has white, green, and orange. Where does it belong?',choices:['Top-front-left','Bottom-front-right','Bottom-back-left'],answer:1,hint:'White is the bottom center, green is the front, and orange is the right.',explanation:'A corner’s three colors point to its home. This one belongs where the bottom, front, and right centers meet—even if it is twisted.'}
  ];
  function challengeState(challenge){return new Cube().move(challenge.setup).asString();}
  function teamRoles(index,childFirst=true) {
    const childCalls=(index%2===0)===childFirst;
    return {caller:childCalls?'Young cuber':'Grown-up',turner:childCalls?'Grown-up':'Young cuber'};
  }
  function makeTeamRound(lessonID,childFirst=true) {
    const lesson=LESSONS.find(l=>l.id===lessonID);
    if(!lesson)throw new Error('Unknown lesson.');
    return {lessonID,algorithm:CubeClubCore.moves(lesson.algorithm),index:0,phase:'predict',childFirst,finished:false};
  }
  function teamTransition(round,event,move) {
    const next={...round};
    if(next.finished)return next;
    if(event==='reveal'&&next.phase==='predict')next.phase='turn';
    if(event==='turn'&&next.phase==='turn'&&move===next.algorithm[next.index])next.phase='notice';
    if(event==='discussed'&&next.phase==='notice') {
      next.index++;
      next.finished=next.index===next.algorithm.length;
      next.phase=next.finished?'finished':'predict';
    }
    if(event==='swap'&&next.phase==='predict')next.childFirst=!next.childFirst;
    return next;
  }

  function samplePatch(pixels) {
    if(!pixels||pixels.length<4||pixels.length%4)return {color:'?',reason:'empty'};
    let r=0,g=0,b=0;
    const count=pixels.length/4;
    for(let i=0;i<pixels.length;i+=4){r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];}
    r/=count;g/=count;b/=count;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let variance=0;
    for(let i=0;i<pixels.length;i+=4)variance+=(pixels[i]-r)**2+(pixels[i+1]-g)**2+(pixels[i+2]-b)**2;
    if(max<55)return {color:'?',reason:'dark'};
    if(Math.sqrt(variance/(count*3))>48)return {color:'?',reason:'uneven'};
    let hue=0;
    if(delta){hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue=(hue*60+360)%360;}
    if(delta/max>.23 && [12,40,78,175,340].some(boundary=>Math.abs(boundary-hue)<3))return {color:'?',reason:'between-colors'};
    return {color:sampleColor(r,g,b),reason:'suggestion'};
  }
  root.CubeClubCoach={TURN_NAMES,CHALLENGES,faceString,rotateFace,candidatesFor,recommendFace,inspectMove,topPattern,challengeState,teamRoles,makeTeamRound,teamTransition,samplePatch};
})(typeof globalThis!=='undefined'?globalThis:this);
