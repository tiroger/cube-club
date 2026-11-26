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

## Version 0.7 — native Mac navigation

**3,814 automated checks passed:** the existing 3,761 checks plus 51 native-shell integration checks and 2 sidebar collapse checks. The complete existing suite passed; after the final narrow-layout and rejected-navigation refinements, the native-shell suite was rerun and passed. Synthetic camera preview remained at 30.0 fps with 6 ms p95 capture-to-draw latency under delayed analysis.

The new runner uses the actual AppKit `ClubShell` with nonpersistent WebKit storage and an in-memory save/load bridge. It checks native destination selection, lesson titles and parent navigation, sidebar collapse expanding the teaching canvas, read-aloud state, larger native sidebar rows, light/dark themes, and narrow-window layouts. It verifies that native controls cannot bypass scan review, reset acknowledgement, locked lessons, or timer eligibility; leaving a running timer stops it for review without saving it. Rejecting a sidebar click during a cube turn restores the prior selection. Window-layout persistence is disabled in the automated runner, and it never opens the camera or reads learner progress.

The isolated **Cube Club Native QA** app (`club.cube.mac.nativeqa`) was used for visual and interaction checks. Verified native sidebar selection, opening a lesson, advancing the animated cube to move 2, updated window title and Back destination, hiding/showing the sidebar with ⌃⌘S, native Settings via ⌘, and returning home with ⌘1. Light and dark toolbar/sidebar/content were inspected. The final build was checked with Larger text, including the wider native sidebar, camera review at a small window size, and entering/exiting full screen with ⌃⌘F. Closing camera review restored the prior selection and toolbar actions. Camera capture stayed off. Reopening the QA app retained Light appearance and the previous window size. The QA app was quit afterward; production learner data was not opened or changed.

The native shell uses AppKit window controls, a unified compact toolbar, source-list navigation, SF Symbols, and a translucent sidebar. The local teaching canvas and settings content remain in WebKit. The Mac build hides the former web header, profile circle, sidebar, and footer; browser previews retain their navigation. This is a native window/navigation update, not a rewrite of every lesson control in AppKit.

Built and verified `Cube-Club-0.7.0-arm64.dmg`: exact tested resources, read-only image mounting, both local signatures, Applications link, original artwork, and corrected Finder icon positions. SHA-256: `ff977cd0bdb1d08d7e73587111110d274903788603a8df7e6f68b02d643c2f3f`. This remains a local development package without Developer ID notarization.

## Version 0.7.1 — restore the cohesive clubhouse sidebar

Restored the original sidebar, branding, rounded typography, green navigation highlights, learner profile, footer, and teaching-page spacing. Removed the AppKit source-list sidebar and split-view wrapper. The compact Mac toolbar, current-lesson title, menus, full screen, and keyboard shortcuts remain; the extra web-style top header stays hidden. The native sidebar control now hides/shows the original sidebar and gives the teaching page the freed space. Each launch begins with the sidebar visible.

**3,817 automated checks passed:** all 3,761 model, camera, progression, and settings checks plus 56 revised Mac toolbar integration checks. Coverage includes original-sidebar visibility and theme colors, toolbar hide/show labels and reclaimed content width, navigation in both directions, lesson titles, modal protections, progression gates, timer behavior, and large-text layouts at the minimum window size. Synthetic preview remained at 30.0 fps with 6 ms p95 capture-to-draw latency.

Visual QA used only the isolated `club.cube.mac.nativeqa` app. Inspected the restored light and dark clubhouse with Larger text, verified ⌃⌘S hides and restores the sidebar, opened Cube Quest using the original sidebar, and checked the matching window title. The test app was quit afterward; production learner progress and preferences were not opened or changed.

Built and verified `Cube-Club-0.7.1-arm64.dmg`: tested resources match the embedded app, both local signatures pass, and the read-only image, Applications link, original background and corrected Finder positions are intact. SHA-256: `212859005261ad439faeefef13e4d6510c07d3f6392d9e692b1b7e3099dd536c`. Local development signing and the existing notarization limitation are unchanged.

