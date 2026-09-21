importScripts('vendor/cube.js','vendor/solve.js','core.js','beginner-core.js');
onmessage = event => {
  try { postMessage({id:event.data.id,...(event.data.method==='beginner'?solveBeginnerRequest:solveCubeRequest)(event.data.facelets)}); }
  catch (_) { postMessage({id:event.data.id,error:'Please check the scan and try again.'}); }
};
