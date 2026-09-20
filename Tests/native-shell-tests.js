let checks=0;const assert=(v,m)=>{checks++;if(!v)throw Error(m);};
const tick=()=>new Promise(r=>setTimeout(r,30));
const snapshot=async()=>{syncNativeChrome();await tick();return await bridge('shellSnapshot');};
const command=async action=>{await bridge('shellTestCommand',{command:action});await tick();};
const click=async selector=>{const b=$(selector);assert(b&&!b.disabled,'Available control: '+selector);b.click();await tick();};
while(!document.querySelector('#content h1'))await tick();
assert(document.documentElement.dataset.shell==='mac','Native layout enabled');
assert(getComputedStyle($('.topbar')).display==='none','Duplicate web header stays hidden');
for(const selector of ['.sidebar','.app-footer'])assert(getComputedStyle($(selector)).display!=='none','Original clubhouse design visible: '+selector);
const selected=()=>document.querySelector('nav [aria-current="page"]')?.dataset.nav;
let s=await snapshot();assert(s.title==='My clubhouse'&&!s.back&&selected()==='home','Native home title selection and back state');
const startWidth=$('.main-shell').getBoundingClientRect().width;await command('sidebar');s=await snapshot();assert(getComputedStyle($('.sidebar')).display==='none'&&$('.main-shell').getBoundingClientRect().width>startWidth&&s.sidebar==='Show sidebar','Native toggle hides original sidebar and expands canvas');await command('sidebar');s=await snapshot();assert(getComputedStyle($('.sidebar')).display!=='none'&&s.sidebar==='Hide sidebar','Native toggle restores original sidebar');
await click('nav [data-nav="play"]');s=await snapshot();assert(s.title==='Practice playground'&&selected()==='play','Original sidebar updates native title');
for(const [destination,title] of [['learn','Cube Quest'],['play','Practice playground'],['detective','Case detective'],['team','Together time'],['timer','My solve timer'],['badges','My discoveries']]){
 await command(destination);s=await snapshot();assert(route===destination&&s.title===title&&selected()===destination&&s.back,'Native navigation: '+destination);assert(document.documentElement.scrollWidth<=innerWidth,'No content overflow: '+destination);
}
await command('learn');startLesson('hello');s=await snapshot();assert(s.title==='Meet your cube'&&selected()==='learn'&&s.back,'In-content lesson updates native title and sidebar');
busy=true;await command('play');await tick();s=await snapshot();assert(route==='lesson'&&selected()==='learn','Busy turn rejects navigation and keeps the original sidebar selection');busy=false;
await command('back');assert(route==='learn','Native back returns lesson to quest');
await command('voice');s=await snapshot();assert(progress.voice&&s.voice==='Turn read-aloud off','Native read-aloud toggle syncs');await command('voice');
await command('scan');s=await snapshot();assert(scan&&!scan.camera&&s.title==='Solve my cube','Native camera command opens review without starting camera');assert(!s.back&&!s.scan&&!s.settings,'Native toolbar is disabled during scan review');
await command('home');window.nativeCommand('home');assert(scan&&route==='learn','Native controls and direct commands cannot escape scan');closeModal();s=await snapshot();assert(selected()==='learn'&&s.settings,'Closing scan restores native destination and controls');
await command('settings');s=await snapshot();assert($('.settings-modal')&&!s.scan,'Settings opens from toolbar and locks navigation');
await click('[data-appearance="dark"]');assert(document.documentElement.dataset.theme==='dark','Dark appearance works in native shell');
const text=$('[data-preference="textSize"]');text.checked=true;text.dispatchEvent(new Event('change',{bubbles:true}));s=await snapshot();assert(document.documentElement.dataset.textSize==='large'&&parseFloat(getComputedStyle($('.settings-section>p')).fontSize)>=16,'Larger text still applies to teaching content');
assert(getComputedStyle($('.sidebar')).backgroundColor==='rgb(28, 45, 35)','Original dark green sidebar palette is restored');
await click('[data-settings-tab="progress"]');await click('[data-reset-kind="all"]');window.nativeCommand('back');window.openSettings();assert($('#reset-acknowledged')&&!$('#overlay').hidden,'Native shortcuts preserve reset acknowledgement');await click('[data-action="cancelReset"]');assert($('.settings-modal'),'Cancel reset still returns to settings');closeModal();
await command('timer');assert(!Quest.timerOpen(progress)&&!$('[data-action="timerStart"]'),'Native timer entry retains progression gate');
await command('learn');startLesson('cross');assert(!session&&$('#overlay').hidden===false,'Locked lesson still shows its prerequisites');closeModal();
progress.quest.grants=['speed'];progress.quest.independentSolve=true;save();
for(const destination of ['home','learn','play','detective','team','timer','badges']){await command(destination);assert(document.documentElement.scrollWidth<=innerWidth,destination+' large-text content fits native minimum size');}
for(const id of ['hello','cross-direct','pll-t']){startLesson(id);assert(document.documentElement.scrollWidth<=innerWidth,id+' lesson fits native minimum size');await command('back');}
await command('scan');assert(document.documentElement.scrollWidth<=innerWidth&&$('.modal').scrollWidth<=$('.modal').clientWidth,'Large-text scan fits narrow native canvas');closeModal();
await command('timer');startSolveTimer();await command('home');assert(solveTimer.phase==='review'&&progress.quest.times.length===0,'Native navigation stops timer without saving unconfirmed result');
await command('settings');await click('[data-appearance="light"]');assert(document.documentElement.dataset.theme==='light','Light appearance works in native shell');closeModal();assert(getComputedStyle($('.sidebar')).backgroundColor==='rgb(241, 243, 235)','Original light sidebar palette is restored');
return checks+' Mac toolbar integration checks passed: original sidebar, collapse, navigation, lessons, modal guards, themes and minimum-size layout';