## Version 0.7.2 — integrate branding into the Mac toolbar

Moved the Cube Club wordmark and four-color mark beside the window controls. The transparent native toolbar now shares the original sidebar’s warm-paper or dark-green background, with no separator across the top. The current page or lesson appears below the wordmark, and clicking it returns home. Removed the duplicate sidebar wordmark in the Mac app; browser previews retain it. Original sidebar navigation, rounded type, selections, learner profile and footer remain.

**3,823 automated checks passed:** the existing 3,761 model, camera, progression and settings checks plus 62 Mac toolbar integration checks. New checks cover the native brand’s bounds and subtitle, navigation through the actual button, visibility with the sidebar hidden, and disabling the brand during camera review. Synthetic preview remained at 30.0 fps with 6 ms p95 capture-to-draw latency.

Visually inspected the isolated Cube Club Native QA app in Dark and Light with Larger text at the 1024-point minimum width. Verified matching toolbar/sidebar backgrounds, page navigation, clicking the brand to return home, disabled toolbar controls during settings, and hiding/restoring the sidebar. Entered and exited full screen; the wordmark and actions remain properly placed. Camera capture stayed off, and production learner data was not opened or changed.

Built and verified `Cube-Club-0.7.2-arm64.dmg`. Tested web resources match the embedded app; app and image signatures, exact packaged contents, read-only volume, Applications link, original installer artwork and corrected Finder icon positions pass verification. SHA-256: `b133218bed9be5f3314271213b98d3327520f0f8033eca968f97e48bef59ef9e`. Existing local signing and public-distribution limitations are unchanged.

## Version 0.7.3 — remove the misleading toolbar arrow

Removed the toolbar’s Back arrow: it was a parent-page shortcut, with no navigation history and no destination on home. The Go menu retains the keyboard shortcut with an explicit destination label, “Return to My clubhouse” or “Return to Cube Quest.” The wordmark and sidebar remain the primary navigation.

All 62 existing Mac toolbar integration checks passed after updating their expectations for the removed item and explicit parent-menu labels. Verified the packaged app visually in the isolated QA copy at minimum width with Larger text: the arrow is absent and branding and actions retain their positions. The full unrelated model/camera suite was not rerun for this toolbar-only change. Production learner data was not opened or changed.

Built and verified `Cube-Club-0.7.3-arm64.dmg`: embedded web resources match, signatures and exact app contents pass, and the read-only volume, Applications link, installer artwork and Finder layout are intact. SHA-256: `20aa02aa1827ebf4c2d578fece524d8e2f860697f6817b4da63535a7561ab769`.

## Version 0.8.0 — teach the beginner method on a scanned cube

Added a distinct beginner planner and made **Teach me to solve** the scanner’s default. It builds a daisy, matches the white cross, inserts white corners and middle edges, makes the yellow cross, positions and orients the corners, then cycles the last edges. Short setup searches and named beginner patterns are bounded; every chunk endpoint, stage objective and full solution is checked. Already completed crosses/layers are retained. The original general solver remains under **Just show the moves**. Both run on the same background JavaScriptCore service in the Mac app.

The teaching screen shows eight milestones, one short sequence at a time, moving-piece highlights, reasons for the moves and six-face comparison diagrams. It stops for an explicit real-cube comparison at milestones and allows the existing reviewed camera checks. Going backward clears affected confirmations. A final self-confirmation credits guided practice once; no lesson mastery, graduation or independent-solve access is awarded.

Four new lessons bring the total to **27 (13 beginner)**: building a daisy, inserting white-up corners, the left middle-edge insert, and finishing all yellow-corner orientations. Lessons include trapped-piece recovery and the need to finish the corner procedure even when the bottom temporarily looks mixed. The daisy uses a custom setup and a real daisy objective. Existing lesson IDs, mastery records and graduations are preserved.

