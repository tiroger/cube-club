/* The three new learning experiences use the same cube, camera and progress store. */
const Coach=CubeClubCoach;

function faceDiagram(state,face,highlight=[],size=''){
 const colors=Coach.faceString(state,face);
 return `<div class="face-diagram ${size}"><span class="diagram-label">${face} · ${FACE_NAMES[face]}</span><div class="diagram-grid" role="img" aria-label="${FACE_NAMES[face]} face. Outlined stickers: ${highlight.map(i=>`row ${Math.floor(i/3)+1}, column ${i%3+1}, ${COLOR_NAMES[colors[i]]}`).join('; ')}">${[...colors].map((color,i)=>`<span class="diagram-cell ${highlight.includes(i)?'clue':'muted-cell'}" style="--sticker:${COLORS[color]}" aria-label="Row ${Math.floor(i/3)+1}, column ${i%3+1}: ${COLOR_NAMES[color]}">${highlight.includes(i)?COLOR_NAMES[color][0].toUpperCase():''}</span>`).join('')}</div></div>`;
}
function clueDiagram(challenge,small=false){
 const state=Coach.challengeState(challenge);
 return `<div class="clue-diagrams ${small?'compact':''}">${challenge.kind==='yellow'?faceDiagram(state,'U',[1,3,4,5,7]):challenge.kind==='edge'?faceDiagram(state,'U',[7])+faceDiagram(state,'F',[1,4]):faceDiagram(state,'U',[8])+faceDiagram(state,'F',[2])+faceDiagram(state,'R',[0])}</div>`;
}
function detectivePage(){
 if(session?.type!=='detective')return `<div class="page-intro"><div class="eyebrow">${icon('search')}LOOK BEFORE YOU TURN</div><h1>Hello, <em>cube detective.</em></h1><p>Every cube has clues. Find the shape, match the colors, and decide what comes next.</p></div><div class="pattern-invite compact-invite"><div><h2>Ready for cross and pair clues?</h2><p>Practice recognizing the ideas from your next-step lessons.</p></div><button class="button secondary" data-nav="patterns">Cross + F2L practice ${icon('arrow')}</button></div><div class="detective-progress"><span>${progress.detective.length} of ${Coach.CHALLENGES.length} clues discovered</span><span>No timer. Take a good look.</span></div><div class="case-grid">${Coach.CHALLENGES.map((c,i)=>`<button class="case-card" data-challenge="${c.id}"><div class="case-art">${clueDiagram(c,true)}<span class="step-pill">CLUE ${String(i+1).padStart(2,'0')}</span></div><div class="card-body"><h3>${c.title}</h3><p>${c.kind==='yellow'?'Find the shape on top.':c.kind==='edge'?'Match an edge to its home.':'Give a corner its address.'}</p><div class="card-link">${progress.detective.includes(c.id)?'Discovered · try again':'Open this case'}${icon(progress.detective.includes(c.id)?'check':'arrow')}</div></div></button>`).join('')}</div>`;
 const c=session.challenge;
 return `<div class="lesson-top"><button class="back-link" data-nav="detective">${icon('arrow')}All the clues</button><span class="eyebrow">CASE ${Coach.CHALLENGES.indexOf(c)+1} OF ${Coach.CHALLENGES.length}</span></div><div class="lesson-layout">${stage()}<div class="lesson-copy"><div class="eyebrow">${icon('search')}FOLLOW THE OUTLINED STICKERS</div><h1>${c.title}</h1>${clueDiagram(c)}<div id="detective-question"></div></div></div>`;
}
function startChallenge(id){
 const challenge=Coach.CHALLENGES.find(c=>c.id===id);if(!challenge)return;
 cancelPlayback();busy=false;view?.destroy();route='detective';
 session={type:'detective',challenge,cube:Cube.fromString(Coach.challengeState(challenge)),solved:false,feedback:'',wrong:null};render();
 autoSpeak(challenge.question);
}
function updateDetective(){
 const c=session.challenge;
 $('#detective-question').innerHTML=`<h2 class="clue-question">${c.question}</h2><div class="quiz-options">${c.choices.map((choice,index)=>`<button class="quiz-option ${session.solved&&index===c.answer?'correct':''} ${session.wrong===index?'wrong':''}" data-clue-answer="${index}" ${session.solved?'disabled':''}>${choice}</button>`).join('')}</div><p class="clue-feedback" role="status">${session.feedback||'Try an idea. Hints are always welcome.'}</p>${session.solved?`<div class="why-panel"><h3>${icon('spark')}Here’s the clue you spotted</h3><p>${c.explanation}</p></div><button class="button primary" data-action="nextChallenge">${Coach.CHALLENGES.indexOf(c)===Coach.CHALLENGES.length-1?'See my discoveries':'Next case'}${icon('arrow')}</button>`:`<button class="button secondary" data-action="clueHint">${icon('spark')}A little hint</button>`}<button class="text-button read-question" data-action="readClue">${icon('sound')}Read it to me</button>`;
}
function answerClue(index){
 if(session?.type!=='detective'||session.solved)return;
 const c=session.challenge;
 if(index===c.answer){session.solved=true;session.feedback='You found it! That is a useful clue.';session.wrong=null;if(!progress.detective.includes(c.id)){progress.detective.push(c.id);save();}autoSpeak(session.feedback+' '+c.explanation);}
 else{session.wrong=index;session.feedback='Good guess. Look at the outlined stickers and try another idea.';autoSpeak(session.feedback);}
 updateDetective();
}

