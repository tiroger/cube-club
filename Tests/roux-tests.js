// Slice, wide and rotation moves; the Block Builders lessons; the optional branch.
(function () {
  const C = CubeClubCore, Q = CubeClubQuest, G = CubeGeometry, N = CubeClubNext;
  let passed = 0;
  function ok(condition, message) {
    if (!condition) throw new Error('Roux: ' + message);
    passed++;
  }
  const solved = new Cube().asString();
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 0.001);
  const geo = Array.from({ length: 54 }, (_, i) => G.faceletGeometry(i));

  // 1. The animation turns exactly the stickers the cube model moves, from a scrambled start.
  const scrambled = new Cube().move("R U2 F' L D2 B R' U F2 D' L2 B'");
  const before = scrambled.asString();
  for (const base of ['M', 'E', 'S', 'u', 'r', 'f', 'd', 'l', 'b', 'x', 'y', 'z']) {
    for (const suffix of ['', "'", '2']) {
      const move = base + suffix, layer = G.turnLayer(move), after = scrambled.clone().move(move).asString();
      ok(layer, `${move} has a turn layer`);
      for (let source = 0; source < 54; source++) {
        let center = geo[source].center, normal = geo[source].normal;
        if (layer.moves(center)) {
          center = G.rotate(center, layer.axis, layer.angle);
          normal = G.rotate(normal, layer.axis, layer.angle);
        }
        const dest = geo.findIndex(d => near(center, d.center) && near(normal, d.normal));
        ok(dest >= 0 && after[dest] === before[source], `animation matches ${move}, sticker ${source}`);
      }
    }
  }
  for (const face of C.FACES) ok(G.turnLayer(face) && G.turnLayer(face + "'") && G.turnLayer(face + '2'), `${face} turns still have layers`);
  for (const junk of ['', 'Q', 'M3', "R''", 'm', null]) ok(G.turnLayer(junk) === null, `rejects ${JSON.stringify(junk)}`);

  // 2. Every move has a spoken description.
  for (const base of [...C.FACES, 'M', 'E', 'S', 'u', 'r', 'f', 'd', 'l', 'b', 'x', 'y', 'z']) {
    for (const suffix of ['', "'", '2']) {
      const text = C.describeMove(base + suffix);
      ok(typeof text === 'string' && text.length > 10 && !/undefined/.test(text), `${base + suffix} is described`);
    }
  }
  ok(C.describeMove('M') === 'Pull the middle slice down at the front.' && C.describeMove("M'") === 'Push the middle slice up at the front.', 'M follows L: down at the front');
  ok(C.describeMove('r') === 'Turn the right two layers clockwise.', 'wide turns name two layers');

  // Shared helpers for lesson facts.
  const cubie = i => geo[i].center.map(v => Math.abs(v) > 1.4 ? Math.sign(v) : v);
  const groups = {};
  for (let i = 0; i < 54; i++) (groups[cubie(i).join()] ||= []).push(i);
  const pieceAt = (state, colors) => Object.values(groups).find(g => g.length === colors.length && [...colors].every(c => g.some(i => state[i] === c)));
  const position = (state, colors) => {
    const c = cubie(pieceAt(state, colors)[0]);
    return (c[1] === 1 ? 'U' : c[1] === -1 ? 'D' : '') + (c[2] === 1 ? 'F' : c[2] === -1 ? 'B' : '') + (c[0] === 1 ? 'R' : c[0] === -1 ? 'L' : '');
  };
  // Which face a piece shows a given color on: 'U', 'D', 'F', 'B', 'L' or 'R'.
  const facing = (state, colors, color) => {
    const n = geo[pieceAt(state, colors).find(i => state[i] === color)].normal;
    return n[1] === 1 ? 'U' : n[1] === -1 ? 'D' : n[2] === 1 ? 'F' : n[2] === -1 ? 'B' : n[0] === 1 ? 'R' : 'L';
  };
  const region = pred => geo.map((g, i) => pred(g.center, i) ? i : -1).filter(i => i >= 0);
  const LEFT = region(([x, y]) => x <= -0.9 && y <= 0.1), RIGHT = region(([x, y]) => x >= 0.9 && y <= 0.1);
  const isCorner = i => [0, 2, 6, 8].includes(i % 9), isEdge = i => [1, 3, 5, 7].includes(i % 9);
  const TOP_CORNERS = region(([, y], i) => isCorner(i) && y >= 0.9);
  const LAST_SIX = region(([x, y], i) => isEdge(i) && (y >= 0.9 || (y <= -0.9 && Math.abs(x) < 0.1)));
  const intact = (state, set) => set.every(i => state[i] === solved[i]);
  const without = (set, ...pieces) => set.filter(i => !pieces.some(p => pieceAt(solved, p).includes(i)));
  const AUF = ['', 'U', 'U2', "U'"], top = (cube, turn) => turn ? cube.move(turn) : cube;
  const cornersMatchAfterTopTurn = state => AUF.some(a => intact(top(Cube.fromString(state), a).asString(), TOP_CORNERS));
  const touching = (a, b) => near(geo[a].normal, geo[b].normal) && Math.hypot(...geo[a].center.map((v, i) => v - geo[b].center[i])) < 1.01;
  const joined = (state, corner, edge) => [...edge].every(c => touching(pieceAt(state, corner).find(i => state[i] === c), pieceAt(state, edge).find(i => state[i] === c)));
  // An edge is flipped when its yellow or white sticker is not on the top or bottom face.
  const flipped = state => LAST_SIX.filter(i => Math.abs(geo[i].center[1]) > 1.4 && !['U', 'D'].includes(state[i])).map(i => {
    const c = cubie(i);
    return (c[1] === 1 ? 'U' : 'D') + (c[2] === 1 ? 'F' : c[2] === -1 ? 'B' : c[0] === 1 ? 'R' : 'L');
  }).sort();

  // 3. Every Roux lesson is a legal prepared case that its own moves solve.
  const lessons = CubeClubRouxLessons, byId = id => lessons.find(l => l.id === id);
  ok(lessons.length === 8 && Q.lessonsFor('roux').map(l => l.id).join() === lessons.map(l => l.id).join(), 'eight Block Builders lessons, in order');
  const setupOf = id => C.lessonInitial(byId(id)).asString();
  for (const l of lessons) {
    const moves = C.moves(l.algorithm), start = C.lessonInitial(l);
    ok(l.questStage === 'roux' && Q.stageFor(l.id) === 'roux', `${l.id} belongs to the branch`);
    ok(C.validate(start.asString()).ok, `${l.id} starts from a legal cube`);
    ok(C.lessonComplete(l, start.clone().move(l.algorithm)), `${l.id} moves solve its case`);
    ok(moves.every(m => G.turnLayer(m)), `${l.id} uses only animated moves`);
    ok(!l.steps || l.steps.length === moves.length, `${l.id} has one step per move`);
    ok(Number.isInteger(l.correct) && l.correct >= 0 && l.correct < l.answers.length, `${l.id} quiz answer exists`);
    for (const p of l.focusPieces || []) ok(N.pieceIndices(start.asString(), [p]).length === p.length, `${l.id} highlights ${p}`);
  }

  // 4. Each lesson's description matches its prepared case.
  {
    let cube = C.lessonInitial(byId('roux-middle'));
    const greenCenter = () => [4, 13, 22, 31, 40, 49].find(i => cube.asString()[i] === 'F');
    const path = [];
    for (const m of C.moves(byId('roux-middle').algorithm)) { cube.move(m); path.push(greenCenter()); }
    ok(path.join() === [4, 49, 31, 22].join(), 'M′ carries green to the top, back, bottom, then home');
  }
  {
    const s = setupOf('roux-left-block');
    ok(intact(s, without(LEFT, 'DLB', 'LB')) && !intact(s, LEFT) && intact(s, RIGHT), 'left block lacks only its back pair');
    ok(position(s, 'DLB') === 'UBR' && position(s, 'LB') === 'UB' && joined(s, 'DLB', 'LB'), 'blue-red pair is joined at the back of the top');
    ok(facing(s, 'DLB', 'B') === 'U' && facing(s, 'LB', 'B') === 'U', 'blue faces up');
    ok(Cube.fromString(s).move("L U'").asString() === new Cube().move('L').asString(), 'after two moves the block is whole, only tipped up');
  }
  {
    const s = setupOf('roux-right-block'), l = byId('roux-right-block');
    ok(intact(s, LEFT) && intact(s, without(RIGHT, 'DFR', 'FR')) && !intact(s, RIGHT), 'right block lacks only its front pair');
    ok(position(s, 'DFR') === 'UFR' && position(s, 'FR') === 'UF' && joined(s, 'DFR', 'FR'), 'orange-green pair is joined at the front of the top');
    ok(facing(s, 'DFR', 'R') === 'U' && facing(s, 'FR', 'R') === 'U', 'orange faces up');
    const cube = Cube.fromString(s);
    ok(C.moves(l.algorithm).every(m => intact(cube.move(m).asString(), LEFT)), 'the left block never moves');
    ok(Cube.fromString(s).move("r U").asString() === new Cube().move('r').asString(), 'after two moves the right block is whole, only tipped up');
  }
  {
    const s = setupOf('roux-corners-up'), after = new Cube().move(byId('roux-corners-up').algorithm).asString();
    ok(intact(after, LEFT) && intact(after, RIGHT), 'Sune keeps both blocks');
    ok(facing(s, 'UBR', 'U') === 'U' && position(s, 'UBR') === 'UFL', 'one yellow-up corner sits at the front-left');
    const yellowSide = Object.fromEntries(['UFR', 'UBR', 'UBL'].map(at => {
      const piece = ['URF', 'UBR', 'UFL', 'UBL'].find(p => position(s, p) === at);
      return [at, facing(s, piece, 'U')];
    }));
    ok(yellowSide.UFR === 'F' && yellowSide.UBR === 'R' && yellowSide.UBL === 'B', 'other corners show yellow on the front, right and back');
  }
  {
    const l = byId('roux-corner-swap'), s = setupOf('roux-corner-swap'), after = new Cube().move(l.algorithm).asString();
    ok(intact(after, LEFT) && intact(after, RIGHT), 'the swap keeps both blocks');
    const yellowUp = state => ['URF', 'UBR', 'UFL', 'UBL'].every(p => facing(state, p, 'U') === 'U');
    ok(yellowUp(after) && yellowUp(s), 'every corner stays yellow-up');
    ok(position(after, 'URF') === 'UBR' && position(after, 'UBR') === 'UFR' && position(after, 'UFL') === 'UFL' && position(after, 'UBL') === 'UBL', 'only the two right corners trade');
    ok(!intact(after, LAST_SIX), 'top edges may move during the swap, as the lesson says');
    ok(['UFL', 'UBL'].every(p => s[pieceAt(s, p).find(i => geo[i].normal[0] === -1)] === 'L'), 'the left side matches the red center');
    const oneSwap = c => AUF.some(a => cornersMatchAfterTopTurn(top(c.clone(), a).move(l.algorithm).asString()));
    const diagonal = new Cube().move(Cube.inverse("F R U' R' U' R U R' F' R U R' U' R' F R F'"));
    ok(!oneSwap(diagonal) && AUF.every(a => oneSwap(top(diagonal.clone(), a).move(l.algorithm))), 'a diagonal case becomes a matching-side case after one swap from any side');
  }
  {
    const s = setupOf('roux-edge-arrow');
    ok(intact(s, LEFT) && intact(s, RIGHT) && cornersMatchAfterTopTurn(s) && !intact(s, TOP_CORNERS), 'blocks and corners done, top turned one step');
    ok(flipped(s).join() === 'DF,UF,UL,UR', 'three flipped top edges point at the flipped bottom front edge');
    const lifted = pieceAt(s, 'UL'), atDF = position(s, 'UL') === 'DF';
    ok(atDF && lifted && position(Cube.fromString(s).move("M'").asString(), 'UL') === 'UF', 'the first push lifts the flipped bottom edge');
  }
  {
    const s = setupOf('roux-side-edges');
    ok(flipped(s).length === 0 && intact(s, LEFT) && intact(s, RIGHT) && !intact(s, TOP_CORNERS) && cornersMatchAfterTopTurn(s), 'edges oriented, top turned one step');
    ok(position(s, 'UL') === 'DF' && position(s, 'UR') === 'DB', 'yellow-red at bottom front, yellow-orange at bottom back');
    const lifted = Cube.fromString(s).move('M2').asString();
    ok(['UL', 'UR'].every(p => position(lifted, p)[0] === 'U'), 'one M2 lifts both side edges');
  }
  {
    const s = setupOf('roux-last-four');
    ok(intact(s, LEFT) && intact(s, RIGHT) && intact(s, TOP_CORNERS) && position(s, 'UL') === 'UL' && position(s, 'UR') === 'UR', 'everything but the middle edges is solved');
    ok(position(s, 'UF') === 'UB' && position(s, 'UB') === 'DF' && position(s, 'DF') === 'UF' && position(s, 'DB') === 'DB', 'three middle edges trade; bottom back is home');
  }
  ok(C.moves(byId('roux-edge-arrow').algorithm).concat(C.moves(byId('roux-side-edges').algorithm), C.moves(byId('roux-last-four').algorithm)).every(m => /^[MU]/.test(m)), 'last six edges use only M and U');

  // 5. The branch opens after First Solve, independently of the main path.
  const fresh = () => C.normalizeProgress({});
  const attempt = (id, mode, assisted = false) => ({ mode, complete: true, solved: true, turns: C.moves(C.LESSONS.find(l => l.id === id).algorithm).length, assisted });
  function master(p, id) {
    Q.finishAttempt(p, id, attempt(id, 'guide'));
    Q.answerConcept(p, id, C.LESSONS.find(l => l.id === id).correct);
    Q.finishAttempt(p, id, attempt(id, 'recall', true));
    Q.finishAttempt(p, id, attempt(id, 'check'));
  }
  function graduate(p, id) {
    for (const l of Q.lessonsFor(id)) master(p, l.id);
    return Q.finishChallenge(p, id, Q.QUESTIONS[id].map(q => q.answer)) && Q.graduate(p, id);
  }
  ok(Q.MAIN.map(s => s.id).join() === 'beginner,intermediate,advanced,speed', 'main path is unchanged');
  ok(Q.before('roux').id === 'beginner' && Q.after('roux') === null && Q.after('beginner').id === 'intermediate' && Q.before('beginner') === null, 'branch links');
  ok(Q.branchesFrom('beginner').map(s => s.id).join() === 'roux' && Q.QUESTIONS.roux.length === 3, 'one branch from First Solve, with a three-question challenge');
  let p = fresh();
  ok(!Q.unlocked(p, 'roux') && !Q.canOpen(p, 'roux-middle'), 'branch starts locked');
  ok(Q.lessonRequirement(p, 'roux-middle') === 'Graduate from First Solve to open this stage.', 'locked lessons name First Solve');
  for (const g of ['intermediate', 'advanced', 'speed']) {
    const q = fresh(); Q.grant(q, g);
    ok(!Q.unlocked(q, 'roux'), `a ${g} grant does not open the branch`);
  }
  const granted = fresh(); Q.grant(granted, 'roux');
  ok(Q.unlocked(granted, 'roux') && Q.canOpen(granted, 'roux-last-four') && !Q.unlocked(granted, 'intermediate') && !granted.quest.graduated.length, 'a branch grant opens only the branch, without graduation');
  ok(graduate(p, 'beginner'), 'First Solve graduates');
  ok(Q.unlocked(p, 'roux') && Q.unlocked(p, 'intermediate'), 'graduating First Solve opens both paths');
  ok(Q.canOpen(p, 'roux-middle') && !Q.canOpen(p, 'roux-left-block'), 'branch lessons open in order');
  ok(Q.nextLesson(p).id === Q.lessonsFor('intermediate')[0].id, 'the main path stays the suggested next step');
  p.quest.selected = 'roux';
  ok(Q.nextLesson(p).id === 'roux-middle', 'choosing the branch suggests its first lesson');
  ok(graduate(p, 'roux'), 'the branch graduates');
  ok(!Q.unlocked(p, 'advanced') && Q.unlocked(p, 'intermediate'), 'branch graduation opens nothing else');
  const reloaded = C.normalizeProgress(JSON.parse(JSON.stringify(p)));
  ok(reloaded.quest.graduated.includes('roux') && reloaded.quest.selected === 'roux' && Q.mastered(reloaded, 'roux-last-four'), 'branch progress survives reload');
  ok(Q.nextLesson(reloaded).id === Q.lessonsFor('intermediate')[0].id, 'after the branch, the main path is suggested again');

  return `${passed} Roux checks passed: slice, wide and rotation animation, move wording, eight verified lessons, and the optional branch.`;
})();