Each scan face and move-check face now includes a small animated center-only cube and explicit front/top color cues. Reduced motion uses the final pose. Camera access remains opt-in, each capture still requires review, and manual entry remains available. The camera-start button and teaching turn controls fit the short-window layout with Larger text.

**28,637 checks passed across the full suite and final targeted rerun.** This includes 24,121 beginner-planner checks over 120 deterministic scrambles, all 27 legal top-corner twists, all 24 top-corner permutations and all 12 even final-edge permutations. The full curriculum journey passes 905 WebKit checks. The final native teaching journey passes 496 checks covering both actual solver modes, all six illustrations’ forward/up transforms, milestone guards, previous-turn/redo, camera-check integration, cancellation, final confirmation, progression isolation and daisy completion. General solving, camera detection, settings, progression and toolbar checks pass. Synthetic camera preview measured 30.1 fps and 6 ms p95 capture-to-draw latency.

Visually checked the packaged app in the isolated **Cube Club Native QA** identity, in Light and Dark with Larger text at the minimum 1024-point width. Inspected scan mode choices and orientation illustrations, solved the sample through the real native beginner service, and inspected highlighted pieces and turn controls. Camera capture stayed off; production learner preferences and progress were not opened or changed.

Built and verified `Cube-Club-0.8.0-arm64.dmg`: tested resources match the embedded app; app/image signatures, exact contents, read-only mounting, Applications shortcut, installer artwork and Finder positions pass. SHA-256: `c8a93c0ac5a56775762b290279eb2856287492964ddc2794dceb4efeb0236897`.

Remaining limits: real-world camera recognition and follow-along usability still need testing with the learner’s physical cube under varied lighting. The guide compares reviewed snapshots rather than continuously tracking hands. Beginner plans prioritize teaching and may be much longer than the general solution. Intermediate/advanced case libraries remain introductory. In-progress solves do not persist across launches. Existing local-signing/public-distribution limitations remain.

## Version 0.9.0 — saved adventures, portable backups, and remembered colors

Lessons and guided solves keep separate, versioned saved places. Completed turns, backward steps, replay, and teaching-stage confirmations update the saved state. The clubhouse offers Continue cards; Save & take a break waits for persistence before leaving. Resume reconstructs the cube and bundled teaching plan, displays all six faces with top-edge colors, and requires a deliberate continuation. It never starts a camera or autoplay. Independent checks restart from move one; resume cannot award mastery, skip lesson locks, or bypass teaching milestones. A mastered completed lesson or credited solve leaves the saved-place list.

Native Save/Open panels export and import bounded UTF-8 JSON files. A backup includes normalized progress, preferences, saved sessions, and calibration samples. Import validates schema/version, size, cube legality, algorithms, and teaching checkpoints before showing a summary and requiring acknowledgement. No imported string becomes HTML or teaching content. Replacement preserves the previous saved journey as a local recovery copy, available after relaunch. Failed or cancelled operations retain current progress. Color teaching now saves explicit RGB samples, including partial profiles; startup and restore load the actual classifier palette. Forgetting colors is independent from resetting learning progress. A learning reset clears saved sessions and preserves preferences and calibration.

**29,094 automated checks passed in the final complete suite.** This includes the existing 28,637 checks plus 372 continuity model checks, 67 native WebKit continuity checks (including a real WebKit reload), and 18 native file/storage checks. New coverage includes all 27 lesson modes; exact lesson and solve reconstruction; milestone and progression protection; restarting independent checks; automatic saves, pause failure and retry; backup round trips, unsupported/corrupt/oversized inputs, previews, cancellation, failed restore, recovery, theme application, calibration round trips, partial profiles, reset scope, atomic file replacement, and reading persistence through a fresh storage instance. Full curriculum and teaching-completion regressions pass. Synthetic camera preview remained 30.0 fps with 6 ms p95 capture-to-draw latency.

