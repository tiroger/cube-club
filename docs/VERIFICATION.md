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

Opened the finished DMG through Finder and visually checked the actual installer window. Both native icons sit inside their landing areas, the arrow and instructions are legible, and the complete mascot and footer fit. The window allows space for Finder's title and path bars. A follow-up layout correction moved both icons upward by 18 points; the rebuilt DMG passed packaging checks, and Finder inspection confirmed that both labels clear the rounded borders. App behavior was unchanged by this packaging work.

Both signatures are for local development. The build Mac had no valid Developer ID signing identity; Apple notarization was not attempted. No security settings were changed. The DMG is a local development installer, not a notarized public-distribution release.


## Version 0.3.1 — smooth camera preview

Removed the shared five-frame-per-second preview/detection loop. A dedicated preview queue encodes frames at up to 30 fps at 720 pixels wide; a separate Vision queue retains the 960-pixel analysis input and runs at up to 5 Hz. Capture requests 720p when supported. Neither lane can enqueue another job until its consumer finishes; preview delivery waits for WebKit image decoding and drawing. Session generations discard work from stopped cameras. Detection uses the original frame timestamp, with separate ordering and freshness checks from video, so live preview frames cannot keep old color evidence ready for capture. Old outlines expire instead of lingering over new video.

**2,534 checks passed:** the existing 2,510 plus 10 additional bridge checks, 9 native pipeline lifecycle checks, and 5 WebKit performance checks. Held preview acknowledgements, stalled analysis, stop/restart, old stream results, independent sequence numbers, face changes, stale evidence with live video, manual edits, and automatic capture were exercised. Generated Vision fixtures and all solver checks still pass.

The real encoder → native WebKit call → JavaScript Image decode → camera canvas path sustained **30.0 fps**, with **2–5 ms p95 capture-to-draw latency** across two runs, using generated 1280×720 frames in the test window on this build Mac. Analysis was deliberately delayed by 350 ms plus a further 250 ms consumer delay; video continued independently. These are synthetic pipeline measurements, not webcam measurements or a guarantee on other Macs. The user's webcam and physical cube still need a hands-on check after installing the update. The test uses a nonpersistent WebKit data store and never requests camera access or modifies saved learner progress.

Rebuilt and verified `Cube-Club-0.3.1-arm64.dmg`, including both local signatures, exact app contents, image integrity, read-only mounting, Applications shortcut, background, and corrected icon-label positions.


## Version 0.4 — direct cross and intuitive F2L

The suite passes **2,728 checks**, including 18 extra checks for the six new lesson setups and 176 dedicated curriculum/practice checks. Starting facelets independently verify the advertised edge locations, white orientation, and shared-color alignment. Tests track every target piece through every turn, check that ready-pair insertions never separate the pieces, confirm the pair-building example joins the pieces at its fifth move, and verify final restoration of the cross and other F2L slots. All eight practice setups are legal; linked demonstrations start with exactly the same cube. Progress migration preserves existing lessons, filters unknown/corrupt data, and prioritizes cases needing another look. The previous native vision tests, solver checks, and 30 fps synthetic preview test still pass.

Browser UI checks completed the right-pair insertion and its quiz, exercised a wrong recognition answer followed by a correction, confirmed that the missed case starts the next three-case review, and completed that review. A reload retained the selected learning stage and completed lesson. Inspected the chapter, tracked-piece lesson, recognition screen, and expanded six-face diagrams at 1280×720 and 1024×720. The face-map disclosure stays open across move updates.

The separate **Cube Club Learning QA** bundle (`club.cube.mac.learningqa`) uses its own saved-progress identity. Native checks exercised the next-step navigation and completed the direct-cross memory lesson and its quiz, including a wrong guess that left the cube unchanged. Stepping backward preserved the expanded six-face map. Quitting and relaunching retained the completed lesson and Next steps selection. The production learner’s stored progress is not modified by QA. No camera access is needed for the new lessons.

Scope: this release adds six prepared lessons and eight recognition cases. They are teaching examples, not an exhaustive F2L case library or a method-aware scanned-cube solver. Existing camera scanning and the general verified solver remain available.

Built and verified `Cube-Club-0.4.0-arm64.dmg`: the app resources match the tested source, the image and app pass their local signature checks, and the package validates its contents, background, Applications shortcut, and corrected icon positions.

## Version 0.5 — Cube Quest progression

**3,679 automated checks passed:** 1,113 core/model checks, 1,148 coaching checks, 62 vision-evidence checks, 176 cross/F2L checks, 195 progression/curriculum checks, 30 camera bridge checks, 209 native Vision checks, 9 camera lifecycle checks, 5 WebKit preview checks, and 732 new WebKit quest integration checks. Synthetic preview stayed at 30.0 fps with 6 ms p95 capture-to-draw latency during deliberately delayed analysis.

