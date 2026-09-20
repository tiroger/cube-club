/* The Mac shell and the browser preview share the same learning state and gates. */
if(window.cubeClubNativeShell)document.documentElement.dataset.shell='mac';
let lastChromeState='';
function nativeChromeState(){
 const titles={home:'My clubhouse',learn:'Cube Quest',play:'Practice playground',badges:'My discoveries',lesson:session?.lesson?.title||'Cube Quest',solve:'Solve my cube',detective:'Case detective',team:'Together time',patterns:'Pattern practice',timer:'My solve timer'};
 return {title:scan?'Solve my cube':titles[route]||'Cube Club',destination:scan?'scan':route==='lesson'||route==='patterns'?'learn':route==='solve'?'scan':route,parent:route==='lesson'||route==='patterns'?'learn':route==='home'?'':'home',voice:progress.voice,sidebarHidden:document.documentElement.dataset.sidebarHidden==='true',modal:!$('#overlay').hidden};
}
function syncNativeChrome(force=false){
 if(!window.cubeClubNativeShell||!native)return;
 const state=nativeChromeState(),serialized=JSON.stringify(state);
 if(!force&&serialized===lastChromeState)return;
 lastChromeState=serialized;bridge('chromeState',state);
}
window.nativeCommand=action=>{
 // Native controls cannot bypass a review, reset acknowledgement, or lesson gate.
 if(!$('#overlay').hidden){syncNativeChrome(true);return;}
 if(busy){toast('Let this turn finish, then choose your next adventure.');syncNativeChrome(true);return;}
 if(action==='sidebar'){document.documentElement.dataset.sidebarHidden=String(document.documentElement.dataset.sidebarHidden!=='true');}
 else if(['home','learn','play','detective','team','timer','badges'].includes(action))navigate(action);
 else if(action==='scan')newScan();
 else if(action==='settings')settings();
 else if(action==='back'){const parent=nativeChromeState().parent;if(parent)navigate(parent);}
 else if(action==='voice'){
  progress.voice=!progress.voice;save();updateVoice();
  if(!progress.voice)stopSpeech();
 }
 syncNativeChrome();
};
