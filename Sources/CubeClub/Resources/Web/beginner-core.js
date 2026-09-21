/* A bounded, layer-by-layer teaching planner. It never substitutes a general solve. */
(function(root){
 'use strict';
 const C=CubeClubCore, SIDES=['F','R','B','L'];
 const TRIGGER="R U R' U'", INSERT="U R U' R' U' F' U F", LEFT="U' L' U L U F U' F'";
 const CROSS="F R U R' U' F'", CORNERS="U R U' L' U R' U' L", TWIST="R' D' R D", EDGES="R U' R U R U R U' R' U' R2";
 const STAGES=[
  {id:'daisy',title:'Make a white daisy',goal:'Four white edge stickers surround the yellow center. The corners can wait.',lesson:'daisy'},
  {id:'cross',title:'Match the white cross',goal:'White edges face down, and each side color matches its center.',lesson:'cross'},
  {id:'white-corners',title:'Finish the white layer',goal:'White faces down on all four corners, with the side colors in their homes.',lesson:'white-corners'},
  {id:'middle',title:'Build the middle layer',goal:'The bottom two rows match their centers on all four sides.',lesson:'middle'},
  {id:'yellow',title:'Make a yellow cross',goal:'The four top edge stickers face yellow-up. Ignore the corners for now.',lesson:'yellow'},
  {id:'corners',title:'Find the yellow corners’ homes',goal:'Each top corner has the three colors of its surrounding centers. Yellow need not face up yet.',lesson:'corners'},
  {id:'orient',title:'Turn the yellow corners up',goal:'Finish every corner and return the top to its starting alignment. The lower layers recover at the end.',lesson:'finish-corners'},
  {id:'edges',title:'Match the last edges',goal:'Every face is one color. Check all six faces on your real cube.',lesson:'edges'}
 ];
 const whiteNames=['white-orange','white-green','white-red','white-blue'];
 const cornerNames=['white-green-orange','white-red-green','white-blue-red','white-orange-blue'];
 const edgeNames=['green-orange','green-red','blue-red','blue-orange'];
 const sideForCorner=['F','L','B','R'], sideForEdge=['F','L','B','R'];
 function around(alg,front){const offset=SIDES.indexOf(front);return C.moves(alg).map(m=>{const i=SIDES.indexOf(m[0]);return (i<0?m[0]:SIDES[(i+offset)%4])+m.slice(1);}).join(' ');}
 const edgeHome=(c,i)=>c.ep[i]===i&&c.eo[i]===0,cornerHome=(c,i)=>c.cp[i]===i&&c.co[i]===0;
 const cross=c=>[4,5,6,7].every(i=>edgeHome(c,i));
 const whiteLayer=c=>cross(c)&&[4,5,6,7].every(i=>cornerHome(c,i));
 const middle=c=>whiteLayer(c)&&[8,9,10,11].every(i=>edgeHome(c,i));
 const petals=c=>[0,1,2,3].filter(i=>c.ep[i]>=4&&c.ep[i]<=7&&c.eo[i]===0).map(i=>c.ep[i]);
 function reached(c,id){switch(id){
  case 'daisy':return petals(c).length===4;
  case 'cross':return cross(c);
  case 'white-corners':return whiteLayer(c);
  case 'middle':return middle(c);
  case 'yellow':return middle(c)&&c.eo.slice(0,4).every(x=>x===0);
  case 'corners':return reached(c,'yellow')&&c.cp.slice(0,4).every((x,i)=>x===i);
  case 'orient':return middle(c)&&c.cp.every((x,i)=>x===i)&&c.co.every(x=>x===0)&&c.eo.every(x=>x===0);
  case 'edges':return c.isSolved();
  default:return false;
 }}
 // Search only short setup turns or combinations of the named beginner patterns.
 // Keys ignore pieces irrelevant to this stage; caps turn failure into an explicit error.
 function search(c,actions,key,goal,maxDepth,maxNodes=25000){
  if(goal(c))return [];
  const nodes=[{cube:c.clone(),parent:-1,action:-1,depth:0}],seen=new Set([key(c)]);
  for(let cursor=0;cursor<nodes.length;cursor++){
   const node=nodes[cursor];if(node.depth===maxDepth)continue;
   for(let i=0;i<actions.length;i++){
    const next=node.cube.clone().move(actions[i]),k=key(next);if(seen.has(k))continue;
    seen.add(k);const entry={cube:next,parent:cursor,action:i,depth:node.depth+1};nodes.push(entry);
    if(goal(next)){const path=[];let p=nodes.length-1;while(nodes[p].parent>=0){path.push(actions[nodes[p].action]);p=nodes[p].parent;}return path.reverse();}
    if(nodes.length>maxNodes)throw Error('This teaching setup needs another look. Please check the scanned colors.');
   }
  }
  throw Error('A beginner step could not be verified. Please review your scan.');
 }
 function plan(facelets){
  const valid=C.validate(facelets);if(!valid.ok)return {error:valid.error};
  const cube=valid.cube.clone(),chunks=[],stages=[];let offset=0;
  function add(stage,algorithm,title,why,focusPieces=[]){const ms=C.moves(algorithm);if(!ms.length)return;const before=cube.asString();cube.move(algorithm);chunks.push({stage,algorithm,title,why,focusPieces,start:offset,end:offset+ms.length,before,after:cube.asString()});offset+=ms.length;if(offset>600)throw Error('This teaching plan is too long. Please review the scan.');}
  function finish(stage,skipped=false){if(!skipped&&!reached(cube,stage.id))throw Error('The '+stage.title+' milestone did not check out.');stages.push({...stage,end:offset,skipped:skipped||offset===(stages.at(-1)?.end||0),state:cube.asString()});}
  try{
   // Leave an already completed cross and everything built on it intact.
   if(!cross(cube)){
    while(petals(cube).length<4){
     const old=petals(cube),before=cube.clone();
     const turns=C.FACES.flatMap(f=>[f,f+"'",f+'2']);
     const path=search(cube,turns,c=>[4,5,6,7].map(p=>{const i=c.ep.indexOf(p);return i*2+c.eo[i];}).join(','),c=>{const p=petals(c);return p.length>old.length&&old.every(x=>p.includes(x));},4);
     const after=before.move(path.join(' ')),newPieces=petals(after).filter(p=>!old.includes(p));
     add('daisy',path.join(' '),'Lift a white petal','Follow the outlined white edge to the yellow center. Any petals moved aside return by the end of this little plan.',newPieces.map(i=>['DR','DF','DL','DB'][i-4]));
    }
    finish(STAGES[0]);
    for(let target=4;target<8;target++){
     let turns=0;while(cube.ep[target-4]!==target&&turns<4){cube.move('U');turns++;}
     // Undo probing; record the chosen setup as real teaching moves.
     if(turns)cube.move(Cube.inverse(Array(turns).fill('U').join(' ')));
     if(turns)add('cross',['','U','U2',"U'"][turns],'Match '+whiteNames[target-4],'Move only the top until this edge’s side color sits above its matching center.',['DR','DF','DL','DB'].slice(target-4,target-3));
     add('cross',['R2','F2','L2','B2'][target-4],'Send this petal home','A half turn brings white to the bottom while keeping the side color matched.',['DR','DF','DL','DB'].slice(target-4,target-3));
    }
   }else finish(STAGES[0],true);
   finish(STAGES[1]);
   for(let target=4;target<8;target++){
    if(cornerHome(cube,target))continue;
    let pos=cube.cp.indexOf(target);
    if(pos>=4)add('white-corners',around(TRIGGER,sideForCorner[pos-4]),'Lift a corner for another try','This corner is in a bottom slot but its colors do not fit. Lift it to the top first. The white cross returns at the end of the pattern.',[ ['DFR','DLF','DBL','DRB'][target-4] ]);
    pos=cube.cp.indexOf(target);if(pos>=4)throw Error('Corner setup failed.');
    let setup='';for(const alg of ['', 'U', 'U2', "U'"])if(cube.clone().move(alg).cp[target-4]===target){setup=alg;break;}
    add('white-corners',setup,'Above its own home','Bring '+cornerNames[target-4]+' above the corner between its matching centers. Move only the top.',[['DFR','DLF','DBL','DRB'][target-4]]);
    for(let n=0;!cornerHome(cube,target)&&n<6;n++)add('white-corners',around(TRIGGER,sideForCorner[target-4]),'The corner rhythm','Repeat the same four-move idea at this corner. Complete all four moves before checking white and both side colors.',[['DFR','DLF','DBL','DRB'][target-4]]);
    if(!cornerHome(cube,target))throw Error('Corner insertion failed.');
   }
   finish(STAGES[2]);
   for(let target=8;target<12;target++){
    if(edgeHome(cube,target))continue;
    let pos=cube.ep.indexOf(target);
    if(pos>=8)add('middle',around(INSERT,sideForEdge[pos-8]),'Give this edge a fresh start','The '+edgeNames[target-8]+' edge is trapped or flipped in a middle slot. Use an insertion to bring it to the top. The white layer is restored.',[['FR','FL','BL','BR'][target-8]]);
    let found=null;
    for(const setup of ['', 'U', 'U2', "U'"]){for(const front of SIDES){for(const [alg,label] of [[INSERT,'right'],[LEFT,'left']]){
     const insert=around(alg,front),trial=cube.clone().move((setup+' '+insert).trim());
     if(edgeHome(trial,target)&&whiteLayer(trial)&&[8,9,10,11].every(i=>!edgeHome(cube,i)||edgeHome(trial,i))){found={setup,insert,label,front};break;}
    }if(found)break;}if(found)break;}
    if(!found)throw Error('Middle edge setup failed.');
    add('middle',found.setup,'Match the edge to its center','Find the '+edgeNames[target-8]+' edge. Turn the top until its outward sticker matches the center below.',[['FR','FL','BL','BR'][target-8]]);
    add('middle',found.insert,'Slide the edge '+found.label,'Use the '+found.label+' insertion pattern around the '+C.COLOR_NAMES[found.front]+' side. The move letters use your original grip: yellow up, green in front.',[['FR','FL','BL','BR'][target-8]]);
   }
   finish(STAGES[3]);
   const orientPath=search(cube,['U',"U'",'U2',CROSS],c=>c.eo.slice(0,4).join(''),c=>reached(c,'yellow'),7,100);
   for(const alg of orientPath)add('yellow',alg,alg.includes(' ')?'Make the yellow cross':'Line up the yellow shape',alg.includes(' ')?'Front, right-hand pattern, front back. Watch the yellow edges; the first two layers return after the whole pattern.':'Turn the top to set up the next pattern. Only the top edges and center tell us the shape.',['UR','UF','UL','UB']);
   finish(STAGES[4]);
   const cornerPath=search(cube,['U',"U'",'U2',CORNERS],c=>c.cp.slice(0,4).join(','),c=>reached(c,'corners'),7,100);
   for(const alg of cornerPath)add('corners',alg,alg.includes(' ')?'Move corners to their homes':'Line up the corner homes',alg.includes(' ')?'Cycle three corners around the fourth. Their three colors choose their homes, even if yellow points sideways.':'Turn the top to prepare the corners for the next cycle. Keep the whole cube in the same grip.',['URF','UFL','ULB','UBR']);
   finish(STAGES[5]);
   if(!reached(cube,'orient')){
    for(let corner=0;corner<4;corner++){
     const working=cube.cp[0];let n=0;while((cube.co[0]!==0||cube.cp[0]!==working)&&n++<6)add('orient',TWIST,'Turn this corner yellow-up','Work at top-front-right. Finish all four moves, even if yellow turns up early. The lower layers may look mixed until ALL corners are finished. Keep your grip and follow the top turns.',['URF','UFL','ULB','UBR']);
     if(cube.co[0]!==0)throw Error('Corner orientation failed.');
     add('orient','U',corner===3?'Restore the top alignment':'Bring the next corner over',corner===3?'This last top turn restores the starting alignment. Now check the lower layers too.':'Move only the TOP layer. Bring the next corner to the same top-front-right working spot; do not turn the whole cube.',['URF','UFL','ULB','UBR']);
    }
   }
   finish(STAGES[6]);
   const edgePath=search(cube,SIDES.map(f=>around(EDGES,f)),c=>c.ep.slice(0,4).join(','),c=>c.isSolved(),4,30);
   for(const alg of edgePath)add('edges',alg,'The final edge shuffle','Cycle three yellow edges while restoring every corner. Keep the same grip and check the side centers after this complete pattern.',['UR','UF','UL','UB']);
   finish(STAGES[7]);
   const algorithm=chunks.map(c=>c.algorithm).join(' ');
   if(!valid.cube.clone().move(algorithm).isSolved())throw Error('The teaching solution did not verify.');
   return {method:'beginner',algorithm,chunks,stages};
  }catch(e){return {error:e.message};}
 }
 root.solveBeginnerRequest=plan;
 root.CubeClubBeginner={STAGES,plan,reached,around,petals,TRIGGER,INSERT,LEFT,CROSS,CORNERS,TWIST,EDGES};
})(globalThis);