function teamPage(){
 if(session?.type!=='team')return `<div class="page-intro"><div class="eyebrow">${icon('team')}TWO CURIOUS MINDS, ONE CUBE</div><h1>Let’s figure it out <em>together.</em></h1><p>One person calls the move. The other turns the cube. Then you swap jobs.</p></div><section class="team-intro"><div class="team-people"><span class="team-person young">${icon('star')}Young cuber</span><span class="team-connector">↔</span><span class="team-person adult">${icon('heart')}Grown-up</span></div><div><h2>Teach a little. Learn a little.</h2><p>Use the cube on screen. Before each move, predict what will change. After it, tell each other what you noticed.</p><p class="small-note">No physical setup needed. Each round starts with a prepared practice cube.</p></div></section><div class="section-heading"><h2>Pick a pattern to share</h2><span class="eyebrow">${progress.teamRounds} ROUNDS EXPLORED TOGETHER</span></div><div class="home-grid">${['right','left','yellow'].map(id=>{const l=LESSONS.find(l=>l.id===id);return `<button class="lesson-card" data-team-lesson="${id}"><div class="card-picture ${l.color}">${icon(l.icon)}</div><div class="card-body"><h3>${l.title}</h3><p>${moves(l.algorithm).length} turns to explore together.</p><div class="card-link">Start our round ${icon('arrow')}</div></div></button>`;}).join('')}</div><div class="path-note">${icon('heart')}A good grown-up question: “What do you think will move?” Give your child time to notice and explain.</div>`;
 return `<div class="lesson-top"><button class="back-link" data-nav="team">${icon('arrow')}Choose another pattern</button><span class="eyebrow">TOGETHER TIME</span></div><div class="lesson-layout">${stage()}<div class="lesson-copy"><div class="eyebrow">${icon('team')}OUR SHARED PATTERN</div><h1>${session.lesson.title}</h1><div id="team-controls"></div></div></div>`;
}
function startTeam(id){
 const lesson=LESSONS.find(l=>l.id===id);if(!lesson)return;if(!Quest.canOpen(progress,id)){showLockedLesson(id);return;}
 cancelPlayback();busy=false;view?.destroy();route='team';
 session={type:'team',lesson,round:Coach.makeTeamRound(id),cube:new Cube().move(Cube.inverse(lesson.algorithm)),credited:false,feedback:''};render();
}
function updateTeam(){
 if(session?.type!=='team')return;
 const r=session.round,roles=Coach.teamRoles(r.index,r.childFirst),move=r.algorithm[r.index];
 if(r.finished){$('#team-controls').innerHTML=`<div class="team-finish"><div class="big-star">✦</div><h2>Two minds. One discovery.</h2><p>You called, turned, and noticed together. Now tell each other one thing you learned.</p><div class="algorithm">${r.algorithm.map(m=>`<span class="move-chip past">${m.replace("'",'′')}</span>`).join('')}</div><button class="button primary" data-team-lesson="${session.lesson.id}">Another round ${icon('undo')}</button><button class="button secondary" data-nav="team">Pick a new pattern</button></div>`;return;}
 $('#team-controls').innerHTML=`<div class="team-role-row"><div class="role-card ${roles.caller==='Young cuber'?'young':'adult'}"><small>MOVE CALLER</small><strong>${roles.caller}</strong><span>Says the move</span></div><span class="role-arrow">→</span><div class="role-card ${roles.turner==='Young cuber'?'young':'adult'}"><small>CUBE TURNER</small><strong>${roles.turner}</strong><span>Makes the turn</span></div></div><div class="round-progress"><span>TURN ${r.index+1} OF ${r.algorithm.length}</span><span>${r.phase==='predict'?'1 · Wonder':r.phase==='turn'?'2 · Try':'3 · Notice'}</span></div><div class="instruction-card" aria-live="polite"><h3>${r.phase==='predict'?'Caller, ready to lead?':r.phase==='turn'?describeMove(move):'Pause for a little “aha.”'}</h3><p>${r.phase==='predict'?'Reveal the move, then ask your teammate which pieces they think will change before making the turn.':r.phase==='turn'?`Caller: say “${move.replace("'",' prime')}.” Predict together what will change. Then the turner chooses that move below.`:'What moved? What stayed in place? Tell your teammate one thing you noticed before swapping jobs.'}</p>${r.phase==='predict'?`<button class="button primary" data-action="revealTeamMove">Reveal our move ${icon('spark')}</button>`:r.phase==='notice'?`<button class="button primary" data-action="teamDiscussed">${r.index+1===r.algorithm.length?'We shared our discovery':'We noticed! Swap jobs'} ${icon('check')}</button>`:`<div class="team-move">${move.replace("'",'′')}</div>`}</div><p class="clue-feedback" role="status">${session.feedback}</p>${r.phase==='turn'?`<div class="turn-pad"><h3>${roles.turner}, make the move.</h3><div class="turn-grid">${['',"'",'2'].map(s=>FACES.map(f=>`<button data-team-turn="${f+s}" aria-label="${describeMove(f+s)}" ${busy?'disabled':''}>${f+s}</button>`).join('')).join('')}</div></div>`:''}<div class="team-footer">${r.phase==='predict'?`<button class="text-button" data-action="swapTeamRoles">${icon('swap')}Swap who calls first</button>`:''}<button class="text-button" data-action="readTeam">${icon('sound')}Read our instructions</button></div>`;
}
async function makeTeamTurn(move){
 if(busy||session?.type!=='team'||session.round.phase!=='turn')return;
 const current=session,expected=current.round.algorithm[current.round.index];
 if(move!==expected){current.feedback='Almost! Ask your caller to say the move again. Your cube is right where you left it.';updateTeam();autoSpeak(current.feedback);return;}
 busy=true;current.feedback='';updateTeam();
 await view.turn(move,turnDuration());
 if(session!==current)return;
 busy=false;current.round=Coach.teamTransition(current.round,'turn',move);updateTeam();autoSpeak('What changed? Tell each other something you noticed.');
}

