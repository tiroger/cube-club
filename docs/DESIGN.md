# A small workshop for a curious cuber

The central promise is “I can understand this.” The app rewards noticing a pattern, trying a move, explaining it, and coming back with a question. Speed is optional and belongs much later.

## Visual direction

Warm paper, soft mint, honey yellow, peach, and a small amount of lavender. Rounded type, a waving illustrated cube, quiet surfaces, and generous spacing give the app a handmade clubhouse feel. The cube is the main learning object, so it is drawn from real face geometry rather than a decorative approximation. Face letters supplement color, and controls have accessible names.

The first screen offers one obvious invitation. The learning path unlocks in stages, with freedom to revisit earned lessons and parent controls for a later starting point. A mistake in memory practice leaves the cube unchanged and offers a hint. Completion asks one small question about the underlying idea.

## A good learning session

1. **Notice:** inspect the target shape and learn why this case matters.
2. **Watch:** follow one slow move while holding the same orientation.
3. **Try:** choose the next move from memory; a hint is always available.
4. **Explain:** answer a short conceptual question.
5. **Play:** try the pattern in the sandbox, undo it, and look from another side.

An adult can ask “What do you think will move?” before a turn and “What stayed safe?” after it. Five enjoyable minutes are a useful session. The app does not penalize breaks.

## Added in version 0.2

**Check my move** compares reviewed face snapshots against the expected state, the previous state, and each possible single-turn alternative. It chooses an informative next face when views are ambiguous. It reserves full confirmation for all six faces, labels partial matches, and offers conditional repair instructions. Trying a repair clears old evidence. Unknown camera patches, incorrect centers, stale frames, and more complicated mismatches ask for another look rather than asserting a successful move.

**Case detective** uses seven legal cube states to teach yellow-shape recognition, middle-edge placement, and a white corner’s home. The live cube highlights the relevant stickers. Flat face illustrations show the same colors and include text alternatives. Wrong answers are gentle and progress records discoveries only after a correct answer.

**Together time** gives a child and grown-up alternating caller/turner roles. Reveal a move, predict together, turn the virtual cube, and discuss what changed. The discussion checkpoint switches roles. Wrong buttons preserve the cube. Completing a round earns a shared discovery, without a timer.

## Added in version 0.3

**Cube vision** replaces the fixed sampling guide with Apple Vision rectangle proposals, internal grid verification, and a sticker-lattice fallback. Core Image rectifies perspective before reading the nine patches. The live outline follows the detected face by re-detecting each processed frame; this is face localization, not continuous recognition of physical turns.

**Patient capture** requires six recent frames spanning at least 850 ms, a steady outline, a matching center, and agreement for each sticker. Glare, dark/uneven patches, color uncertainty, missing faces, and interrupted streams block capture. Capturing only populates the review board. The user still confirms each face; automatic reads cannot overwrite corrections or edits during solving. Tokens and sequence numbers isolate camera sessions and out-of-order image decoding.

**Teach my colors** lets a grown-up explicitly label the six center colors under current lighting. Once complete, a perceptual Lab comparison replaces default hue classification. Similar or poor-quality center samples are rejected. Calibration now persists between app runs (version 0.9); it does not change the supported center arrangement. Teaching pauses automatic capture.

Both the scanner and move checker share this flow. Processing is local; camera images are neither saved nor transmitted. The implementation has native generated-image coverage and isolated UI checks. Physical cube/camera/lighting benchmarks remain necessary before making real-world accuracy claims or deciding whether to train a cube-specific model.

## Strong next additions

1. **Deeper advanced teaching:** expand F2L, OLL, and PLL case recognition and comfortable finger tricks. Beginner stage-based solve planning is available in version 0.8.
2. **Physical-cube vision benchmarks:** test common finishes, cameras, backgrounds, glare and lighting; add custom center arrangements and a trained detector if measured failures justify one.
3. **A full beginner story:** illustrated piece tracking, more first-layer cases, explicit final corner orientation, and a printable companion sheet.
4. **Multiple local profiles:** separate progress for siblings and a nickname chosen with a parent, without accounts.
5. **Continuous move tracking:** only after snapshot checking has been tested well with real cubes. Hands and hidden faces create ambiguity; the app should ask for another view when it cannot tell.

## Current boundaries