Visually inspected the actual packaged app in the separate **Cube Club Native QA** identity, with Larger text at minimum window width. Verified the pause control, clubhouse saved-adventure card, and six-face resume comparison in Dark and Light. Exported a temporary QA backup through the actual native Save panel, selected it through the Open panel, reviewed the replacement summary, and restored it. Quit and reopened the app to confirm the saved lesson remained. Camera access stayed off; the learner’s production preferences and progress were never opened or modified.

The 0.9.0 Apple silicon DMG retains the illustrated installation background. Packaging verified the read-only volume, exact application contents, local signatures, Applications shortcut, background and icon layout. The embedded Web resources match the tested source files. SHA-256: `5dd1af8e2e7d9289f48567972ac372c2958a742e24640a7af75801e91e99fa8f`.

Scope: one local learner profile, one saved lesson and one saved solve, with manual backups rather than automatic sync. Unfinished six-face scans, playground/recognition rounds, and running timers do not resume. Camera calibration still needs re-teaching after changing cubes, cameras, or lighting. Physical-cube recognition accuracy and public-distribution signing limitations remain as documented above.


## Version 0.9.1 — steadier cube-face recognition

The reported failure was finding or keeping a cube face, rather than color calibration. Acquisition now keeps the existing rectangle/lattice detector and adds a visible, pixel-square alignment guide with bounded grid hypotheses when no outer rectangle is found. Apple Vision rectangle tracking carries verified corners between frames. Every tracked or guided frame independently verifies the physical 3×3 seams and samples current pixels; no earlier color reading is replayed. Tracking resets on camera session changes, image-size changes, and long frame gaps.

Consensus allows gentle hand drift and one short detection miss without discarding the entire hold. Missing evidence still disables both capture and color teaching. Repeated loss, weak geometry, sudden movement, stale evidence, wrong centers, glare, and uncertain colors continue to block capture. All six accepted frames must fall within 1.6 seconds. Starting the camera scrolls its full preview above the sticky scanner footer at the minimum window size.

Verification passed **29,531 checks** across the full suite and the additional camera-guide WebKit suite. Final camera UI edits were followed by another JavaScript/bridge run and the guide's native WebKit checks. New regression coverage includes:

- Guide acquisition with outer-rectangle detection deliberately disabled, correct sticker orientation, fresh colors after a face changes, wide-camera geometry, blur tolerance, and rejection of blank surfaces, stripes, and occlusion.
- A 12-frame generated hand-movement sequence: all 12 frames used tracking, averaging approximately 2 ms per analysis on the build Mac. This is a synthetic fixture measurement, not a physical-camera accuracy benchmark.
- Single-miss recovery without accepting stale colors, repeated-loss reset, gentle drift, sudden movement, and camera-session tracking reset.
- Actual canvas rendering in light/dark modes and larger text at 1024×720, complete preview visibility above the footer, unavailable controls during recovery, and required color review after capture. Both themes were visually inspected using isolated WebKit screenshots.
- Preview under deliberately slow analysis: 30.0 fps and 6 ms p95 capture-to-draw latency in the generated-video benchmark. The preview remains independent of recognition.

No physical camera was opened and no learner data was changed during testing. Reliability across real cubes, lighting, and cameras remains unmeasured; the user's setup still needs a trial. Recognition remains geometric computer vision, without a custom trained cube model or continuous move interpretation. The tracker verifies face location only.

The Apple silicon 0.9.1 DMG (build 14) retains the illustrated installer. Packaging verified the read-only volume, exact app contents, local signatures, Applications shortcut, artwork, and icon layout. Packaged camera resources match tested source. SHA-256: `1ff6c8647be67a9c9442d92af88e8ffd02cc8ea7d0f145b91eaedc583b1e1409`.


## Version 0.9.2 — capture a reviewed picture when recognition stalls

A real user reported that the face outline appeared but color capture hung. The automatic path previously required all nine stickers to be classified consistently in five of six recent frames. A single reflective or borderline sticker could therefore keep the entire face stuck, and the explicit **Read this face** button was disabled by the same all-nine gate.

