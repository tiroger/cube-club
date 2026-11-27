// Spoken moves give children a concrete direction ("Push the right side up"). Each claim is
// checked here against the cube model: apply the move to a solved cube and look where a known
// group of stickers went. Facelets are U R F D L B, nine each, row by row.
(function () {
  let n = 0;
  const ok = (test, message) => { n++; if (!test) throw new Error('Voice: ' + message); };
  const C = CubeClubCore;
  const face = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
  const at = (cube, f, cells) => cells.map(i => cube[face[f] + i]).join('');
  const col = c => [c, c + 3, c + 6], row = r => [r * 3, r * 3 + 1, r * 3 + 2], all = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  // [move, face, cells, colour expected there]: e.g. after R the top's right column shows the front colour.
  const claims = [
    ['R', 'U', col(2), 'F'], ["R'", 'D', col(2), 'F'],
    ['L', 'D', col(0), 'F'], ["L'", 'U', col(0), 'F'],
    ['U', 'F', row(0), 'R'], ["U'", 'F', row(0), 'L'],
    ['D', 'F', row(2), 'L'], ["D'", 'F', row(2), 'R'],
    ['F', 'R', col(0), 'U'], ["F'", 'L', col(2), 'U'],
    ['B', 'L', col(0), 'U'], ["B'", 'R', col(2), 'U'],
    ['M', 'D', col(1), 'F'], ["M'", 'U', col(1), 'F'],
    ['E', 'F', row(1), 'L'], ["E'", 'F', row(1), 'R'],
    ['S', 'R', col(1), 'U'], ["S'", 'L', col(1), 'U'],
    ['r', 'U', [...col(1), ...col(2)], 'F'], ["r'", 'D', [...col(1), ...col(2)], 'F'],
    ['l', 'D', [...col(0), ...col(1)], 'F'], ["l'", 'U', [...col(0), ...col(1)], 'F'],
    ['u', 'F', [...row(0), ...row(1)], 'R'], ["u'", 'F', [...row(0), ...row(1)], 'L'],
    ['d', 'F', [...row(1), ...row(2)], 'L'], ["d'", 'F', [...row(1), ...row(2)], 'R'],
    ['f', 'R', [...col(0), ...col(1)], 'U'], ["f'", 'L', [...col(1), ...col(2)], 'U'],
    ['b', 'L', [...col(0), ...col(1)], 'U'], ["b'", 'R', [...col(1), ...col(2)], 'U'],
    ['x', 'U', all, 'F'], ["x'", 'D', all, 'F'],
    ['y', 'F', all, 'R'], ["y'", 'F', all, 'L'],
    ['z', 'R', all, 'U'], ["z'", 'L', all, 'U'],
  ];
  // The direction words each claim relies on, so a wording change can't silently flip a direction.
  const words = {
    R: 'right side up', "R'": 'right side down', L: 'left side down', "L'": 'left side up',
    U: 'top to the left', "U'": 'top to the right', D: 'bottom to the right', "D'": 'bottom to the left',
    F: 'front to the right', "F'": 'front to the left', B: 'top goes left', "B'": 'top goes right',
    M: 'middle slice down', "M'": 'middle slice up', E: 'middle row to the right', "E'": 'middle row to the left',
    S: 'slice to the right', "S'": 'slice to the left',
    r: 'two layers up', "r'": 'two layers down', l: 'two layers down', "l'": 'two layers up',
    u: 'layers to the left', "u'": 'layers to the right', d: 'layers to the right', "d'": 'layers to the left',
    f: 'layers to the right', "f'": 'layers to the left', b: 'top goes left', "b'": 'top goes right',
    x: 'front goes up', "x'": 'front goes down', y: 'cube to the left', "y'": 'cube to the right',
    z: 'cube to the right', "z'": 'cube to the left',
  };
  for (const [move, f, cells, colour] of claims) {
    const after = new Cube().move(move).asString();
    ok(at(after, f, cells) === colour.repeat(cells.length), `${move} moves the stickers its words describe (${at(after, f, cells)})`);
    const spoken = C.speakMove(move);
    ok(spoken.includes(words[move]), `${move} is spoken with its direction: "${spoken}"`);
    const name = move[0] + (move.endsWith("'") ? ' prime' : '');
    ok(spoken.startsWith(name + '. '), `${move} is spoken with its letter first: "${spoken}"`);
  }
  for (const base of ['R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', 'S', 'r', 'x', 'y', 'z']) {
    const spoken = C.speakMove(base + '2');
    ok(spoken.startsWith(base + ' two. ') && spoken.includes('two times'), `${base}2 is spoken as two turns: "${spoken}"`);
  }
  ok(C.speakMove('R3') === C.describeMove('R3') && C.speakMove('') === C.describeMove(''), 'unknown moves fall back to the written description');
  return n + ' voice checks passed: every spoken direction for face, slice, wide and whole-cube turns matches the cube model.';
})();
