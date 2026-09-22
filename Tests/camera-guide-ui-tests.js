let checks=0;
function check(condition,message){if(!condition)throw Error(message);checks++;}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
newScan();scan.camera=true;scan.cameraToken='guide-ui';scan.autoCapture=false;renderScan();revealCamera();
const input=document.createElement('canvas');input.width=1280;input.height=720;
const source=input.getContext('2d');source.fillStyle='#263e35';source.fillRect(0,0,1280,720);
let seq=0;
async function preview(){await onCameraFrame({token:'guide-ui',sequence:++seq,capturedAt:Date.now(),image:input.toDataURL('image/png')});}
for(const theme of ['light','dark']){
 progress.preferences.appearance=theme;progress.preferences.textSize='large';applyPreferences();
 await preview();updateCameraFeedback();await wait(50);
 check($('#vision-title').textContent==='Fit one face inside the square',`${theme}: actionable search instruction`);
 check($('#vision-badge').textContent==='FIT ONE FACE IN THE SQUARE',`${theme}: guide badge`);
 check($('[data-action="captureFace"]').disabled,`${theme}: a preview and guide alone never permit capture`);
 const canvas=$('#camera-canvas'),ctx=canvas.getContext('2d');
 // 1280×720 is letterboxed inside the real 720×540 camera canvas. The first
 // top-edge dash must land at the image-space guide, not a stretched rectangle.
 const guide=cameraGuide(720,405),x=Math.round(guide.x+4),y=Math.round(67.5+guide.y);
 const edge=ctx.getImageData(x,y,1,1).data,background=ctx.getImageData(20,100,1,1).data;
 check(edge[0]>150&&background[0]<70,`${theme}: visible square rendered in the right image coordinates`);
 const bounds=canvas.getBoundingClientRect(),modal=$('.modal').getBoundingClientRect();
 check(bounds.width>200&&bounds.left>=modal.left&&bounds.right<=modal.right,`${theme}: camera fits the minimum window`);
 const footer=$('.scan-footer').getBoundingClientRect();
 check(bounds.top>=modal.top&&bounds.bottom<=footer.top,`${theme}: starting the camera reveals the entire preview above the footer`);
}
const patches=[...'URFDFLBRU'].map(c=>({rgb:{U:[245,215,30],R:[235,110,25],F:[25,160,65],D:[235,235,225],L:[210,35,45],B:[35,85,210]}[c],spread:1,clipped:0}));
const reading={status:'found',gridScore:.98,corners:[[.3,.15],[.7,.15],[.7,.85],[.3,.85]],patches};
for(let i=0;i<6;i++){await wait(180);await preview();onCameraAnalysis({token:'guide-ui',sequence:seq,capturedAt:Date.now(),vision:reading});}
check(! $('[data-action="captureFace"]').disabled,'Fresh verified evidence enables explicit capture');
check($('#vision-badge').textContent==='FACE FOUND','Found face replaces the alignment badge');
await wait(200);await preview();onCameraAnalysis({token:'guide-ui',sequence:seq,capturedAt:Date.now(),vision:{status:'searching'}});
check($('#vision-title').textContent==='Still with you…','Brief miss gets recovery guidance');
check($('[data-action="captureFace"]').disabled,'Recovery cannot use an old result');
await wait(200);await preview();onCameraAnalysis({token:'guide-ui',sequence:seq,capturedAt:Date.now(),vision:reading});
captureFace(false);
check($('#vision-badge').textContent==='CHECK YOUR COLORS','Captured view tells the child to review');
check(!scan.confirmed.has('F')&&!scan.faces.F.includes('?'),'Capture still requires explicit color confirmation');
return `${checks} camera guide WebKit checks passed: letterboxed rendering, light/dark, larger text, recovery and review.`;
