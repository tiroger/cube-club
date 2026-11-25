/* Block Builders: an optional Roux branch after First Solve.
   Original coaching for prepared cases. Every setup, piece position and
   block-safety claim below is checked against the cube model in roux-tests.js. */
(function (root) {
  'use strict';
  const lessons = CubeClubCore.LESSONS;
  const additions = [
    {
      id: 'roux-middle', questStage: 'roux', title: 'Meet the middle slice', subtitle: 'The layer between left and right.',
      category: 'ROUX FOUNDATIONS', icon: 'cube', color: 'sky', minutes: 2, algorithm: "M' M' M' M'",
      goal: 'Push the middle slice up four times and watch every center come home.',
      why: 'Roux uses a turn you have not needed yet: M, the middle slice between the left and right faces. M turns the same way as L, so the front of the slice moves down. M′ moves it up. The centers in that slice travel too, which is new: green can visit the top!',
      when: 'Hold yellow on top and green in front. Keep the left and right faces still and push the middle column up with one finger. After four pushes, every center is back where it started.',
      hint: 'M′ pushes the front of the middle slice up. Do it four times.',
      mnemonic: 'Up, up, up, up. Home again.',
      quiz: 'Which pieces does an M turn move?',
      answers: ['Only the corners', 'The middle slice between left and right, including its centers', 'The whole left face'], correct: 1,
      steps: ['Push the middle slice up. The green center rises to the top.', 'Push it up again. Green reaches the back.', 'Again. Green is now on the bottom.', 'One more push. Every center is home.'],
      finish: 'Four pushes brought the middle slice home. Watch for M and M′ in the next lessons.'
    },
    {
      id: 'roux-left-block', questStage: 'roux', title: 'Finish the left block', subtitle: 'Two pairs and a center make a block.',
      category: 'BLOCK BUILDING', icon: 'layers', color: 'peach', minutes: 4, algorithm: "L U' L'", focusPieces: ['DLB', 'LB'],
      goal: 'Bring the blue-red pair home to complete a 1×2×3 block on the left.',
      why: 'Roux starts with a block instead of a cross. The left block is the red center plus three edges and two corners that match it, filling the bottom two rows of the left side. Build it by joining a corner to its edge, then dropping the pair into its spot. There is no pattern to memorize: watch where the pieces go.',
      when: 'Keep yellow on top, green in front and red on the left. The front half of the block is finished. The blue-red corner and edge are already joined at the back of the top layer, with blue facing up. On a real cube, first join the pair, then find its spot.',
      hint: 'Tip the left side up first, so its empty spot meets the top layer.',
      mnemonic: 'Lift the spot. Slide the pair. Lower the block.',
      quiz: 'Which pieces make the finished left block?',
      answers: ['The red center with three edges and two corners that match it', 'Every red sticker on the cube', 'The white cross'], correct: 0,
      steps: ['Tip the left side up. The block’s empty back spot rises to the top layer.', 'Turn the top. The blue-red pair slides into the empty spot.', 'Tip the left side back down. Your left block is complete.'],
      finish: 'The left block is complete: a red center, three edges and two corners, all matching.'
    },
    {
      id: 'roux-right-block', questStage: 'roux', title: 'Build the right block, keep the left', subtitle: 'Two layers turn together.',
      category: 'BLOCK BUILDING', icon: 'hand', color: 'mint', minutes: 4, algorithm: "r U r'", focusPieces: ['DFR', 'FR'],
      goal: 'Use r turns to bring the orange-green pair home without touching the left block.',
      why: 'The second block is built on the right while the left block stays safe. A small r is a wide turn: the right face and the middle slice move together. R, r, M and U turns never touch the left block, so it cannot break while you work.',
      when: 'Hold yellow on top and green in front, with the left block on the left. The orange-green corner and edge are joined at the front of the top layer, with orange facing up. The rest of the right block is ready.',
      hint: 'Lowercase r turns two layers: the right face and the middle slice.',
      mnemonic: 'Two layers up. Slide. Two layers down.',
      quiz: 'While you build the right block, which turns keep the left block safe?',
      answers: ['L and D turns', 'R, r, M and U turns', 'Any turn at all'], correct: 1,
      steps: ['Turn the right two layers up. The right block’s empty spot rises to the top.', 'Turn the top. The orange-green pair slides into that spot.', 'Turn the right two layers back down. Both blocks are complete.'],
      finish: 'Both side blocks are complete, and the left block never moved. In a real solve, the top corners and six edges come next.'
    },
    {
      id: 'roux-corners-up', questStage: 'roux', title: 'Corners first, edges later', subtitle: 'The little fish works in Roux too.',
      category: 'TOP CORNERS', icon: 'fish', color: 'yellow', minutes: 5, algorithm: "R U R' U R U2 R'", focusPieces: ['URF', 'UBR', 'UFL', 'UBL'],
      goal: 'Use Sune to turn every top corner yellow-up while both blocks stay safe.',
      why: 'After the blocks, Roux solves the four top corners before any of the last six edges. The edges can stay messy for now; they get their own turn later. Sune uses only R and U turns, so it never breaks either block. You may remember this fish from First Solve.',
      when: 'Both blocks are finished. One top corner shows yellow on top, at the front-left. The other three show yellow on a side: the front-right corner on the front, the back-right corner on the right, and the back-left corner on the back. Keep the yellow-up corner at the front-left.',
      hint: 'Right up, top, right down, top. Right up, top twice, right down.',
      mnemonic: 'Up, over, down, over. Up, double, down.',
      quiz: 'In Roux, what comes right after the two blocks?',
      answers: ['The white cross', 'The four top corners', 'The middle-layer edges'], correct: 1,
      finish: 'All four top corners face yellow-up. Next, check that each one is in its home.'
    },
    {
      id: 'roux-corner-swap', questStage: 'roux', title: 'Trade two corners', subtitle: 'Find the matching side first.',
      category: 'TOP CORNERS', icon: 'swap', color: 'lavender', minutes: 6, algorithm: "R U2 R' U' R U2 L' U R' U' L", focusPieces: ['URF', 'UBR'],
      goal: 'Swap the two right corners while every corner keeps yellow on top.',
      why: 'With yellow up on all four corners, look at their side colors. When one side shows two matching corner stickers, those two corners are home and the other two need to trade. This swap keeps yellow up and never touches either block. In Roux, the top edges may move during it; they are solved later.',
      when: 'Yellow faces up on all four top corners. The two corners on the left side match each other and the red center, so keep that side on the left. If no side matches, do this swap once from any side. A matching side will appear; then use the swap again.',
      hint: 'Keep the matching side on the left before you begin.',
      mnemonic: 'Match on the left. Trade on the right.',
      quiz: 'Two corner stickers on the left side match. What should you do?',
      answers: ['Twist all the corners again', 'Turn the cube so the match faces right', 'Keep the match on the left and trade the right corners'], correct: 2,
      finish: 'Every top corner is home and yellow-up. Only six edges remain.'
    },
    {
      id: 'roux-edge-arrow', questStage: 'roux', title: 'Find the arrow', subtitle: 'Three point at one.',
      category: 'LAST SIX EDGES', icon: 'arrow', color: 'sky', minutes: 4, algorithm: "M' U M", focusPieces: ['UF', 'DF', 'UR', 'UL'],
      goal: 'Spot the arrow, then fix four flipped edges with one M′ U M.',
      why: 'The last six edges are the four top edges plus the front and back bottom edges. Each has a yellow or white sticker. An edge is flipped when that sticker is not on the top or bottom. When three flipped top edges point at a flipped bottom edge, you have an arrow, and M′ U M fixes all four at once.',
      when: 'Both blocks and the top corners are done, and the top layer is turned one step. Three top edges show their yellow or white sticker on a side: the left, front and right edges. They point at the bottom front edge, which is flipped too. The back top edge is fine.',
      hint: 'Push the middle up, turn the top, pull the middle down.',
      mnemonic: 'Up. Turn. Down.',
      quiz: 'Three flipped top edges point at one flipped bottom edge. What fixes this arrow?',
      answers: ['R U R′ U′', 'M′ U M', 'A brand-new scramble'], correct: 1,
      steps: ['Push the middle slice up. The flipped bottom edge rises to the top.', 'Turn the top.', 'Pull the middle slice back down. All six edges show yellow or white on the top or bottom.'],
      finish: 'No flipped edges are left. Next, bring the left and right top edges home.'
    },
    {
      id: 'roux-side-edges', questStage: 'roux', title: 'Bring the side edges home', subtitle: 'Lift both, turn, and settle.',
      category: 'LAST SIX EDGES', icon: 'sun', color: 'yellow', minutes: 4, algorithm: "M2 U' M2", focusPieces: ['UL', 'UR'],
      goal: 'Send the yellow-red and yellow-orange edges home beside the red and orange centers.',
      why: 'After the arrow, place the two top edges that belong on the left and right. Line them up opposite each other on the bottom, and one M2 lifts both to the top together. A top turn then sets each beside its matching center.',
      when: 'Every edge shows yellow or white on the top or bottom. The yellow-red edge is at the bottom front and the yellow-orange edge is at the bottom back, opposite each other. The top layer is turned one step.',
      hint: 'M2 turns the middle slice halfway, lifting both yellow side edges at once.',
      mnemonic: 'Lift both. Turn. Settle.',
      quiz: 'Why line up the two side edges opposite each other on the bottom first?',
      answers: ['So one M2 lifts both at once', 'So the corners twist', 'So the blocks come apart'], correct: 0,
      steps: ['Turn the middle slice halfway. Both yellow side edges rise to the top.', 'Turn the top. Each side edge lands beside its matching center, and the corners line up.', 'Turn the middle slice halfway again. The middle edges and centers come home.'],
      finish: 'Yellow-red and yellow-orange are home. In a real solve, only the four middle-slice edges are left.'
    },
    {
      id: 'roux-last-four', questStage: 'roux', title: 'The last four edges', subtitle: 'Only M and U turns.',
      category: 'LAST SIX EDGES', icon: 'star', color: 'mint', minutes: 5, algorithm: "M' U2 M U2", focusPieces: ['UF', 'UB', 'DF'],
      goal: 'Move three middle-slice edges home and finish the cube.',
      why: 'The last four edges live in the middle slice: top front, top back, bottom front and bottom back. M and U2 turns trade them without disturbing anything else. Follow one edge at a time and you will see the pattern.',
      when: 'Everything else is solved. Three middle edges need to trade places: yellow-green is at the top back, yellow-blue is at the bottom front, and white-green is at the top front. The bottom back edge is already home.',
      hint: 'Push up, turn the top halfway, pull down, turn the top halfway.',
      mnemonic: 'Up, double, down, double.',
      quiz: 'Which turns finish the last four edges?',
      answers: ['Only R and L', 'F and B', 'Only M and U'], correct: 2,
      steps: ['Push the middle slice up.', 'Turn the top halfway around.', 'Pull the middle slice back down.', 'Turn the top halfway again. Every piece is home.'],
      finish: 'A whole cube, solved the Roux way: two blocks, four corners, six edges.'
    }
  ];
  for (const l of additions) {
    l.level = l.questStage;
    l.tag = l.category.toLowerCase();
    lessons.push(l);
  }
  root.CubeClubRouxLessons = additions;
})(globalThis);