Snapshot checks need hands-on physical-cube testing. Suggested colors require review. Camera comparisons assume the prior guided state was correct and diagnose only no turn or one face turn; arbitrary extra moves require rescanning. Six reviewed faces confirm the entered state, not the reliability of the classifier itself. Lessons still use prepared cases. Scan solutions offer a beginner layer-by-layer guide and an optional general two-phase solution. The app is locally signed and needs distribution signing/notarization before sharing broadly.

## Added in version 0.9

**A saved place for each adventure.** Completed turns checkpoint locally. Lesson and guided-solve slots are separate, and the clubhouse puts their Continue cards ahead of the usual invitation. The pause control offers an explicit, reassuring stopping point. Resume shows all six expected faces with top-edge guidance; a changed physical cube needs a fresh scan. Saved data contains only bounded model values. Trusted lesson content and teaching-stage plans are reconstructed from bundled code. Independent checks restart after a break to preserve the fresh-attempt requirement.

**Backups in the grown-up corner.** Native file panels save portable JSON. Imports are validated and previewed before acknowledged replacement; the previous journey is kept as a recoverable local copy. No arbitrary backup text becomes HTML or teaching instructions. Camera calibration stores only explicit center-color samples, survives restarts, and can be forgotten separately from progress. Changing cube, camera, or lighting still calls for re-teaching.

## An optional Roux branch

**Block Builders** is a side path that opens when First Solve is graduated, next to Piece Partners. It teaches Roux: two 1×2×3 blocks, the four top corners, then the last six edges with only M and U turns. A child who prefers building blocks can follow it without giving up the main path; graduating it opens nothing else, and the clubhouse keeps suggesting the main path unless the child chooses the branch. A parent can open it with its own grant. Main-path grants do not open it.

The cube now animates slice, wide and whole-cube turns, and the turn pad adds a row for whichever of these a lesson uses. Corners use two steps a child can manage: Sune (already met in First Solve) turns them yellow-up, then one corner swap trades two corners. If no side matches, the same swap from any side creates a matching side. The well-known corner 3-cycle R U′ L′ U R′ U′ L U is not used for this step, because it also twists the corners it moves.

Lessons are prepared cases, like the rest of Cube Quest. Guided Roux solves of a scanned cube would need a block-finding search and are not included.

## Updates without a parent's chore

Most installs are set up once by a parent and then used by a child. Updates therefore happen quietly. A daily check downloads a new build in the background, and the build installs the next time the app quits; nothing pops up while a child is learning. A **Check now** button and the app-menu item show Sparkle's usual windows only on request.

Checking means going online, which the app had never done. Grown-up corner says plainly what reaches GitHub (the Mac's internet address) and what never does (progress, pictures, names). One switch turns off both checking and installing. The updater starts only in a bundle that names a feed and a signing key, so development and test builds never go online.

## One clear next step in every lesson

A child testing the iPad app reported that lessons asked for "the same thing over and over" and that it wasn't clear what to do next. Each lesson used to need three runs of the same moves (guided, from memory, then a no-hint check) before the next lesson opened. During the memory runs the move buttons sat below the fold, while the big button under the cube said "Give me a hint".

Now a lesson goes **Watch me → Question → Your turn**, and finishing those opens the next lesson. A turn with no hints, back steps or slips earns the **gold star** on the spot. Otherwise "Try for a gold star" stays optional. Graduating a stage still needs every gold star, the stage questions and a grown-up's real-cube check, so the bar for a stage is unchanged.

After each step, the pop-up offers one primary button for the next step. During a turn, the move pad sits directly under the cube, and Hint is a small secondary button.

## First-time tours

New players get three short spotlight tours, each shown once:
- **Welcome:** the first time the app opens. It covers the clubhouse, Cube Quest, the start button, the playground, solving a real cube, and the grown-up corner.
- **Lesson:** the first lesson. It covers the practice cube, Next move, the lesson steps, and read-aloud.
- **Your turn:** the first turn. It covers the move buttons under the cube, and Hint.

Each step dims the screen except one control, and a cube buddy explains it in one or two short sentences, read aloud when read-aloud is on. The steps show one thing at a time because a full-screen overlay labeling everything at once is too much to read for an eight-year-old. Tours never interrupt a dialog. Skip ends a tour for good, and Settings → Learning & camera → Show me around brings them back.

