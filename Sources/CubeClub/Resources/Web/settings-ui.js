/* Preferences stay separate from learning milestones, even after a fresh start. */
let settingsSection='appearance',resetIntent=null;
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
function applyPreferences(notifyNative=true){
 const p=progress.preferences,mode=p.appearance;
 document.documentElement.dataset.theme=mode==='system'?(systemTheme.matches?'dark':'light'):mode;
 document.documentElement.dataset.textSize=p.textSize;
 document.documentElement.dataset.reduceMotion=String(p.reduceMotion||systemMotion.matches);
 if(notifyNative&&native)bridge('appearance',{mode});
 view?.draw();syncNativeChrome();
}
function turnDuration(slow=800,regular=350){return progress.preferences.reduceMotion||systemMotion.matches?0:progress.slow?slow:regular;}
systemTheme.addEventListener?.('change',()=>applyPreferences(false));
systemMotion.addEventListener?.('change',()=>applyPreferences(false));
function settingToggle(key,title,description,checked,preference=false){return `<label class="setting-row"><span><strong>${title}</strong><p>${description}</p></span><input type="checkbox" ${preference?'data-preference':'data-setting'}="${key}" ${checked?'checked':''}></label>`;}
// The read-aloud voices: natural recordings bundled with the app (voice.js). Tapping one picks it and plays a sample.
function voiceSettings(){
 const now=currentVoice();
 return `<section class="settings-section" id="voice-settings"><h3>Read-aloud voice</h3><p>Every line is recorded with a natural voice. Tap one to hear it.</p><div class="voice-choices" role="radiogroup" aria-label="Read-aloud voice">${VOICES.map(v=>`<button class="voice-choice" role="radio" aria-checked="${v.id===now}" data-voice="${v.id}"><span class="voice-mark">${icon(v.id===now?'check':'sound')}</span><strong>${v.name}</strong><small>${v.note}</small></button>`).join('')}</div></section>`;
}
// Update state lives in Sparkle on the native side; the Progress tab asks for it when it opens.
let updates=null;
function updateSettings(){
 const checked=updates.lastChecked?`Last checked ${new Date(updates.lastChecked).toLocaleDateString()}.`:'Not checked yet.';
 return html`<h3>Stay up to date</h3><label class="setting-row"><span><strong>Update automatically</strong><p>Once a day, Cube Club asks GitHub whether a newer version is ready. A new version downloads quietly and installs the next time Cube Club quits. GitHub sees this Mac’s internet address; progress, pictures and names are never sent.</p></span><input type="checkbox" id="auto-updates" ${updates.automatic?raw('checked'):''}></label><div class="settings-reset-row"><div><strong>Cube Club ${updates.version}</strong><p>${checked}</p></div><button class="button secondary" data-action="checkForUpdates" ${updates.canCheck?'':raw('disabled')}>Check now</button></div>`.toString();
}
function showUpdates(state){
 const section=$('#update-settings');
 if(!state||state.error||!state.available){if(section)section.hidden=true;return;}
 updates=state;
 if(section){section.innerHTML=updateSettings();section.hidden=false;}
}
async function refreshUpdates(){if(native)showUpdates(await bridge('updateState'));}
function settings(section='appearance'){
 if(scan){toast('Close your cube review before opening settings.');return;}
 if(busy){toast('Let this turn finish, then open settings.');return;}
 playing=false;stopSpeech();rememberSession();if(route==='timer')timerLeaving();
 settingsSection=['appearance','learning','progress'].includes(section)?section:'appearance';resetIntent=null;
 const p=progress.preferences;
 showModal(`<div class="modal-title settings-heading"><div><div class="eyebrow">SETTINGS & GROWN-UP CORNER</div><h2>Make it feel like yours.</h2><p>A comfortable place to look, learn, and try again.</p></div><button class="icon-button" data-action="closeModal" aria-label="Close settings">${icon('close')}</button></div><div class="settings-tabs" role="group" aria-label="Settings sections">${[['appearance','Look & feel'],['learning','Learning & camera'],['progress','Progress']].map(([id,label])=>`<button data-settings-tab="${id}" aria-pressed="${settingsSection===id}">${label}</button>`).join('')}</div><div class="settings-content">${settingsSection==='appearance'?`<section class="settings-section"><h3>Choose your clubhouse</h3><p>Follow your ${DEVICE}, or choose the look you like best.</p><div class="appearance-options" role="group" aria-label="Appearance">${[['system','Follow my '+DEVICE,(DEVICE==='iPad'?'Changes with iPadOS':'Changes with macOS'),'cube'],['light','Light','Warm paper & soft colors','sun'],['dark','Dark','A cozy evening clubhouse','star']].map(([id,title,detail,symbol])=>`<button data-appearance="${id}" aria-pressed="${p.appearance===id}" class="appearance-option appearance-${id}"><span class="appearance-preview">${icon(symbol)}<i></i><i></i></span><strong>${title}</strong><small>${detail}</small><span class="appearance-selected">${p.appearance===id?'✓ Selected':'Choose'}</span></button>`).join('')}</div></section><section class="settings-section"><h3>Make reading comfortable</h3>${settingToggle('textSize','Larger text','Bigger instructions, lesson cards and buttons.','large'===p.textSize,true)}${settingToggle('reduceMotion','Reduce motion','Show the result of each turn without the spinning animation. Also follows your '+DEVICE+'’s Reduce Motion setting.',p.reduceMotion,true)}<p class="small-note">The cube’s six sticker colors stay the same in every appearance.</p></section>`:settingsSection==='learning'?`<section class="settings-section"><h3>Learning your way</h3>${settingToggle('voice','Read moves aloud','Automatically read instructions. Individual read-aloud buttons remain available.',progress.voice)}${settingToggle('slow','Take it slowly','Give each animated turn extra time. No time limit on lessons or challenges.',progress.slow)}${settingToggle('labels','Show face letters','Label the practice cube’s centers to help match R, U and F.',progress.labels)}<div class="settings-reset-row"><div><strong>Welcome tour</strong><p>Show the quick tour of the clubhouse, lessons and turns again.</p></div><button class="button secondary" data-action="replayTours">Show me around</button></div></section>${voiceSettings()}<section class="settings-section"><h3>Camera help</h3>${settingToggle('autoCapture','Read automatically when steady','Save this choice for new scans and move checks. Every captured face still pauses for your review.',p.autoCapture,true)}${calibrationSettings()}<div class="settings-note">${icon('camera')}<p>The camera starts only when you choose “Use my camera.” Pictures stay on this ${DEVICE} and are never saved. Manual color entry is always available.</p></div></section>`:`<section class="settings-section"><h3>Your learning journey</h3><p>${LESSONS.filter(l=>Quest.mastered(progress,l.id)).length} lessons mastered · ${progress.quest.graduated.length} stages graduated · ${progress.quest.times.length} saved solve times.</p>${parentControls()}${progress.quest.grants.length?'<button class="button secondary" data-reset-kind="locks">Restore lesson locks</button><p class="small-note">Remove parent overrides and follow the learning path again. Earned mastery and graduations stay saved.</p>':''}</section>${backupSettings()}${native?'<section class="settings-section" id="update-settings" hidden></section>':''}<section class="settings-section"><h3>A fresh start, big or small</h3><div class="settings-reset-row"><div><strong>Clear timer history</strong><p>Remove saved times and personal bests. Keep lessons, badges, and timer access.</p></div><button class="button secondary" data-reset-kind="times" ${progress.quest.times.length?'':'disabled'}>Clear times…</button></div><div class="settings-reset-row"><div><strong>Reset all progress</strong><p>Start Cube Quest from the beginning. Clear lessons, badges, challenges, graduations, parent overrides, and solve times.</p></div><button class="button danger" data-reset-kind="all">Reset all progress…</button></div><p class="small-note">Appearance, reading, motion, voice, and camera preferences stay as you chose them.</p></section>`}</div><div class="settings-footer"><span>Saved automatically on this ${DEVICE}</span><span>Cube Club 0.14.0 · Standard 3×3</span></div>`,'settings-modal','Cube Club settings');
 $('#overlay .modal').scrollTop=0;
 if(settingsSection==='progress')refreshUpdates();
}
window.openSettings=()=>{if(!$('#overlay').hidden&&!$('.settings-modal'))return;settings();};
function resetConfirmation(kind){
 if(!['all','times','locks'].includes(kind))return;
 resetIntent=kind;
 const copy={all:['Reset all learning progress?','This clears every lesson’s exploration and mastery, all discovery badges and practice results, guided-solve counts, graduations, parent overrides, independent-solve confirmation, saved lesson and cube solve, and timer history. The first beginner lesson will be open again.','I understand that all learning progress and solve times will be cleared.','Reset all progress'],times:['Clear saved solve times?','This removes all saved times, personal bests, and timer reflections. Your lessons, badges and access to the timer stay as they are.','I understand that saved solve times will be cleared.','Clear timer history'],locks:['Restore the learning path’s locks?','This removes parent starting-stage overrides. Lessons and stages will follow their usual prerequisites again. Earned mastery, completed graduations and solve times stay saved.','I want to remove parent overrides and restore progression locks.','Restore lesson locks']}[kind];
 showModal(`<div class="modal-title"><div><div class="eyebrow">GROWN-UP CORNER</div><h2>${copy[0]}</h2></div><button class="icon-button" data-action="cancelReset" aria-label="Cancel reset">${icon('close')}</button></div><p>${copy[1]}</p>${kind!=='locks'?'<p class="reset-warning">Save a backup first if you may want this journey back. Your app preferences and learned camera colors will be kept.</p>':''}<label class="quest-confirm"><input type="checkbox" id="reset-acknowledged"><span>${copy[2]}</span></label><div class="reset-actions"><button class="button secondary" data-action="cancelReset">Keep my progress</button><button class="button ${kind==='locks'?'primary':'danger'}" data-action="confirmReset" disabled>${copy[3]}</button></div>`,'small-modal','Confirm progress change');
 $('#overlay .modal').scrollTop=0;
}
async function confirmReset(){
 const kind=resetIntent;if(!kind||!$('#reset-acknowledged')?.checked)return;
 // End the active lesson/timer before changing progress, so pending animation
 // work cannot award a milestone again after the reset.
 if(busy){toast('Let the current turn finish before resetting.');return;}
 const before=normalizeProgress(JSON.parse(JSON.stringify(progress))),beforeSession=session;
 cancelPlayback();resetIntent=null;
 if(kind==='all'){
  clearInterval(timerInterval);timerInterval=null;solveTimer={phase:'ready',elapsed:0};
  progress=CubeClubCore.resetLearningProgress(progress);session=null;
 }else if(kind==='times'){
  clearInterval(timerInterval);timerInterval=null;solveTimer={phase:'ready',elapsed:0};progress.quest.times=[];
 }else if(kind==='locks'){progress.quest.grants=[];const saved=progress.savedSessions.lesson;if(saved&&!Quest.canOpen(progress,saved.lessonID))progress.savedSessions.lesson=null;}
 if(!await save()){progress=before;session=beforeSession;resetIntent=kind;toast('Progress could not be reset. Your saved progress is unchanged. Please try again.');return;}closeModal();navigate(kind==='all'?'home':'learn');applyPreferences(false);
 toast(kind==='all'?'A fresh Cube Quest is ready. Your settings stayed just right.':kind==='times'?'Saved solve times cleared. Your learning progress is safe.':'Progression locks restored. Earned skills stay with you.');
}
async function settingsClick(d){
 if(d.settingsTab){settings(d.settingsTab);$(`[data-settings-tab="${settingsSection}"]`)?.focus({preventScroll:true});return true;}
 if(d.appearance){if(!['system','light','dark'].includes(d.appearance))return true;progress.preferences.appearance=d.appearance;applyPreferences();await save();settings('appearance');$(`[data-appearance="${d.appearance}"]`)?.focus({preventScroll:true});return true;}
 if(d.resetKind){resetConfirmation(d.resetKind);return true;}
 if(d.action==='cancelReset'){resetIntent=null;settings('progress');return true;}
 if(d.action==='confirmReset'){await confirmReset();return true;}
 if(d.action==='checkForUpdates'){showUpdates(await bridge('checkForUpdates'));return true;}
 if(d.voice){if(!VOICES.some(v=>v.id===d.voice))return true;progress.preferences.voice=d.voice;save();speak(VOICE_SAMPLE);$('#voice-settings').outerHTML=voiceSettings();$(`[data-voice="${d.voice}"]`)?.focus({preventScroll:true});return true;}
 if(d.action==='replayTours'){replayTours();return true;}
 return false;
}
function settingsChange(target){
 if(target.id==='reset-acknowledged'){const b=$('[data-action="confirmReset"]');if(b)b.disabled=!target.checked;return true;}
 if(target.id==='auto-updates'){bridge('setAutomaticUpdates',{enabled:target.checked}).then(showUpdates);return true;}
 const key=target.dataset.preference;if(!['textSize','reduceMotion','autoCapture'].includes(key))return false;
 progress.preferences[key]=key==='textSize'?(target.checked?'large':'standard'):target.checked;
 applyPreferences(false);save();return true;
}
