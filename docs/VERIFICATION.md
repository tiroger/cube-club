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

## Version 0.3 — on-device cube vision

The complete suite passes **2,510 checks**: the existing 2,219, 62 color/temporal-evidence checks, 20 camera bridge integration checks, and 209 native image/geometry checks.

Native Vision/Core Image tests use procedurally generated pixels, including flat, tilted, off-center, and six uniform solved-color faces. They check automatic localization without supplied corners, perspective-corrected row-major sampling, sticker-lattice proposals, blank-square rejection, substantial occlusion, clipped corners, and a cube too small to capture. A separate PNG decoder verifies the preview's sticker positions independently of the sampler. This caught a vertical row-order issue during visual QA; it is fixed and covered by that independent test.

Color/evidence checks cover all six default and taught colors, exposure changes, incomplete and indistinguishable calibration, dark/uneven/glared patches, changing colors, wrong centers, geometric motion, stale/duplicate evidence, and stream interruptions. Bridge tests hold image decoding callbacks to check old-session and out-of-order delivery. They also verify one-shot capture, explicit recapture, manual-edit preservation across restarts, teaching-mode capture suspension, stale-control disabling, and protection while solving.

The isolated **Cube Club Vision QA** bundle (`club.cube.mac.visionqa`) used a generated tilted-face image and its real native detector output, repeated through the same image/analysis bridge. It did not open the camera or alter the learner's saved progress. Visual inspection verified the moving-face outline, matching preview/review sticker order, automatic capture, manual corrections remaining intact under ongoing frames, wrong-center rejection, and the optional center-teaching controls. A sample scan still produced the native 17-move solve; after D2, the shared vision panel opened inside the paused move checker. Production resources do not include that QA frame source.

The native image tests need macOS graphics services. In a restricted command sandbox, Core Image returned empty pixel buffers; tests passed with graphics access. This is an environment constraint, not a camera fallback. The production app reports unavailable vision and keeps manual entry available if detection fails.

Remaining hardware validation: use the learner's physical cube, test common sticker and stickerless finishes with the actual webcam, vary room light/glare/distance/tilt/background, and record detection and color error rates. Synthetic checks establish geometry and integration behavior; they do not establish real-world accuracy. This version locates visible faces and checks reviewed snapshots; it does not continuously infer physical turns or unseen stickers.

## Version 0.3 installer packaging

Ran the complete `scripts/build-dmg.sh` path: rebuilt the release app, prepared the full-resolution Finder background, and created the compressed `Cube-Club-0.3.0-arm64.dmg`. The image and embedded app pass strict code-signature verification. Packaging checks verify the image checksum, a read-only mounted filesystem, exactly two visible items, the `/Applications` shortcut, file-by-file equality with the source app, the background/volume-icon hashes, and the stored Finder icon locations and size. A SHA-256 companion file is generated alongside the image. Packaging dependencies are pinned and kept outside the application.

Opened the finished DMG through Finder and visually checked the actual installer window. Both native icons sit inside their landing areas, the arrow and instructions are legible, and the complete mascot and footer fit. The window allows space for Finder's title and path bars. App behavior was unchanged by this packaging work.

Both signatures are for local development. The build Mac had no valid Developer ID signing identity; Apple notarization was not attempted. No security settings were changed. The DMG is a local development installer, not a notarized public-distribution release.