With a fresh, verified face outline, **Use this picture** now offers the current frame’s color suggestions immediately. Uncertain squares stay as question marks and must be corrected before confirming the face. A manually reviewed picture locks that face against later automatic overwrites. If the center is classified as a different face, the explicit capture warns the user and keeps the selected face’s center fixed for review. Automatic capture still requires the stricter temporal consensus. Center-color teaching is available after two agreeing verified pictures, rather than the full six-frame wait; its existing quality and distinctness checks remain active.

The JavaScript camera checks cover an early explicit picture, one uncertain sticker, a center disagreement, review lockout, stale frames, and two-frame color learning. The native WebKit camera screen checks that the button is usable after the first outlined picture, that question marks remain visible for correction, and that a learned center is saved through the bridge. Existing cube-state validation still rejects incomplete or impossible six-face scans. Synthetic tests cannot measure accuracy for the user's physical cube, so a hands-on scan remains necessary.

The complete model, native vision, camera-pipeline, WebKit, teaching, continuity, and backup suite passed. An intermittent WebKit service startup made the quest integration check exceed its former 55-second runner deadline once; the same 905 checks passed in isolation and in the final full run with a 120-second deadline. The Apple silicon 0.9.2 DMG (build 15) passed read-only image, exact app contents, local signature, Applications shortcut, artwork, and icon-layout verification. SHA-256: `45157bcd9e38ba42ec251843f919eb0257460eded8ebd113530f237bd9874c8b`.

## Version 0.9.3 — clean installer folder

The 0.9.2 DMG left `.background.tiff` and `.VolumeIcon.icns` at the volume root. Finder exposed them as stray icons when hidden files were shown. Merely setting Finder's invisible flag did not fix that configuration. The background now lives inside the signed app bundle; the packaging hook moves the same HFS+ file referenced by the Finder background alias into that bundle without changing its file ID. The optional volume icon is omitted. The volume root contains only `Cube Club.app`, `Applications`, and Finder's own `.DS_Store`. Finder was inspected with hidden files visible and showed exactly the app and Applications over the original illustration.

The JavaScript/model suite passed after the version update. The Apple silicon 0.9.3 DMG (build 16) passed image integrity, read-only mount, exact two-item root, app contents and signature, Applications link, embedded background hash and alias identity, and icon positions. SHA-256: `6e3298cdffafb737b8919fffc91719df911efc4a2cd6c7633016137cf19a7d3e`.

## Version 0.10.0 — Block Builders, a faster first solve, and CI

**Block Builders** is an optional Roux branch that opens after First Solve. It has eight lessons: the middle slice, both 1×2×3 side blocks, two-look corners, and the last six edges. The cube view now animates slice, wide and whole-cube turns. The Roux suite adds 2,162 checks. They test those animations against the cube model, each lesson's setup and wording, both blocks surviving the later steps, and the branch's unlock rules. The WebKit quest walkthrough masters all eight Roux lessons through the real screens and graduates the branch.

The app is now signed with `com.apple.security.cs.allow-jit`. Without it, JavaScriptCore ran in the app without its JIT, and the general solver's first run took about 14.6 s to build its lookup tables. With the entitlement this takes 0.7 s on the build Mac; later solves take about 35 ms either way. The app is still ad hoc signed without the hardened runtime, so camera access is unchanged. `build.sh` and the DMG packager both fail if the entitlement is missing.

GitHub Actions now runs the full suite and the app build on macOS 15 (Swift 6.1.2). On those runners, the camera preview test requires independence from slow analysis (at least 40 frames, 6 fps and p95 under 1 s). Local runs keep the 100 frames / 20 fps / 250 ms thresholds. The first runner measurements were 17–18 fps.

The complete suite passed locally and on CI. The Apple silicon 0.10.0 DMG (build 17) passed read-only image, exact app contents, local signature, Applications shortcut, artwork, and icon-layout verification. The mounted app reports 0.10.0 (17), carries the JIT entitlement, and includes the Roux lessons. SHA-256: `ffe68ff210d5c7dd686893e676dafe6631fd157477e8133aa29dd8745ec9024a`.