function startMoveCheck(){
 if(busy||session?.type!=='solve'||session.index===0){toast('First follow one guided move, then check it here.');return;}
 closeModal();cancelPlayback();updateSequence();
 const move=session.algorithm[session.index-1];
 const before=session.initial.clone().move(session.algorithm.slice(0,session.index-1).join(' ')).asString();
 const first=Coach.inspectMove(before,move).nextFace;
 scan={autoCapture:progress.preferences.autoCapture,mode:'check',index:scanOrder.indexOf(first),faces:Object.fromEntries(FACES.map(f=>[f,Array.from({length:9},(_,i)=>i===4?f:'?')])),confirmed:new Set(),color:'F',camera:false,solving:false,check:{before,move,owner:session,step:session.index}};
 renderScan();
}
function checkReport(){const observations=Object.fromEntries([...scan.confirmed].map(f=>[f,scan.faces[f].join('')]));return Coach.inspectMove(scan.check.before,scan.check.move,observations);}
function checkMessage(report){
 const move=scan.check.move;
 switch(report.status){
 case 'ready':return ['A quick look together','Show the suggested face, or enter the colors you see. Review each square before comparing.'];
 case 'verified':return ['All six faces match this step!','Every reviewed sticker matches the expected cube. Put yellow on top and green in front before continuing.'];
 case 'partial':return ['These visible stickers match.','The reviewed faces fit this move. Hidden faces are still unchecked. You can continue, or check another side.'];
 case 'ambiguous':return ['One more side will help.','These faces fit more than one possible turn. Another view can help tell them apart.'];
 case 'waiting':return ['The turn may still be waiting.','These colors fit the cube before the move. Check your face orientation first. If you have not turned yet, make the shown move and check again.'];
 case 'different':return [`This looks like ${report.observedMove.replace("'",'′')}.`,`These colors fit that turn instead of ${move.replace("'",'′')}. Camera colors can be mistaken—review them before trying the repair.`];
 case 'mismatch':return ['Let’s take another look.','These colors do not fit the expected step or a single-turn mistake. Check the colors and which edge is on top. If you have lost your place, scan the whole cube again.'];
 default:return ['We need a clearer look.','Check the center, the top edge, and any unknown squares before comparing.'];
 }
}
function checkEditor(face){return `<div class="scan-grid">${scan.faces[face].map((color,i)=>`<button class="scan-sticker ${i===4?'center':''}" data-sticker="${i}" style="background:${COLORS[color]||'#e4e7dc'}" aria-label="Row ${Math.floor(i/3)+1}, column ${i%3+1}: ${COLOR_NAMES[color]||'unknown'}${i===4?', fixed center':''}" ${i===4?'disabled':''}>${color==='?'?'?':i===4?'•':''}</button>`).join('')}</div><div class="palette" aria-label="Paint color">${FACES.map(c=>`<button class="swatch ${c===scan.color?'selected':''}" style="background:${COLORS[c]}" data-color="${c}" aria-label="Paint ${COLOR_NAMES[c]}" aria-pressed="${c===scan.color}"></button>`).join('')}</div><p style="text-align:center">Pick a color, then tap a square to fix it.</p><div class="mode-row"><button class="text-button" data-action="rotateScan">↻ Rotate this face</button><button class="text-button" data-action="clearScanFace">Clear face</button></div>`;}
function renderMoveCheck(){
 const face=scanOrder[scan.index],report=checkReport(),[title,description]=checkMessage(report);
 showModal(`<div class="modal-title"><div><div class="eyebrow">${icon('camera')}LET’S CHECK TOGETHER · STEP ${scan.check.step}</div><h2>Did my ${scan.check.move.replace("'",'′')} turn match?</h2><p>Turn the whole cube to show a face. Keep the stickers in place while checking.</p></div><button class="icon-button" data-action="closeModal" aria-label="Close move check">${icon('close')}</button></div><div class="scan-steps">${scanOrder.map((f,i)=>`<button class="scan-step ${i===scan.index?'active':''} ${scan.confirmed.has(f)?'done':''}" data-scan-face="${i}">${COLOR_NAMES[f]}</button>`).join('')}</div><div class="scan-columns"><div>${cameraPanel()}<p class="small-note">A quick check compares a single-turn explanation. It cannot rule out mistakes on hidden faces. Review all six to confirm the whole state.</p></div><div class="scan-side"><h3>${COLOR_NAMES[face][0].toUpperCase()+COLOR_NAMES[face].slice(1)} center toward the camera</h3>${scanOrientationGuide(face)}${checkEditor(face)}</div></div><div id="scan-error" class="scan-error" role="status"></div><div class="check-result ${report.status==='verified'?'verified':''}" role="status"><span class="check-result-icon">${icon(report.status==='verified'?'check':report.status==='partial'?'search':'spark')}</span><div><h3>${title}</h3><p>${description}</p>${report.repair?`<div class="repair-note"><strong>If that is the turn you made:</strong> ${moves(report.repair).map(describeMove).join(' ')} Then choose “I tried the repair” and capture fresh views.<br><span class="repair-moves">${report.repair.replaceAll("'",'′')}</span><button class="text-button" data-action="restartCheck">I tried the repair ${icon('undo')}</button></div>`:''}</div></div><div class="scan-footer"><p>${report.faces} of 6 faces reviewed.<br>Current step stays paused.</p><div class="check-actions"><button class="button secondary" data-action="confirmFace">Compare reviewed colors ${icon('check')}</button>${report.nextFace&&report.faces>0?`<button class="button secondary" data-action="checkAnotherFace">Check ${COLOR_NAMES[report.nextFace]} next</button>`:''}<button class="button primary" data-action="closeModal">${report.status==='verified'?'Back to my guide':'Return to guide'}</button></div></div>${report.status==='mismatch'?'<button class="text-button" data-action="rescanAfterCheck">Start a fresh six-face scan →</button>':''}`,'check-modal','Check my move');
 refreshCameraPanel();
}
function creditMoveCheck(){
 const report=checkReport(),owner=scan.check.owner;
 if(report.status!=='verified'||session!==owner||session.index!==scan.check.step)return;
 owner.checkedSteps=owner.checkedSteps||new Set();
 if(!owner.checkedSteps.has(scan.check.step)){owner.checkedSteps.add(scan.check.step);progress.moveChecks++;save();}
}
// Case detective and Together time controls, dispatched from app.js.
async function coachClick(d) {
  if (d.challenge) {
    startChallenge(d.challenge);
    return true;
  }
  if (d.clueAnswer !== undefined) {
    answerClue(Number(d.clueAnswer));
    return true;
  }
  if (d.teamLesson) {
    startTeam(d.teamLesson);
    return true;
  }
  if (d.teamTurn) {
    await makeTeamTurn(d.teamTurn);
    return true;
  }
  switch (d.action) {
    case 'clueHint':
      if (session?.type === 'detective') {
        session.feedback = session.challenge.hint;
        updateDetective();
        autoSpeak(session.feedback);
      }
      break;
    case 'readClue':
      if (session?.type === 'detective')
        speak(session.challenge.question + ' ' + session.challenge.choices.join('. '));
      break;
    case 'nextChallenge':
      if (session?.type === 'detective' && session.solved) {
        const i = Coach.CHALLENGES.indexOf(session.challenge);
        if (i + 1 < Coach.CHALLENGES.length)
          startChallenge(Coach.CHALLENGES[i + 1].id);
        else
          navigate('badges');
      }
      break;
    case 'revealTeamMove':
      if (session?.type === 'team' && !busy) {
        session.round = Coach.teamTransition(session.round, 'reveal');
        session.feedback = '';
        updateTeam();
        autoSpeak(speakMove(session.round.algorithm[session.round.index]));
      }
      break;
    case 'teamDiscussed':
      if (session?.type === 'team' && !busy) {
        session.round = Coach.teamTransition(session.round, 'discussed');
        session.feedback = '';
        if (session.round.finished && !session.credited) {
          session.credited = true;
          progress.teamRounds++;
          save();
          autoSpeak('You learned something together. Nice teamwork!');
        }
        updateTeam();
      }
      break;
    case 'swapTeamRoles':
      if (session?.type === 'team' && !busy) {
        session.round = Coach.teamTransition(session.round, 'swap');
        updateTeam();
      }
      break;
    case 'readTeam':
      if (session?.type === 'team') {
        const r = session.round, roles = Coach.teamRoles(r.index, r.childFirst);
        speak(r.finished ? 'You finished your shared pattern!' : `${roles.caller} calls. ${roles.turner} turns. ` + (r.phase === 'predict' ? 'Reveal the move, then predict together before turning.' : r.phase === 'turn' ? describeMove(r.algorithm[r.index]) : 'Tell each other what changed and what stayed the same.'));
      }
      break;
    default: return false;
  }
  return true;
}
