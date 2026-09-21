/* One shared on-device camera experience for scanning and move checks. */
let cameraPalette={}; // Restored from the learner’s saved color samples at startup.
function cameraState(){
  if(!scan)return null;
  if(!scan.cameraCaptured)scan.cameraCaptured=new Set();
  if(!scan.vision)scan.vision={tracker:new CubeClubVision.Consensus(),face:null,result:null,captured:scan.cameraCaptured,sequence:-1};
  const v=scan.vision,face=scanOrder[scan.index];
  if(v.face!==face){v.face=face;v.tracker.reset();v.result=null;v.since=Date.now();}
  return v;
}
function cameraPanel(){
  const v=cameraState(),face=scanOrder[scan.index],learned=Object.keys(cameraPalette).length;
  return `<div class="camera-view vision-camera"><canvas id="camera-canvas" width="720" height="540" aria-label="Unmirrored camera preview. A glowing outline follows a detected cube face."></canvas><div class="camera-empty" id="camera-empty">${icon('camera')}<strong>Let’s find your cube</strong><button class="button primary" data-action="startCamera">${icon('camera')}Use my camera</button><p>Show one whole face in even light. Keep all four corners visible.</p></div><span class="vision-badge">${icon('search')}LET’S FIND YOUR CUBE</span></div>
  <div class="vision-feedback" id="vision-feedback" role="status"><span class="vision-dot"></span><div><strong id="vision-title">Ready when you are</strong><p id="vision-message">Your camera images stay on this Mac.</p></div></div>
  <div class="vision-progress" aria-hidden="true"><span id="vision-progress"></span></div>
  <div class="camera-controls"><button class="button secondary" data-action="captureFace" disabled>${icon('camera')}${v.captured.has(face)?'Read face again':'Read this face'}</button>${scan.camera?'<button class="button secondary" data-action="stopCamera">Turn camera off</button>':''}${scan.mode!=='check'?'<button class="text-button" data-action="demoScan">Try a sample cube</button>':''}</div>
  <label class="auto-capture"><input type="checkbox" data-camera-auto ${scan.autoCapture!==false?'checked':''}> Read automatically when steady <span>Always pauses for your review</span></label>
  <details class="color-teaching" id="color-teaching" ${scan.calibrating?'open':''}><summary>Match my cube’s colors <span>${learned}/6 learned</span></summary><p>Optional: teach all six centers in this room’s light. Choose a face tab above, show that center, and hold still. Automatic capture pauses here.</p><div class="learned-colors" aria-label="Learned center colors">${FACES.map(f=>`<span style="--sticker:${COLORS[f]}" aria-label="${COLOR_NAMES[f]} ${cameraPalette[f]?'learned':'waiting'}">${cameraPalette[f]?'✓':'·'}</span>`).join('')}</div><button class="button secondary" data-action="teachCenter" disabled>Teach ${COLOR_NAMES[face]} from the center</button><button class="text-button" data-action="resetCameraColors" ${learned?'':'disabled'}>Reset learned colors</button><p class="small-note">${CubeClubVision.profileReady(cameraPalette)?'Your six colors are active. Close this panel to capture.':'All six are needed to use your color match.'} Re-teach if the lighting changes. ${learned?'Learned colors are saved on this Mac, including after you quit. Re-teach if you change the camera or cube.':''}</p></details>`;
}
function visionCopy(result){
  switch(result?.status){
  case 'ready':return ['A lovely clear view',scan?.autoCapture===false?'Ready! Choose “Read this face” to capture.':'Hold your cube still for its picture.'];
  case 'hold':return ['Found your cube. Hold still…','We’re checking a few pictures agree. Keep fingers off the stickers.'];
  case 'wrong-center':return [`That looks like the ${COLOR_NAMES[result.seenCenter]} center`,`Show the ${COLOR_NAMES[scanOrder[scan.index]]} center. You can teach the colors below if this looks wrong.`];
  case 'uncertain':return ['A few colors need a clearer look',result.reason==='dark'?'Try a little more light.':result.reason==='glare'?'Tip the cube slightly to move the bright reflection.':'Keep fingers off the stickers and try even light. You can also teach your cube’s colors below.'];
  case 'too-small':return ['A little closer, please','Make the face bigger in the camera view. Keep all four corners visible.'];
  case 'unavailable':return ['Vision needs a restart','Try reconnecting the camera. You can still paint the colors by hand.'];
  default:return ['Looking for nine squares','Show one whole face with all four corners visible. A small tilt is okay.'];
  }
}
function updateCameraFeedback(){
  const v=cameraState();if(!v||!$('#vision-title'))return;
  const fresh=scan.camera&&Date.now()-lastFrameTime<1800;
  const evidenceFresh=fresh&&Date.now()-v.resultTime<1800;
  let [title,message]=!scan.camera?['Ready when you are','Your camera images stay on this Mac.']:!fresh?['Waiting for a fresh picture','Reconnect the camera if the picture stays paused.']:visionCopy(evidenceFresh?v.result:null);
  if(fresh&&v.captured.has(v.face)&&!scan.calibrating){title='Take a look together.';message='Your color board is paused for review. Check all nine squares on the right, then confirm.';}
  if(fresh&&scan.calibrating){title=evidenceFresh&&v.result?.geometryReady?'Center ready to learn':'Show the center and hold still';message=`Make sure this is the ${COLOR_NAMES[v.face]} center, then choose “Teach ${COLOR_NAMES[v.face]} from the center.”`;}
  if($('#vision-title').textContent!==title)$('#vision-title').textContent=title;
  if($('#vision-message').textContent!==message)$('#vision-message').textContent=message;
  $('#vision-feedback').classList.toggle('ready',!!(evidenceFresh&&v.result?.ready));
  $('#vision-progress').style.width=`${evidenceFresh?(v.result?.progress||0)*100:0}%`;
  const capture=$('[data-action="captureFace"]'),teach=$('[data-action="teachCenter"]');
  if(capture)capture.disabled=!!scan.solving||!evidenceFresh||!v.result?.ready||!!scan.calibrating;
  if(teach)teach.disabled=!!scan.solving||!evidenceFresh||!v.result?.geometryReady;
}
function refreshCameraPanel(){
  cameraState();
  if(scan.camera&&lastFrame)drawCamera(lastFrame);
  updateCameraFeedback();
}
function freshCameraPacket(packet){
  return scan?.camera&&packet?.token===scan.cameraToken&&Number.isFinite(packet.sequence)&&
    Number.isFinite(packet.capturedAt)&&Date.now()-packet.capturedAt>=0&&Date.now()-packet.capturedAt<1800;
}
window.onCameraFrame=packet=>{
  const owner=scan;
  if(!freshCameraPacket(packet)||typeof packet.image!=='string'||packet.sequence<=(owner.previewSequence??-1))return;
  owner.previewSequence=packet.sequence;
  // Resolve only after decoding/drawing, including discarded or broken images.
  // Native code waits for this promise instead of queuing more JPEGs in WebKit.
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      try{
        if(scan!==owner||!freshCameraPacket(packet)||packet.sequence!==owner.previewSequence)return;
        lastFrame=img;lastFrameTime=packet.capturedAt;
        drawCamera(img);
      }finally{resolve();}
    };
    img.onerror=()=>resolve();
    img.src=packet.image;
  });
};
window.onCameraAnalysis=packet=>{
  if(!freshCameraPacket(packet))return;
  const owner=scan,v=cameraState();
  if(packet.sequence<=v.sequence||packet.capturedAt<v.since)return;
  v.sequence=packet.sequence;
  v.result=v.tracker.update(packet.vision,{time:packet.capturedAt,sequence:packet.sequence,expected:v.face,profile:cameraPalette});
  v.resultTime=packet.capturedAt;
  if(lastFrame)drawCamera(lastFrame);
  updateCameraFeedback();
  if(v.result.ready&&!owner.solving&&owner.autoCapture!==false&&!owner.calibrating&&!v.captured.has(v.face)&&!owner.confirmed.has(v.face))captureFace(true);
};
window.onCameraError=error=>{
  if(scan&&error?.token===scan.cameraToken){stopCubeCamera();$('#scan-error').textContent=error.message;}
};
function drawCamera(img){
  const canvas=$('#camera-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=Math.min(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale,ox=(w-iw)/2,oy=(h-ih)/2;
  ctx.fillStyle='#263e35';ctx.fillRect(0,0,w,h);ctx.drawImage(img,ox,oy,iw,ih);
  const state=cameraState(),result=state?.result,p=Date.now()-state?.resultTime<450?result?.corners:null;
  if(p){
    const path=()=>{ctx.moveTo(ox+p[0][0]*iw,oy+p[0][1]*ih);p.slice(1).forEach(q=>ctx.lineTo(ox+q[0]*iw,oy+q[1]*ih));ctx.closePath();};
    ctx.beginPath();ctx.rect(0,0,w,h);path();ctx.fillStyle='rgba(17,40,31,.36)';ctx.fill('evenodd');
    ctx.beginPath();path();ctx.strokeStyle=result.ready?'#adf0bc':'#ffe7a3';ctx.lineWidth=5;ctx.stroke();
    for(const q of p){ctx.beginPath();ctx.arc(ox+q[0]*iw,oy+q[1]*ih,6,0,Math.PI*2);ctx.fillStyle=ctx.strokeStyle;ctx.fill();}
  }
  const empty=$('#camera-empty');if(empty){empty.hidden=true;empty.style.display='none';}
}
function captureFace(automatic=false){
  const v=cameraState();if(!v||scan.solving)return;
  if(!scan.camera||Date.now()-lastFrameTime>1800||Date.now()-v.resultTime>1800||!v.result?.ready||scan.calibrating){
    $('#scan-error').textContent='Wait for a steady, clear view of the requested face. You can always paint colors by hand.';return;
  }
  const face=v.face;
  scan.faces[face]=v.result.colors.slice();scan.confirmed.delete(face);v.captured.add(face);
  renderScan();
  $('#scan-error').textContent=automatic?'Face captured automatically. Check every color and the top-edge orientation before confirming.':'Fresh colors captured. Check every square before confirming.';
}
function lockCameraFace(){const v=cameraState();if(v)v.captured.add(v.face);}
async function startCubeCamera(button){
  if(!scan)return;
  const owner=scan;button.disabled=true;button.textContent='Opening camera…';
  owner.cameraToken=`cube-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  owner.vision=null;owner.previewSequence=-1;lastFrame=null;lastFrameTime=0;
  const token=owner.cameraToken,result=await bridge('cameraStart',{token});
  if(scan!==owner||owner.cameraToken!==token)return;
  if(result.error){renderScan();$('#scan-error').textContent=result.error;}
  else{owner.camera=true;renderScan();}
}
function stopCubeCamera(){
  if(!scan)return;
  scan.camera=false;scan.cameraToken=null;scan.vision=null;lastFrame=null;lastFrameTime=0;
  if(native)bridge('cameraStop');renderScan();
}
async function teachCameraCenter(){
  const v=cameraState();if(!scan?.camera||scan.solving||!v?.result?.geometryReady||Date.now()-v.resultTime>1800)return;
  const result=CubeClubVision.teachColor(cameraPalette,v.face,v.result.center);
  if(result.error){$('#scan-error').textContent=result.error;return;}
  const owner=scan;v.tracker.reset();v.result=null;
  if(!await persistCameraPalette(result.profile))return;
  if(scan!==owner)return;
  v.tracker.reset();v.result=null;
  renderScan();$('#scan-error').textContent=`Learned your ${COLOR_NAMES[v.face]}. ${CubeClubVision.profileReady(cameraPalette)?'All six colors are ready. Close the color panel to capture.':'Choose another face tab to teach the next center.'}`;
}
document.addEventListener('change',e=>{if(e.target.matches('[data-camera-auto]')&&scan){scan.autoCapture=e.target.checked;progress.preferences.autoCapture=scan.autoCapture;save();updateCameraFeedback();}});
document.addEventListener('toggle',e=>{if(e.target.id==='color-teaching'&&scan){const changed=scan.calibrating!==e.target.open;scan.calibrating=e.target.open;if(changed){const v=cameraState();v.tracker.reset();v.result=null;updateCameraFeedback();}}},true);
// A paused/disconnected stream cannot leave an enabled capture button behind.
setInterval(()=>{if(scan?.camera){updateCameraFeedback();if(lastFrame)drawCamera(lastFrame);}},700);
