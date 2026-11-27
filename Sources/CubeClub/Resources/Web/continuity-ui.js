/* Two saved places: a lesson never displaces a physical-cube solve. */
const Continuity=CubeClubContinuity;
let resumePending=null,restorePending=null,continuityWorking=false,sessionSaveFailed=false;
function savedPlaces(){
 const saved=progress.savedSessions;
 if(!saved.lesson&&!saved.solve)return '';
 return `<section class="saved-places" aria-label="Saved adventures"><div><div class="eyebrow">RIGHT WHERE YOU LEFT OFF</div><h2>A little break. Then another turn.</h2><p>Your lesson and cube solve each keep their own place.</p></div><div class="saved-place-grid">${['lesson','solve'].filter(type=>saved[type]).map(type=>{const s=saved[type],title=type==='lesson'?LESSONS.find(l=>l.id===s.lessonID).title:s.method==='beginner'?'My beginner cube solve':'My guided cube solve';return `<article class="saved-place"><span class="saved-place-icon">${icon(type==='lesson'?'book':'cube')}</span><div><h3>${title}</h3><p>${s.index} of ${moves(s.algorithm).length} turns completed${type==='lesson'?' · '+{guide:'Watching',recall:'Your turn',check:'Gold star try'}[s.mode]:''}</p><small>Saved ${new Date(s.updatedAt).toLocaleDateString()}</small></div><button class="button primary" data-resume="${type}">Continue ${icon('arrow')}</button></article>`;}).join('')}</div></section>`;
}
function pauseControl(){return `<div class="save-place-control"><span id="session-save-status" role="status">${sessionSaveFailed?'Your latest turn is not saved yet. Try saving again.':'Your place saves after each completed turn.'}</span><button class="button secondary" data-action="pauseSession" ${busy?'disabled':''}>${icon('pause')}Save & take a break</button></div>`;}
async function rememberSession(force=false){
 if(busy||!session||!['lesson','solve'].includes(session.type))return true;
 const type=session.type,previous=progress.savedSessions[type],next=Continuity.capture(session,progress);
 const compare=s=>s?JSON.stringify({...s,updatedAt:0}):'null';
 if(!force&&compare(previous)===compare(next))return !sessionSaveFailed;
 progress.savedSessions[type]=next;
 const ok=await save();sessionSaveFailed=!ok;
 const status=$('#session-save-status');if(status)status.textContent=ok?'Your place is saved on this '+DEVICE+'.':'Your latest turn is not saved yet. Try saving again.';
 return ok;
}
async function pauseSession(){
 if(busy||continuityWorking)return;
 playing=false;stopSpeech();if(session)updateSequence();
 continuityWorking=true;
 const ok=await rememberSession(true);continuityWorking=false;
 if(ok){closeModal();navigate('home');toast('Your place is saved. Come back whenever you like.');}
}
function resumeFace(state,face){
 const top=face==='U'?'B':face==='D'?'F':'U';
 return faceDiagram(state,face,[0,1,2,3,4,5,6,7,8]).replace(`${face} · ${FACE_NAMES[face]}`,`${face} · ${COLOR_NAMES[face]}<small>↑ ${COLOR_NAMES[top]} at top</small>`);
}
function showResume(type){
 if(busy||continuityWorking)return;
 const saved=progress.savedSessions[type];if(!saved)return;
 playing=false;stopSpeech();
 const result=Continuity.restore(saved,progress);
 if(result.error){toast(result.error);return;}
 resumePending=result;
 const s=result.session,solve=s.type==='solve';
 showModal(`<div class="modal-title"><div><div class="eyebrow">WELCOME BACK, CURIOUS CUBER</div><h2>${result.restarted?'A fresh gold star try.':'Find your place together.'}</h2></div><button class="icon-button" data-action="closeModal" aria-label="Cancel resume">${icon('close')}</button></div><p>${result.restarted?'Gold star tries start from the beginning after a break. Everything you finished is still saved.':solve?'Before the next turn, check your real cube against these six faces. The camera stays off until you choose to use it.':'Your practice cube will return to this spot. If you are using a real cube too, check that its colors match.'}</p><p><strong>Hold yellow up and green toward you.</strong> Use each diagram’s face label to compare the stickers.</p><div class="piece-map-grid resume-faces">${FACES.map(f=>resumeFace(s.cube.asString(),f)).join('')}</div><p class="small-note">${s.index} of ${s.algorithm.length} turns completed. ${solve?'If your cube has changed, scan it again to get a new guide.':'Using just the screen? The practice cube is ready for you.'}</p><div class="reset-actions"><button class="button primary" data-action="confirmResume">${solve?'My cube matches · continue':result.restarted?'Start my gold star try':'Continue my lesson'} ${icon('play')}</button>${solve?'<button class="button secondary" data-action="resumeRescan">My cube changed · scan again</button>':''}<button class="text-button" data-action="closeModal">Come back later</button></div>`,'resume-modal','Resume saved adventure');
 $('#overlay .modal').scrollTop=0;
}
function confirmResume(){
 if(!resumePending||continuityWorking||busy)return;
 const result=resumePending;rememberSession();closeModal();if(route==='timer')timerLeaving();cancelPlayback();view?.destroy();
 session=result.session;route=session.type;busy=false;playing=false;render();rememberSession();
 if(session.type==='lesson'&&session.index===session.algorithm.length)completion(session.lesson);
}
function backupSettings(){return `<section class="settings-section"><h3>Keep your discoveries safe</h3><p>A backup keeps your progress, settings, saved lesson and cube solve, and learned camera colors together. Save it somewhere you can find again.</p><div class="reset-actions"><button class="button secondary" data-action="exportBackup">Save a backup…</button><button class="button secondary" data-action="importBackup">Restore a backup…</button></div><p class="small-note">Restoring replaces the current journey after your review. A recovery copy of the previous journey stays on this ${DEVICE}.</p><button class="text-button" data-action="restoreRecovery">Recover the journey from before the last restore…</button></section>`;}
function calibrationSettings(){const c=progress.calibration,n=Object.keys(c?.colors||{}).length;return `<div class="settings-reset-row"><div><strong>Remembered cube colors</strong><p>${n?`${n} of 6 colors saved on ${new Date(c.updatedAt).toLocaleDateString()}. ${n===6?'Ready for camera scans.':'Teach the remaining centers in the scanner.'}`:'No colors learned yet. Use “Match my cube’s colors” in the scanner.'} Re-teach after changing the cube, camera, or room lighting.</p></div><button class="button secondary" data-action="forgetCalibration" ${n?'':'disabled'}>Forget learned colors</button></div>`;}
async function exportBackup(){
 if(continuityWorking||busy)return;continuityWorking=true;
 await rememberSession();
 const result=await bridge('exportBackup',{value:Continuity.encode(progress)});
 continuityWorking=false;
 if(result.error)toast(result.error);else if(result.ok)toast('Your Cube Club backup is saved.');
}
async function importBackup(recovery=false){
 if(continuityWorking||busy)return;playing=false;stopSpeech();continuityWorking=true;
 const result=recovery?(native?await bridge('loadRecovery'):{value:localStorage.getItem('cubeclub.recovery.v1')}):await bridge('importBackup');
 continuityWorking=false;
 if(result.cancelled)return;
 if(result.error){toast(result.error);return;}
 if(!result.value){toast('There is no recovery copy yet. One is kept when you restore a backup.');return;}
 let decoded;
 try{decoded=Continuity.decode(recovery?Continuity.encode(JSON.parse(result.value)):result.value);}catch(_){decoded={error:'The recovery copy could not be read. Your current journey is unchanged.'};}
 if(decoded.error){toast(decoded.error);return;}
 restorePending=decoded;
 const p=decoded.progress;
 showModal(`<div class="modal-title"><div><div class="eyebrow">GROWN-UP CORNER · ${recovery?'RECOVERY COPY':'BACKUP PREVIEW'}</div><h2>Bring this journey back?</h2></div><button class="icon-button" data-action="cancelRestore" aria-label="Cancel restore">${icon('close')}</button></div>${recovery?'':`<p>Backup saved ${new Date(decoded.createdAt).toLocaleString()}.</p>`}<div class="backup-summary"><div><strong>${LESSONS.filter(l=>Quest.mastered(p,l.id)).length}</strong><span>mastered lessons</span></div><div><strong>${p.quest.times.length}</strong><span>solve times</span></div><div><strong>${Object.values(p.savedSessions).filter(Boolean).length}</strong><span>saved places</span></div><div><strong>${Object.keys(p.calibration?.colors||{}).length}/6</strong><span>learned colors</span></div></div><p class="reset-warning">This replaces the progress, settings, saved sessions, and calibration currently on this ${DEVICE}. A recovery copy of your current journey will be kept.</p><p class="small-note">Learned colors travel with the backup. Re-teach them if this ${DEVICE}’s camera or lighting is different.</p><label class="quest-confirm"><input type="checkbox" id="restore-acknowledged"><span>I want to replace this ${DEVICE}’s journey with the reviewed backup.</span></label><div class="reset-actions"><button class="button secondary" data-action="cancelRestore">Keep current journey</button><button class="button primary" data-action="confirmRestore" disabled>Restore this journey</button></div><p id="restore-error" class="scan-error" role="status"></p>`,'settings-modal','Review Cube Club backup');
 $('#overlay .modal').scrollTop=0;
}
async function confirmRestore(){
 if(!restorePending||!$('#restore-acknowledged')?.checked||continuityWorking||busy)return;
 continuityWorking=true;const button=$('[data-action="confirmRestore"]');button.disabled=true;
 const next=restorePending.progress,value=JSON.stringify(next);let result;
 if(native)result=await bridge('restoreProgress',{value});
 else{try{localStorage.setItem('cubeclub.recovery.v1',JSON.stringify(progress));localStorage.setItem('cubeclub.progress.v1',value);result={ok:true};}catch(_){result={error:'Could not restore on this device. Your current journey is unchanged.'};}}
 continuityWorking=false;
 if(result.error||!result.ok){$('#restore-error').textContent=result.error||'The restore did not finish. Your journey is unchanged.';button.disabled=false;return;}
 cancelPlayback();clearInterval(timerInterval);timerInterval=null;solveTimer={phase:'ready',elapsed:0};view?.destroy();view=null;session=null;
 progress=next;cameraPalette=JSON.parse(JSON.stringify(progress.calibration?.colors||{}));sessionSaveFailed=false;closeModal();route='home';applyPreferences();render();toast('Your journey is back. Saved adventures are ready to continue.');
}
async function persistCameraPalette(colors){
 if(continuityWorking)return false;continuityWorking=true;
 const previous=progress.calibration,next=Object.keys(colors).length?{colors:JSON.parse(JSON.stringify(colors)),updatedAt:Date.now()}:null;
 progress.calibration=next;
 if(!await save()){progress.calibration=previous;continuityWorking=false;return false;}
 continuityWorking=false;cameraPalette=JSON.parse(JSON.stringify(colors));if(scan)scan.vision=null;return true;
}
async function continuityClick(d){
 if(d.resume){showResume(d.resume);return true;}
 switch(d.action){
 case 'pauseSession':await pauseSession();return true;
 case 'confirmResume':confirmResume();return true;
 case 'resumeRescan':closeModal();newScan();return true;
 case 'exportBackup':await exportBackup();return true;
 case 'importBackup':await importBackup();return true;
 case 'restoreRecovery':await importBackup(true);return true;
 case 'cancelRestore':closeModal();settings('progress');return true;
 case 'confirmRestore':await confirmRestore();return true;
 case 'forgetCalibration':case 'resetCameraColors':if(await persistCameraPalette({})){if(scan)renderScan();else settings('learning');toast('Learned colors forgotten. You can teach them again anytime.');}return true;
 }
 return false;
}
