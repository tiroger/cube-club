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
function settings(section='appearance'){
 if(scan){toast('Close your cube review before opening settings.');return;}
 if(busy){toast('Let this turn finish, then open settings.');return;}
 playing=false;stopSpeech();if(route==='timer')timerLeaving();
 settingsSection=['appearance','learning','progress'].includes(section)?section:'appearance';resetIntent=null;
 const p=progress.preferences;
 showModal(`<div class="modal-title settings-heading"><div><div class="eyebrow">SETTINGS & GROWN-UP CORNER</div><h2>Make it feel like yours.</h2><p>A comfortable place to look, learn, and try again.</p></div><button class="icon-button" data-action="closeModal" aria-label="Close settings">${icon('close')}</button></div><div class="settings-tabs" role="group" aria-label="Settings sections">${[['appearance','Look & feel'],['learning','Learning & camera'],['progress','Progress']].map(([id,label])=>`<button data-settings-tab="${id}" aria-pressed="${settingsSection===id}">${label}</button>`).join('')}</div><div class="settings-content">${settingsSection==='appearance'?`<section class="settings-section"><h3>Choose your clubhouse</h3><p>Follow your Mac, or choose the look you like best.</p><div class="appearance-options" role="group" aria-label="Appearance">${[['system','Follow my Mac','Changes with macOS','cube'],['light','Light','Warm paper & soft colors','sun'],['dark','Dark','A cozy evening clubhouse','star']].map(([id,title,detail,symbol])=>`<button data-appearance="${id}" aria-pressed="${p.appearance===id}" class="appearance-option appearance-${id}"><span class="appearance-preview">${icon(symbol)}<i></i><i></i></span><strong>${title}</strong><small>${detail}</small><span class="appearance-selected">${p.appearance===id?'✓ Selected':'Choose'}</span></button>`).join('')}</div></section><section class="settings-section"><h3>Make reading comfortable</h3>${settingToggle('textSize','Larger text','Bigger instructions, lesson cards and buttons.','large'===p.textSize,true)}${settingToggle('reduceMotion','Reduce motion','Show the result of each turn without the spinning animation. Also follows your Mac’s Reduce Motion setting.',p.reduceMotion,true)}<p class="small-note">The cube’s six sticker colors stay the same in every appearance.</p></section>`:settingsSection==='learning'?`<section class="settings-section"><h3>Learning your way</h3>${settingToggle('voice','Read moves aloud','Automatically read instructions. Individual read-aloud buttons remain available.',progress.voice)}${settingToggle('slow','Take it slowly','Give each animated turn extra time. No time limit on lessons or challenges.',progress.slow)}${settingToggle('labels','Show face letters','Label the practice cube’s centers to help match R, U and F.',progress.labels)}</section><section class="settings-section"><h3>Camera help</h3>${settingToggle('autoCapture','Read automatically when steady','Save this choice for new scans and move checks. Every captured face still pauses for your review.',p.autoCapture,true)}<div class="settings-note">${icon('camera')}<p>The camera starts only when you choose “Use my camera.” Pictures stay on this Mac and are never saved. Manual color entry is always available.</p></div></section>`:`<section class="settings-section"><h3>Your learning journey</h3><p>${LESSONS.filter(l=>Quest.mastered(progress,l.id)).length} lessons mastered · ${progress.quest.graduated.length} stages graduated · ${progress.quest.times.length} saved solve times.</p>${parentControls()}${progress.quest.grants.length?'<button class="button secondary" data-reset-kind="locks">Restore lesson locks</button><p class="small-note">Remove parent overrides and follow the learning path again. Earned mastery and graduations stay saved.</p>':''}</section><section class="settings-section"><h3>A fresh start, big or small</h3><div class="settings-reset-row"><div><strong>Clear timer history</strong><p>Remove saved times and personal bests. Keep lessons, badges, and timer access.</p></div><button class="button secondary" data-reset-kind="times" ${progress.quest.times.length?'':'disabled'}>Clear times…</button></div><div class="settings-reset-row"><div><strong>Reset all progress</strong><p>Start Cube Quest from the beginning. Clear lessons, badges, challenges, graduations, parent overrides, and solve times.</p></div><button class="button danger" data-reset-kind="all">Reset all progress…</button></div><p class="small-note">Appearance, reading, motion, voice, and camera preferences stay as you chose them.</p></section>`}</div><div class="settings-footer"><span>Saved automatically on this Mac</span><span>Cube Club 0.7.1 · Standard 3×3</span></div>`,'settings-modal','Cube Club settings');
 $('#overlay .modal').scrollTop=0;
}
window.openSettings=()=>{if(!$('#overlay').hidden&&!$('.settings-modal'))return;settings();};
function resetConfirmation(kind){
 if(!['all','times','locks'].includes(kind))return;
 resetIntent=kind;
 const copy={all:['Reset all learning progress?','This clears every lesson’s exploration and mastery, all discovery badges and practice results, guided-solve counts, graduations, parent overrides, independent-solve confirmation, and saved timer history. The first beginner lesson will be open again.','I understand that all learning progress and solve times will be cleared.','Reset all progress'],times:['Clear saved solve times?','This removes all saved times, personal bests, and timer reflections. Your lessons, badges and access to the timer stay as they are.','I understand that saved solve times will be cleared.','Clear timer history'],locks:['Restore the learning path’s locks?','This removes parent starting-stage overrides. Lessons and stages will follow their usual prerequisites again. Earned mastery, completed graduations and solve times stay saved.','I want to remove parent overrides and restore progression locks.','Restore lesson locks']}[kind];
 showModal(`<div class="modal-title"><div><div class="eyebrow">GROWN-UP CORNER</div><h2>${copy[0]}</h2></div><button class="icon-button" data-action="cancelReset" aria-label="Cancel reset">${icon('close')}</button></div><p>${copy[1]}</p>${kind!=='locks'?'<p class="reset-warning">This cannot be undone. Your app preferences will be kept.</p>':''}<label class="quest-confirm"><input type="checkbox" id="reset-acknowledged"><span>${copy[2]}</span></label><div class="reset-actions"><button class="button secondary" data-action="cancelReset">Keep my progress</button><button class="button ${kind==='locks'?'primary':'danger'}" data-action="confirmReset" disabled>${copy[3]}</button></div>`,'small-modal','Confirm progress change');
 $('#overlay .modal').scrollTop=0;
}
async function confirmReset(){
 const kind=resetIntent;if(!kind||!$('#reset-acknowledged')?.checked)return;
 // End the active lesson/timer before changing progress, so pending animation
 // work cannot award a milestone again after the reset.
 if(busy){toast('Let the current turn finish before resetting.');return;}
 const before=normalizeProgress(JSON.parse(JSON.stringify(progress)));
 cancelPlayback();resetIntent=null;
 if(kind==='all'){
  clearInterval(timerInterval);timerInterval=null;solveTimer={phase:'ready',elapsed:0};
  progress=CubeClubCore.resetLearningProgress(progress);
 }else if(kind==='times'){
  clearInterval(timerInterval);timerInterval=null;solveTimer={phase:'ready',elapsed:0};progress.quest.times=[];
 }else if(kind==='locks')progress.quest.grants=[];
 if(!await save()){progress=before;resetIntent=kind;toast('Progress could not be reset. Your saved progress is unchanged. Please try again.');return;}closeModal();navigate(kind==='all'?'home':'learn');applyPreferences(false);
 toast(kind==='all'?'A fresh Cube Quest is ready. Your settings stayed just right.':kind==='times'?'Saved solve times cleared. Your learning progress is safe.':'Progression locks restored. Earned skills stay with you.');
}
async function settingsClick(d){
 if(d.settingsTab){settings(d.settingsTab);$(`[data-settings-tab="${settingsSection}"]`)?.focus({preventScroll:true});return true;}
 if(d.appearance){if(!['system','light','dark'].includes(d.appearance))return true;progress.preferences.appearance=d.appearance;applyPreferences();await save();settings('appearance');$(`[data-appearance="${d.appearance}"]`)?.focus({preventScroll:true});return true;}
 if(d.resetKind){resetConfirmation(d.resetKind);return true;}
 if(d.action==='cancelReset'){resetIntent=null;settings('progress');return true;}
 if(d.action==='confirmReset'){await confirmReset();return true;}
 return false;
}
function settingsChange(target){
 if(target.id==='reset-acknowledged'){const b=$('[data-action="confirmReset"]');if(b)b.disabled=!target.checked;return true;}
 const key=target.dataset.preference;if(!['textSize','reduceMotion','autoCapture'].includes(key))return false;
 progress.preferences[key]=key==='textSize'?(target.checked?'large':'standard'):target.checked;
 applyPreferences(false);save();return true;
}