The quest model verifies legacy exploration migration without awarding mastery, individual lesson gates, stage prerequisites, guided versus practiced versus independent work, rejected incomplete/assisted checks, all four reachable graduations, persisted earned stages, parent overrides without unearned mastery, bounded solve history, malformed saved values, and timing validation. New teaching cases are checked for legal states, supported notation and exact solutions. T/Y setups preserve all first-two-layer pieces and sticker orientations and have the advertised corner swaps. The lookahead setup begins with two unfinished front slots and a finished cross; after the first three moves only the right slot is complete and the left pair is ready.

The new native WebKit integration runner uses a nonpersistent profile and reduced-motion rendering. It runs every lesson through guided completion, concept explanation, practice and independent checking; completes all four three-question challenges and explicit parent milestones; and checks graduation celebrations. It exercises wrong quiz/move answers, hints, spoken next-move assistance, backward steps, clean retries, guide/autoplay/Space-path protections, alternate lesson entry points through patterns and Together Time, locked previews, parent overrides, serializing/reloading progress, early independent-solve confirmation, timer stop/review/save/discard, and navigation away from an active timer. It cannot modify the learner’s UserDefaults, and never accesses the camera.

Browser visual inspection at 1280×720 and the app’s minimum 1024×720 confirmed readable four-stage cards, visible locked-stage requirements, parent milestone dialogs and the optional timer. Previous preview exploration remained present while mastery started unearned. Parent confirmation was exercised using only local preview test data. The production learner’s progress was not opened or changed.

Scope: 23 prepared lessons (9 beginner, 8 intermediate, 3 advanced, 3 speed workshops). The additional last-layer material teaches foundations and Anti-Sune/T/Y examples; it is not a complete two-look or full PLL/OLL catalogue. Physical solve and finger-technique milestones require the grown-up’s observation. In-app gates are learning guidance, not parental authentication; the override requires explicit acknowledgement but has no PIN. Camera recognition is never an automatic graduation authority. No solve-time threshold controls access.

Built and verified `Cube-Club-0.5.0-arm64.dmg`: read-only mounting, exact app contents, both local signatures, Applications link, original background, and corrected Finder icon positions. SHA-256: `c9ad9b9da49ff07d20dd0e7ca83adb6524f54d322d4afd5a6ff3223d75a76af7`. This remains a local development package, without Developer ID notarization.

The packaged **Cube Club Quest QA** app (`club.cube.mac.questqa`) was launched with a separate UserDefaults identity. Native UI checks confirmed version 0.5.0, both required override acknowledgements, Intermediate opening while Advanced and Speed stayed locked, and the direct-cross lesson progressing through guided exploration, explanation, memory practice and an independent F2 check. The lesson showed “Mastered,” and quitting/reopening retained that mastery and the Intermediate starting point. The QA copy was quit afterward. No production learner preferences were changed.

## Version 0.6 — settings and appearance

**3,761 automated checks passed:** all 3,679 existing checks, 17 new preferences/reset model checks, and 65 native WebKit settings integration checks. Synthetic camera preview still sustained 30.0 fps with 6 ms p95 capture-to-draw latency during deliberately delayed analysis. The settings tests use nonpersistent WebKit storage and fixture progress; they never request camera access or access the learner’s UserDefaults.

Coverage includes defaults and malformed preference values, migration preserving old progress, light/dark/system selection, simulated live system appearance changes, explicit appearance overriding the system, actual dark surface styles, larger text at 1024 pixels wide, reduced-motion cube turns and the Mac motion preference, existing pacing/labels, camera auto-capture persisting in both settings and scan controls, and unchanged cube/palette colors. Reset tests verify cancellation, the required acknowledgement, independent clearing of times and parent overrides, retained earned mastery/graduations, full reset of every historical progress field, retained preferences, first-lesson-only access afterward, serialized persistence, and restoring original progress when saving fails.

Visual inspection checked dark settings, the progress panel, reset confirmation, four-stage quest, lesson and camera-review layouts with larger text at 1024×720. The camera was left off. Light and dark settings were also inspected in the packaged native app. Keyboard focus stays on the chosen appearance or settings section, and new sections and reset confirmations start at the top.

The isolated **Cube Club Settings QA** app (`club.cube.mac.settingsqa`) confirmed the native Settings shortcut (⌘,), matching light/dark window appearance, and persistence of Dark plus Larger text after quitting and reopening. The QA copy was quit afterward. Production learner progress was not opened or changed.

Built and verified `Cube-Club-0.6.0-arm64.dmg`, with exact tested web resources, both local signatures, read-only mounting, Applications shortcut, original artwork and corrected Finder icon positions. SHA-256: `9e2f39f34df031039a8fa981b5f5fc616ee49a6519e1ba7210a1318e9bbbe27b`. The installer remains a local development package without Developer ID notarization. This release still uses one local learner profile; backup export/import and sync are not included.
