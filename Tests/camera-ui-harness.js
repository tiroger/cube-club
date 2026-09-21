// Native-bridge integration harness. Image loads are held until the test releases
// them, so old-session and out-of-order image callbacks can be tested explicitly.
var window=globalThis,document={addEventListener(){}};
var imageLoads=[];
function Image(){imageLoads.push(this);this.width=800;this.height=600;}
function setInterval(){}
var scan=null,lastFrame=null,lastFrameTime=0;
var scanOrder=['F','R','B','L','U','D'];
var FACES=CubeClubCore.FACES,COLORS=CubeClubCore.COLORS,COLOR_NAMES=CubeClubCore.COLOR_NAMES;
var native=false;
var elements={};
function $(selector){
  if(selector==='#camera-canvas')return null;
  return elements[selector]||(elements[selector]={textContent:'',disabled:false,style:{},classList:{toggle(){}}});
}
function renderScan(){refreshCameraPanel();}
function icon(){return '';}

function persistCameraPalette(colors){cameraPalette=colors;return true;}
