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
