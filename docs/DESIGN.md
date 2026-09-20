# A small workshop for a curious cuber

The central promise is “I can understand this.” The app rewards noticing a pattern, trying a move, explaining it, and coming back with a question. Speed is optional and belongs much later.

## Visual direction

Warm paper, soft mint, honey yellow, peach, and a small amount of lavender. Rounded type, a waving illustrated cube, quiet surfaces, and generous spacing give the app a handmade clubhouse feel. The cube is the main learning object, so it is drawn from real face geometry rather than a decorative approximation. Face letters supplement color, and controls have accessible names.

The first screen offers one obvious invitation. The learning path gives freedom to revisit a lesson without artificial locks. A mistake in memory practice leaves the cube unchanged and offers a hint. Completion asks one small question about the underlying idea.

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

## Strong next additions

1. **Beginner-method solve planning:** generate cross, corner, middle-layer and last-layer subgoals from a scanned state. Reuse the teaching patterns and explain why each applies. Keep the current two-phase solver as a recovery path.
2. **Color calibration:** sample actual center colors, support custom cube arrangements, and validate the classifier across common cube finishes and lighting.
3. **A full beginner story:** illustrated piece tracking, more first-layer cases, explicit final corner orientation, and a printable companion sheet.
4. **Multiple local profiles:** separate progress for siblings and a nickname chosen with a parent, without accounts.
5. **Continuous move tracking:** only after snapshot checking has been tested well with real cubes. Hands and hidden faces create ambiguity; the app should ask for another view when it cannot tell.

## Current boundaries

Snapshot checks need hands-on physical-cube testing. Suggested colors require review. Camera comparisons assume the prior guided state was correct and diagnose only no turn or one face turn; arbitrary extra moves require rescanning. Six reviewed faces confirm the entered state, not the reliability of the classifier itself. Lessons still use prepared cases. Scan solutions remain efficient two-phase move sequences rather than a beginner layer-by-layer plan. The app is locally signed and needs distribution signing/notarization before sharing broadly.
