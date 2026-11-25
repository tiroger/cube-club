/* The next stage shares the existing animation, move controls and saved progress. */
const Next=CubeClubNext;
function pieceSwatch(colors,label){return `<div class="piece-swatch"><span>${label}</span><div>${[...colors].map(f=>`<i style="background:${COLORS[f]}" title="${COLOR_NAMES[f]}" aria-label="${COLOR_NAMES[f]}"></i>`).join('')}</div><small>${[...colors].map(f=>COLOR_NAMES[f]).join(' · ')}</small></div>`;}
function focusDiagrams(state,pieces){
 const indices=Next.pieceIndices(state,pieces);
 return `<details class="piece-map"><summary>Find the outlined pieces on all six sides</summary><div class="piece-map-grid">${FACES.map(f=>faceDiagram(state,f,indices.filter(i=>Math.floor(i/9)===FACES.indexOf(f)).map(i=>i%9))).join('')}</div><p class="small-note">Each little square is a straight-on view of one face. Letters inside outlined stickers name their colors.</p></details>`;
}
function lessonPiecePanel(){
 const l=session.lesson,state=session.cube.asString(),pair=l.skill==='pair',together=pair&&Next.paired(state,...l.focusPieces);
 return `<div class="piece-coach"><div class="eyebrow">FOLLOW THESE PIECES</div><div class="piece-swatch-row">${l.focusPieces.map((p,i)=>pieceSwatch(p,p.length===3?'Corner':(pair||l.skill==='lookahead')?'Matching edge':i===0?'Edge to follow':'Bring this back')).join('')}</div><div class="piece-status"><span>${Next.crossCount(session.cube)} of 4 cross edges home</span>${pair?`<span>${together?'Shared colors line up':'Shared colors need lining up'}</span>`:''}</div>${focusDiagrams(state,l.focusPieces)}<p class="small-note">Outlined pieces move with the animation. Drag the cube to see hidden stickers. A cross edge may move temporarily; the plan brings it back.</p></div>`;
}
function patternPage(){
 if(session?.type==='pattern'){
  const c=session.challenge,pieces=c.focusPieces||Next.LESSONS.find(l=>l.id===c.lessonID).focusPieces;
  return `<div class="lesson-top"><button class="back-link" data-nav="patterns">${icon('arrow')}All the patterns</button><span class="eyebrow">LOOK · THINK · TRY</span></div><div class="lesson-layout">${stage()}<div class="lesson-copy"><div class="eyebrow">${c.id.startsWith('cross')?'DIRECT WHITE CROSS':'INTUITIVE F2L'}</div><h1>${c.title}</h1><div class="piece-swatch-row">${pieces.map(p=>pieceSwatch(p,p.length===3?'Corner':'Edge')).join('')}</div>${focusDiagrams(session.cube.asString(),pieces)}<div id="pattern-question"></div></div></div>`;
 }
 const done=Next.CASES.filter(c=>progress.patternPractice[c.id]?.correct>0).length;
 return `<div class="page-intro"><div class="eyebrow">${icon('search')}NEXT STEPS / PATTERN PRACTICE</div><h1>What is your cube <em>telling you?</em></h1><p>Spot the colors. Pick a plan. Discover why it works.</p></div><div class="pattern-review"><div><h2>A little looking goes a long way.</h2><p>${done} of ${Next.CASES.length} patterns explored. Review begins with cases you wanted another look at.</p></div><button class="button primary" data-action="reviewPatterns">Start a short review ${icon('play')}</button></div><div class="case-grid">${Next.CASES.map((c,i)=>{const l=Next.LESSONS.find(l=>l.id===c.lessonID),state=Next.caseState(c),pieces=c.focusPieces||l.focusPieces,indices=Next.pieceIndices(state,pieces),p=progress.patternPractice[c.id];return `<button class="case-card" data-pattern="${c.id}"><div class="case-art pattern-art"><div class="clue-diagrams compact">${['U','F'].map(f=>faceDiagram(state,f,indices.filter(n=>Math.floor(n/9)===FACES.indexOf(f)).map(n=>n%9))).join('')}</div><span class="step-pill">PATTERN ${i+1}</span></div><div class="card-body"><small>${i<3||c.id==='cross-first'?'WHITE CROSS':'CORNERS + EDGES'}</small><h3>${c.title}</h3><p>${!Quest.canOpen(progress,c.lessonID)?'Opens with “'+l.title+'.”':p?.needsReview?'A good one to revisit.':p?.correct?'You have spotted this before.':'Take a look. What do you notice?'}</p><div class="card-link">Explore this pattern ${icon('arrow')}</div></div></button>`;}).join('')}</div><div class="path-note"><button class="text-button" data-learning-level="next">${icon('book')}Back to the next-step lessons</button></div>`;
}
function startPattern(id,review=null){
 const challenge=Next.CASES.find(c=>c.id===id);if(!challenge)return;if(!Quest.canOpen(progress,challenge.lessonID)){showLockedLesson(challenge.lessonID);return;}
 cancelPlayback();busy=false;view?.destroy();route='patterns';
 session={type:'pattern',challenge,cube:Cube.fromString(Next.caseState(challenge)),solved:false,wrong:null,hadMistake:false,feedback:'',review};render();autoSpeak(challenge.question);
}
function updatePattern(){
 const c=session.challenge,lastReview=session.review?.index===session.review?.ids.length-1;
 $('#pattern-question').innerHTML=`${session.review?`<div class="eyebrow">REVIEW ${session.review.index+1} OF ${session.review.ids.length}</div>`:''}<h2 class="clue-question">${c.question}</h2><div class="quiz-options">${c.choices.map((choice,i)=>`<button class="quiz-option ${session.solved&&i===c.answer?'correct':''} ${session.wrong===i?'wrong':''}" data-pattern-answer="${i}" ${session.solved?'disabled':''}>${choice}</button>`).join('')}</div><p class="clue-feedback" role="status">${session.feedback||'You can always ask for a hint.'}</p>${session.solved?`<div class="why-panel"><h3>${icon('spark')}Here is the idea</h3><p>${c.explanation}</p></div><div class="pattern-actions"><button class="button primary" data-action="nextPattern">${lastReview?'Finish this review':'Another pattern'} ${icon('arrow')}</button><button class="button secondary" data-lesson="${c.watchLessonID||c.lessonID}">${c.watchLessonID?'Practice a cross example':'Watch this plan'} ${icon('play')}</button></div>`:`<button class="button secondary" data-action="patternHint">${icon('spark')}A little hint</button>`}<button class="text-button read-question" data-action="readPattern">${icon('sound')}Read it to me</button>`;
}
function answerPattern(index){
 if(session?.type!=='pattern'||session.solved)return;
 const c=session.challenge,correct=index===c.answer;
 // One reviewed case earns one result; choosing again after feedback is welcome.
 if(correct){session.solved=true;session.wrong=null;session.feedback='You spotted a useful clue!';}
 else{session.hadMistake=true;session.wrong=index;session.feedback='Take another look. '+c.hint;}
 progress.patternPractice=Next.recordAnswer(progress.patternPractice,c.id,correct,session.hadMistake);save();updatePattern();autoSpeak(session.feedback+(correct?' '+c.explanation:''));
}
function advancePattern(){
 if(session?.type!=='pattern'||!session.solved)return;
 const r=session.review;
 if(r){if(r.index+1===r.ids.length){navigate('patterns');toast(r.ids.length+' patterns explored. A little practice counts!');return;}startPattern(r.ids[r.index+1],{...r,index:r.index+1});}
 else{const available=Next.CASES.filter(c=>Quest.canOpen(progress,c.lessonID)),i=available.indexOf(session.challenge);if(i+1===available.length)navigate('patterns');else startPattern(available[i+1].id);}
}
// Pattern practice controls, dispatched from app.js.
async function patternClick(d) {
  if (d.pattern) {
    startPattern(d.pattern);
    return true;
  }
  if (d.patternAnswer !== undefined) {
    answerPattern(Number(d.patternAnswer));
    return true;
  }
  switch (d.action) {
    case 'reviewPatterns': {
      const ids = Next.reviewOrder(progress.patternPractice).filter(c => Quest.canOpen(progress, c.lessonID)).slice(0, 3).map(c => c.id);
      if (!ids.length) {
        toast('Open a matching Piece Partners lesson first.');
        break;
      }
      startPattern(ids[0], { ids, index: 0 });
      break;
    }
    case 'patternHint':
      if (session?.type === 'pattern') {
        session.feedback = session.challenge.hint;
        updatePattern();
        autoSpeak(session.feedback);
      }
      break;
    case 'readPattern':
      if (session?.type === 'pattern')
        speak(session.challenge.question + ' ' + session.challenge.choices.join('. '));
      break;
    case 'nextPattern':
      advancePattern();
      break;
    default: return false;
  }
  return true;
}
