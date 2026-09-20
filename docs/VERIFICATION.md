# Verification

Verified on September 20, 2026, on an Apple-silicon Mac with Swift 6.4 and the macOS SDK.

## Automated

`./scripts/test.sh`: **1,071 checks passed**, including all 18 animation permutations, legal lesson setups, invalid physical states, color samples, progress normalization, and 20 complete scramble/solve round trips.

`./scripts/build.sh`: release executable compiled, resources copied into a macOS application bundle, and local ad-hoc code signature applied.

JavaScript syntax check passed. No external package installation is required to build or run the model tests.

## Native interface

- Launched the packaged app and inspected the illustrated home screen.
- Opened the right-hand lesson; advanced a turn and checked that the next instruction changed from R to U.
- Switched to memory mode; an incorrect U guess left the lesson on its first move and produced a gentle hint.
- Replayed the full four-move algorithm and reached its completion question.
- Answered the prime-notation question correctly and received the expected feedback.
- Loaded all six faces of a known sample scramble and submitted them through the native solver bridge. The solver core separately passed all 20 verified solves.
- Observed a live native camera preview during user testing.

## Remaining hands-on validation

The live camera preview worked, but a physical cube was not used to validate classification accuracy or follow-along usability. Test under daylight, warm indoor light, glare, and dim light, including red/orange confusion. Confirm behavior with camera access denied, no camera present, and another app using the camera. These error paths are implemented but still require device testing.

Continuous physical-move tracking is not part of this version. Distribution signing, notarization, and testing on an Intel Mac or macOS 13 are also not completed.


## Version 0.2 additions

Automated suite: **2,219 checks passed** (1,071 existing + 1,148 new). New coverage includes all 342 intended/actual single-turn combinations, conditional repairs, partial observations, wrong centers and unknown stickers, adaptive face selection, legal challenge setups, complete shared rounds, and migration of existing progress.

Native checks used a separate `club.cube.mac.qa` application identity so the test discoveries did not modify the learner’s real progress:

- Case Detective: opened a legal yellow-line case, tried an incorrect answer, then chose the correct answer and inspected the explanation and highlighted cube.
- Together Time: completed the four-move right-hand pattern, including a wrong-button hint, correct animations, discussion checkpoints, alternating roles, and completion.
- Guided solve: submitted the sample six-face state through the native JavaScriptCore solver and received a 17-move verified sequence.
- Check my move: advanced the D2 step and entered its known fixture colors using the actual review controls. An incomplete face was rejected; one reviewed face was ambiguous; two faces were labeled as a partial match; six matching faces gave full confirmation.
- Changed a reviewed sticker and confirmed it: the checker reported a mismatch and offered a fresh scan. Returning to the guide preserved move 2 of 17.
- Inspected the native layouts for the challenge, shared round, and snapshot-check screens.
- Quit and relaunched the isolated app; the shared-round and six-face-review badges remained earned.

The snapshot-review tests used manually entered synthetic fixture colors, not a photographed physical cube. Camera classification and repair advice still need a hands-on test with the learner’s cube under real lighting. No claim of continuous tracking or independently measured vision accuracy is made.
