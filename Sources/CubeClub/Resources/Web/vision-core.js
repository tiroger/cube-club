/* Camera evidence only. This module never infers a sticker from the solver. */
(function(root){
  'use strict';
  const faces=['U','R','F','D','L','B'];
  const validRGB=rgb=>Array.isArray(rgb)&&rgb.length===3&&rgb.every(n=>Number.isFinite(n)&&n>=0&&n<=255);
  function lab(rgb){
    const [r,g,b]=rgb.map(n=>{n/=255;return n>.04045?((n+.055)/1.055)**2.4:n/12.92;});
    const f=n=>n>.008856?Math.cbrt(n):7.787*n+16/116;
    const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047),y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
    return [116*y-16,500*(x-y),200*(y-z)];
  }
  const colorDistance=(a,b)=>Math.sqrt(.35*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2);
  function profileReady(profile){return !!profile&&faces.every(f=>validRGB(profile[f]));}
  function classify(patch,profile={}){
    if(!patch||!validRGB(patch.rgb)||!Number.isFinite(patch.spread)||!Number.isFinite(patch.clipped))return {color:'?',reason:'missing'};
    const [r,g,b]=patch.rgb,max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    if(max<55)return {color:'?',reason:'dark'};
    if(patch.spread>32)return {color:'?',reason:'uneven'};
    if(patch.clipped>.45)return {color:'?',reason:'glare'};
    if(profileReady(profile)){
      const value=lab(patch.rgb),ranked=faces.map(color=>({color,distance:colorDistance(value,lab(profile[color]))})).sort((a,b)=>a.distance-b.distance);
      if(ranked[0].distance>32||ranked[1].distance-ranked[0].distance<6)return {color:'?',reason:'between-colors'};
      return {color:ranked[0].color,reason:'calibrated'};
    }
    let hue=0;
    if(delta){hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue=(hue*60+360)%360;}
    if(delta/max>.23&&[12,40,78,175,340].some(boundary=>Math.abs(boundary-hue)<4))return {color:'?',reason:'between-colors'};
    if(delta/max<.23&&max<110)return {color:'?',reason:'dark'};
    return {color:CubeClubCore.sampleColor(r,g,b),reason:'suggestion'};
  }
  function teachColor(profile,face,patch){
    if(!faces.includes(face)||!patch||!validRGB(patch.rgb)||!Number.isFinite(patch.spread)||!Number.isFinite(patch.clipped)||patch.spread>22||patch.clipped>.35||Math.max(...patch.rgb)<65)return {error:'The center needs a clearer look. Try even light without a bright reflection.'};
    const value=lab(patch.rgb);
    if(faces.some(f=>f!==face&&validRGB(profile[f])&&colorDistance(value,lab(profile[f]))<14))return {error:'Those two learned colors look too alike. Check the center you are showing, or change the lighting.'};
    return {profile:{...profile,[face]:patch.rgb.slice()}};
  }
  function validReading(reading){
    return reading?.status==='found'&&Number.isFinite(reading.gridScore)&&reading.gridScore>=.70&&
      Array.isArray(reading.corners)&&reading.corners.length===4&&reading.corners.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1))&&
      Array.isArray(reading.patches)&&reading.patches.length===9;
  }
  const separation=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function displacement(a,b){
    const scale=(separation(a[0],a[1])+separation(a[0],a[3]))/2;
    return Math.max(...a.map((p,i)=>separation(p,b[i])))/Math.max(.01,scale);
  }
  class Consensus {
    constructor(){this.reset();}
    reset(){this.frames=[];this.expected=null;this.lastTime=-Infinity;this.lastSequence=-1;this.anchor=null;this.lastValid=-Infinity;this.misses=0;}
    update(reading,{time,sequence,expected,profile={}}){
      if(!Number.isFinite(time)||!Number.isFinite(sequence)||sequence<=this.lastSequence)return {status:'stale',ready:false};
      if(expected!==this.expected||time-this.lastTime>750||time<this.lastTime){this.reset();this.expected=expected;}
      this.lastTime=time;this.lastSequence=sequence;
      if(!validReading(reading)){
        this.misses++;
        // One brief detector miss may keep past evidence, but is NEVER a usable
        // reading. Repeated misses, weak grids and interruptions start over.
        if(reading?.status==='searching'&&this.misses===1&&time-this.lastValid<=450&&this.frames.length)
          return {status:'recovering',ready:false,progress:this.frames.length/6};
        this.frames=[];this.anchor=null;
        return {status:reading?.status==='too-small'?'too-small':reading?.status==='unavailable'?'unavailable':'searching',ready:false};
      }
      if(time-this.lastValid>750||(this.anchor&&displacement(this.anchor,reading.corners)>.10))this.frames=[];
      // Compare adjacent verified faces so gentle hand drift is allowed. Sudden
      // moves still restart the hold, and every sticker must agree over time.
      this.anchor=reading.corners;this.lastValid=time;this.misses=0;
      const classified=reading.patches.map(p=>classify(p,profile));
      this.frames.push({time,classified,patches:reading.patches});
      this.frames=this.frames.filter(f=>time-f.time<=1600).slice(-6);
      const geometryReady=this.frames.length===6&&time-this.frames[0].time>=850;
      const center=reading.patches[4];
      const centerSteady=validRGB(center?.rgb)&&this.frames.every(f=>validRGB(f.patches[4]?.rgb)&&colorDistance(lab(f.patches[4].rgb),lab(center.rgb))<10);
      const base={ready:false,corners:reading.corners,geometryReady:geometryReady&&centerSteady,center,progress:Math.min(1,this.frames.length/6),colors:classified.map(c=>c.color)};
      if(!geometryReady)return {...base,status:'hold'};
      const colors=classified.map((current,i)=>current.color!=='?'&&this.frames.filter(f=>f.classified[i].color===current.color).length>=5?current.color:'?');
      if(colors[4]!=='?'&&colors[4]!==expected)return {...base,colors,status:'wrong-center',seenCenter:colors[4]};
      if(colors.includes('?'))return {...base,colors,status:'uncertain',reason:classified.find(c=>c.color==='?')?.reason||'changing'};
      return {...base,colors,status:'ready',ready:true};
    }
  }
  root.CubeClubVision={lab,colorDistance,classify,teachColor,profileReady,validReading,displacement,Consensus};
})(typeof globalThis!=='undefined'?globalThis:this);
