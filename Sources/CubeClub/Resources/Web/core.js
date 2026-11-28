(function(root) {
  'use strict';
  const FACES = ['U','R','F','D','L','B'];
  const COLORS = {U:'#f6cc4b',R:'#f39448',F:'#52af8a',D:'#fffdf1',L:'#e86c6a',B:'#72a3d7'};
  const COLOR_NAMES = {U:'yellow',R:'orange',F:'green',D:'white',L:'red',B:'blue'};
  const FACE_NAMES = {U:'top',R:'right',F:'front',D:'bottom',L:'left',B:'back'};
  const LESSONS = [
    {id:'hello',title:'Meet your cube',subtitle:'Every little piece has a home.',category:'START HERE',icon:'cube',minutes:2,color:'peach',algorithm:"R R R R",tag:'The basics',goal:'Watch four right turns bring your cube home.',why:'A center tells you the color of its whole face. An edge has two colors. A corner has three. Turn a face four times and every piece comes back!',when:'Before any algorithm, pick a front face and keep holding the cube that way.',hint:'R means the right face. Imagine looking straight at the right side: turn it clockwise.',mnemonic:'Right. Right. Right. Home!',quiz:'How many colors does an edge piece have?',answers:['Two','One','Three'],correct:0},
    {id:'cross',title:'Daisy to white cross',subtitle:'Give your first layer a strong start.',category:'FIRST LAYER',icon:'flower',minutes:4,color:'yellow',algorithm:'F2 R2 B2 L2',tag:'Match the centers',goal:'Turn matching white petals down to the white center.',why:'A half turn carries a white edge from the top to the bottom. Match its other color to the side center first. A good cross matches on the sides, too.',when:'First make a daisy: four white edge stickers around the yellow center. Use U turns to line up each petal’s side color with its center, then turn that side twice. This practice cube has the petals already lined up.',hint:'Keep yellow on top and white on the bottom. The 2 means a half turn.',mnemonic:'Match a petal. Turn it twice.',quiz:'Before sending a petal down, what should match?',answers:['Its side color and the side center','All the corners','Only the yellow stickers'],correct:0},
    {id:'right',title:'The right-hand move',subtitle:'Four moves. One super useful pattern.',category:'FIRST LAYER',icon:'hand',minutes:3,color:'mint',algorithm:"R U R' U'",tag:'Your first algorithm',goal:'Learn a four-move rhythm you will use again and again.',why:'This little sequence moves a corner out, moves the top, and brings the right face back. It is a building block for inserting white corners while protecting the cross.',when:'Hold white on the bottom. Find a white corner above its matching slot at the front-right. Repeat this pattern until that corner fits. Other starting cases may need setup moves.',hint:'The tiny apostrophe means turn the other way. Look straight at the face to decide clockwise.',mnemonic:'Right up. Top over. Right down. Top back.',quiz:'What does the little apostrophe mean?',answers:['Turn twice','Turn the other way','Turn the whole cube'],correct:1},
    {id:'left',title:'The left-hand move',subtitle:'Meet the right-hand move’s mirror.',category:'FIRST LAYER',icon:'hand',minutes:3,color:'lavender',algorithm:"L' U' L U",tag:'Mirror magic',goal:'Practice the same idea on the left side.',why:'The left-hand version works at the front-left corner. Mirror patterns let you solve a case on either side without learning a completely new idea.',when:'Use this pattern with a white corner above its matching front-left slot. Keep the same front face throughout.',hint:'Start with L prime: the left face counterclockwise, looking directly at it.',mnemonic:'Left up. Top over. Left down. Top back.',quiz:'Should the front face change halfway through?',answers:['Yes, every move','No, keep the same front','Only for a prime move'],correct:1},
    {id:'middle',title:'An edge finds a home',subtitle:'Slide a top edge into the middle.',category:'MIDDLE LAYER',icon:'layers',minutes:5,color:'peach',algorithm:"U R U' R' U' F' U F",tag:'Right edge insert',goal:'Move an edge from the top into the front-right slot.',why:'We move the edge out of the way, open a slot, and close it again. This eight-move pattern preserves the finished bottom layer.',when:'White layer goes on the bottom. Find a top edge without yellow. Match its front sticker to the front center. If its top sticker matches the right center, use this right insert. For a left slot, use the mirrored pattern U\' L\' U L U F U\' F\'.',hint:'Think in two chunks: U R U\' R\', then U\' F\' U F.',mnemonic:'Away. Open. Back. Close. Then fix the front.',quiz:'Which top edge can go into the middle layer?',answers:['An edge with yellow','An edge without yellow','Any corner'],correct:1},
    {id:'yellow',title:'Make a yellow cross',subtitle:'A little line becomes a big plus.',category:'LAST LAYER',icon:'sun',minutes:4,color:'yellow',algorithm:"F R U R' U' F'",tag:'Yellow edge flip',goal:'Make the four top edge stickers face yellow-up.',why:'The front turns wrap around a right-hand move. Together they flip top edges while keeping the first two layers safe.',when:'Hold yellow on top. For a yellow line, hold it left-to-right. For an L, put its yellow arms toward the back and left. With only a dot, do the pattern once, then inspect and reorient the new shape.',hint:'Look only at the top edges and center. The corners do not matter yet.',mnemonic:'Front. Right-hand move. Front back.',quiz:'Which stickers matter for the yellow cross?',answers:['Only the corners','The top edges and center','The bottom layer'],correct:1},
    {id:'sune',title:'The little fish',subtitle:'Help the yellow corners look up.',category:'LAST LAYER',icon:'fish',minutes:4,color:'mint',algorithm:"R U R' U R U2 R'",tag:'Sune',goal:'Recognize and practice the seven-move fish pattern.',why:'Sune changes the top corners while preserving the lower layers. Spotting its starting shape helps you choose the correct orientation.',when:'This practice setup has one yellow corner facing up at the front-left, and the front-right corner has yellow on the front. Other corner cases need a different setup or repeated patterns; inspect after each round.',hint:'There are two U moves and then a U2. Say “one, one, two.”',mnemonic:'Up, over, down, over. Up, double, down.',quiz:'What does U2 mean?',answers:['Turn the top halfway around','Turn two faces','Turn the bottom'],correct:0},
    {id:'corners',title:'Corners trade places',subtitle:'Put the yellow corners in their homes.',category:'LAST LAYER',icon:'swap',minutes:5,color:'lavender',algorithm:"U R U' L' U R' U' L",tag:'Corner cycle',goal:'Watch three top corners move around one corner.',why:'This sequence cycles three corner positions. A corner is in its home when its three colors match the three centers around it, even if it is twisted.',when:'After the yellow cross, find a corner in the correct home and hold it at the front-right. Cycle the other corners; repeat if needed. If none is home, do a round first. This pattern can twist corners, so orient them afterward.',hint:'A corner can be in the correct place even when yellow is not facing up.',mnemonic:'Top, right, top back, left back. Top, right back, top back, left.',quiz:'When is a corner in the right home?',answers:['When yellow faces up','When its three colors match the nearby centers','When it is on the right'],correct:1},
    {id:'edges',title:'The final shuffle',subtitle:'Bring those last three edges home.',category:'LAST LAYER',icon:'flag',minutes:5,color:'peach',algorithm:"R U' R U R U R U' R' U' R2",tag:'Last edge cycle',goal:'Cycle three top edges without changing the corners.',why:'This pattern trades three edge positions while restoring all the corners. It can be repeated to cycle the edges in the other direction.',when:'Finish the corners and keep yellow on top. If one side is complete, keep it at the back. Use this cycle once or twice to match the remaining edges. If none matches, do a cycle and inspect again.',hint:'Keep your grip steady. R2 at the end is a half turn.',mnemonic:'Slow and steady. Check the centers after the cycle.',quiz:'Which pieces does this pattern cycle?',answers:['Three top edges','All the corners','The centers'],correct:0}
  ];
  function moves(alg) { return alg.trim() ? alg.trim().split(/\s+/) : []; }
  function describeMove(move) {
    if (!move) return 'You did it!';
    const base = move[0], half = move.endsWith('2'), back = move.endsWith("'");
    const turn = half ? 'halfway around' : back ? 'counterclockwise' : 'clockwise';
    if (FACE_NAMES[base]) return `Turn the ${FACE_NAMES[base]} face ${turn}.`;
    // Slices and rotations follow their reference faces: M like L, E like D,
    // S like F, and x, y, z like R, U, F.
    if (base === 'M') return half ? 'Turn the middle slice halfway around.' : back ? 'Push the middle slice up at the front.' : 'Pull the middle slice down at the front.';
    if (base === 'E') return half ? 'Turn the equator slice halfway around.' : back ? 'Slide the equator slice so the front row moves left.' : 'Slide the equator slice so the front row moves right.';
    if (base === 'S') return `Turn the standing slice ${turn}, like the front face.`;
    if ('urfdlb'.includes(base)) return `Turn the ${FACE_NAMES[base.toUpperCase()]} two layers ${turn}.`;
    if (base === 'x') return half ? 'Roll the whole cube halfway over.' : back ? 'Roll the whole cube so the front goes down.' : 'Roll the whole cube so the front comes to the top.';
    if (base === 'y') return half ? 'Spin the whole cube halfway around.' : back ? 'Spin the whole cube so the front moves right.' : 'Spin the whole cube so the front moves left.';
    if (base === 'z') return `Tilt the whole cube ${turn}, like the front face.`;
    return 'Make the next turn.';
  }
  function parity(values) { let n=0; for(let i=0;i<values.length;i++) for(let j=i+1;j<values.length;j++) if(values[i]>values[j]) n++; return n%2; }
  function validate(facelets) {
    if(typeof facelets !== 'string' || facelets.length!==54 || /[^URFDLB]/.test(facelets)) return {ok:false,error:'Fill all 54 stickers before solving.'};
    for(const f of FACES) if([...facelets].filter(c=>c===f).length!==9) return {ok:false,error:`We need nine ${COLOR_NAMES[f]} stickers. Check the colors on each face.`};
    if(FACES.some((f,i)=>facelets[i*9+4]!==f)) return {ok:false,error:'The center colors do not match. Check which face you are scanning.'};
    try {
      const cube=Cube.fromString(facelets);
      if(new Set(cube.cp).size!==8 || new Set(cube.ep).size!==12 || cube.asString()!==facelets) return {ok:false,error:'Some pieces do not fit together. Check sticker colors and which edge was on top when scanning.'};
      if(cube.co.reduce((a,b)=>a+b,0)%3!==0) return {ok:false,error:'A corner looks twisted. Check the scan colors and orientation.'};
      if(cube.eo.reduce((a,b)=>a+b,0)%2!==0) return {ok:false,error:'An edge looks flipped. Check the scan colors and orientation.'};
      if(parity(cube.cp)!==parity(cube.ep)) return {ok:false,error:'Two pieces seem swapped. Recheck face orientation and colors.'};
      return {ok:true,cube};
    } catch (_) { return {ok:false,error:'That scan needs another look. Check all six faces.'}; }
  }
  function sampleColor(r,g,b) {
    const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,d=max-min;
    if(d<0.16 || (d/Math.max(max,0.01)<0.23 && max>0.4)) return 'D';
    let hue=0;
    if(max===r/255) hue=((g-b)/255/d)%6;
    else if(max===g/255) hue=(b-r)/255/d+2;
    else hue=(r-g)/255/d+4;
    hue=(hue*60+360)%360;
    if(hue<12 || hue>340) return 'L';
    if(hue<40) return 'R';
    if(hue<78) return 'U';
    if(hue<175) return 'F';
    return 'B';
  }
  function normalizePreferences(input) {
    const p=input&&typeof input==='object'?input:{};
    return {appearance:['system','light','dark'].includes(p.appearance)?p.appearance:'system',textSize:p.textSize==='large'?'large':'standard',reduceMotion:p.reduceMotion===true,autoCapture:p.autoCapture!==false,voice:['cedar','kid','marin'].includes(p.voice)?p.voice:'cedar'};
  }
  function resetLearningProgress(progress) {
    return normalizeProgress({preferences:progress.preferences,voice:progress.voice,slow:progress.slow,labels:progress.labels,calibration:progress.calibration});
  }
  function normalizeProgress(input) {
    const x=input && typeof input==='object'?input:{};
    return {savedSessions:root.CubeClubContinuity?.normalize(x.savedSessions)||{lesson:null,solve:null},calibration:root.CubeClubContinuity?.calibration(x.calibration)||null,preferences:normalizePreferences(x.preferences),quest:root.CubeClubQuest?.normalize(x.quest)||{},learningLevel:x.learningLevel==='next'?'next':'beginner',patternPractice:root.CubeClubNext?.normalizePractice(x.patternPractice)||{},tours:Array.isArray(x.tours)?[...new Set(x.tours.filter(t=>['home','lesson','turn'].includes(t)))]:[],completed:Array.isArray(x.completed)?[...new Set(x.completed.filter(id=>LESSONS.some(l=>l.id===id)))]:[],moves:Number.isFinite(x.moves)?Math.max(0,Math.floor(x.moves)):0,solves:Number.isFinite(x.solves)?Math.max(0,Math.floor(x.solves)):0,quiz:Array.isArray(x.quiz)?[...new Set(x.quiz.filter(id=>LESSONS.some(l=>l.id===id)))]:[],detective:Array.isArray(x.detective)?[...new Set(x.detective.filter(id=>['yellow-line','yellow-elbow','yellow-dot','yellow-cross','edge-right','edge-left','corner-home'].includes(id)))]:[],teamRounds:Number.isFinite(x.teamRounds)?Math.max(0,Math.floor(x.teamRounds)):0,moveChecks:Number.isFinite(x.moveChecks)?Math.max(0,Math.floor(x.moveChecks)):0,voice:!!x.voice,labels:x.labels!==false,slow:x.slow!==false};
  }
  // Safe HTML building. Inside html`...` every interpolated value is escaped,
  // except the output of another html`...` and text explicitly marked raw().
  // Arrays are joined; null, undefined and false render nothing.
  // Today's templates interpolate only bundled lesson text. Anything a person
  // types, a file supplies, or the system reports must go through html`...` or
  // escapeHTML() before it reaches innerHTML.
  const HTML_ESCAPES={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'};
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"'`]/g, c => HTML_ESCAPES[c]);
  }
  class SafeHTML {
    constructor(text) { this.text = text; }
    toString() { return this.text; }
  }
  function raw(text) {
    return text instanceof SafeHTML ? text : new SafeHTML(String(text ?? ''));
  }
  function htmlPiece(value) {
    if (value instanceof SafeHTML) return value.text;
    if (Array.isArray(value)) return value.map(htmlPiece).join('');
    if (value === null || value === undefined || value === false) return '';
    return escapeHTML(value);
  }
  function html(strings, ...values) {
    let out = strings[0];
    for (let i = 0; i < values.length; i++) out += htmlPiece(values[i]) + strings[i + 1];
    return new SafeHTML(out);
  }
  // Spoken moves for children: the letter first (so notation is learned too), then a concrete
  // direction instead of "clockwise", which depends on which side you look from. Each direction
  // is checked against the cube model in Tests/voice-tests.js.
  const SPOKEN={
    R:['Push the right side up','Pull the right side down','the right side'],
    L:['Pull the left side down','Push the left side up','the left side'],
    U:['Turn the top to the left','Turn the top to the right','the top'],
    D:['Turn the bottom to the right','Turn the bottom to the left','the bottom'],
    F:['Turn the front to the right, like a steering wheel','Turn the front to the left, like a steering wheel','the front'],
    B:['Turn the back so its top goes left','Turn the back so its top goes right','the back'],
    M:['Pull the middle slice down','Push the middle slice up','the middle slice'],
    E:['Turn the middle row to the right','Turn the middle row to the left','the middle row'],
    S:['Turn the standing middle slice to the right','Turn the standing middle slice to the left','the standing middle slice'],
    r:['Push the right two layers up','Pull the right two layers down','the right two layers'],
    l:['Pull the left two layers down','Push the left two layers up','the left two layers'],
    u:['Turn the top two layers to the left','Turn the top two layers to the right','the top two layers'],
    d:['Turn the bottom two layers to the right','Turn the bottom two layers to the left','the bottom two layers'],
    f:['Turn the front two layers to the right','Turn the front two layers to the left','the front two layers'],
    b:['Turn the back two layers so their top goes left','Turn the back two layers so their top goes right','the back two layers'],
    x:['Roll the whole cube so the front goes up','Roll the whole cube so the front goes down','the whole cube forward'],
    y:['Turn the whole cube to the left','Turn the whole cube to the right','the whole cube'],
    z:['Tilt the whole cube to the right','Tilt the whole cube to the left','the whole cube sideways'],
  };
  function speakMove(move){
    const m=String(move||''),base=m[0],suffix=m.slice(1),words=SPOKEN[base];
    if(!words||!['',"'",'2'].includes(suffix))return describeMove(m);
    const name=base+(suffix==="'"?' prime':suffix==='2'?' two':'');
    return `${name}. ${suffix==='2'?`Turn ${words[2]} two times`:words[suffix==="'"?1:0]}.`;
  }
  root.CubeClubCore={FACES,COLORS,COLOR_NAMES,FACE_NAMES,LESSONS,moves,describeMove,speakMove,validate,parity,sampleColor,normalizeProgress,normalizePreferences,resetLearningProgress,escapeHTML,html,raw};
  let initialized=false;
  root.solveCubeRequest=function(facelets) {
    const check=validate(facelets);
    if(!check.ok) return {error:check.error};
    if(check.cube.isSolved()) return {algorithm:''};
    if(!initialized) { Cube.initSolver(); initialized=true; }
    const algorithm=check.cube.solve();
    if(typeof algorithm!=='string' || !check.cube.clone().move(algorithm).isSolved()) return {error:'The solver could not find a verified solution. Please check the scan.'};
    return {algorithm};
  };
})(typeof globalThis!=='undefined'?globalThis:this);
