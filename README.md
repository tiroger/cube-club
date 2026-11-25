# Cube Club

A gentle, playful Rubik’s Cube workshop for a curious eight-year-old. A native macOS app with an illustrated clubhouse, a real interactive 3D cube, short algorithm lessons, and a camera-assisted guide for the cube in your hands.

## Open the app

Open **`build/Cube Club.app`** in Finder. The supplied local build is for Apple silicon and requires macOS 13 or later. It is locally signed for development, not notarized for public distribution.

To build from source, install Xcode or Apple’s Swift command line tools, then run:

```sh
./scripts/build.sh
open "build/Cube Club.app"
```

You can also open `Package.swift` in Xcode. Use the packaged `.app` when testing the camera: it contains the camera permission description and a stable app identity. Version 0.3 adds on-device cube-face detection, perspective correction, steady automatic capture, and optional color calibration to both scanning and move checks. Version 0.3.1 separates preview and detection: video targets 30 fps while cube analysis runs up to 5 times per second. Slow analysis or a busy interface drops intermediate frames instead of queuing delayed video. No npm install, remote service, API key, or account is needed. Building on an Intel Mac produces an Intel build.

## Install from a disk image

Open `dist/Cube-Club-0.9.3-arm64.dmg`, then drag **Cube Club** onto **Applications**. Eject the disk image and open Cube Club from Applications. The installer has a custom illustrated background, an Applications shortcut, and a fixed Finder layout. Its top level contains only the app and Applications, even when Finder shows hidden files.

The current image is an Apple silicon build for macOS 13 or later. The app and disk image are locally signed for development. This is **not an Apple-notarized public release**: public distribution needs a Developer ID certificate and notarization. No Developer ID signing identity was available on the build Mac.

To reproduce the complete app and installer build:

```sh
./scripts/build-dmg.sh
```

The script creates an isolated Python environment under `build/dmg-tools` and installs three pinned packaging dependencies on its first run. Later runs reuse them. Python 3.10+ and the Swift command-line tools are required. Use `./scripts/build-dmg.sh --skip-build` to package an already-built app.

Output goes to `dist/`, with the version and architecture read from the app, plus a `.dmg.sha256` checksum file. Before replacing a previous image, the script checks disk-image integrity, mounts it read-only, verifies both signatures and exact app contents, and checks the Applications link, embedded background, and icon locations. Temporary images are ejected automatically. Building disk images requires normal access to macOS disk-image services; restricted command sandboxes can block them.

The original background and generation prompt are in [`assets/dmg`](assets/dmg/ARTWORK.md). Finder layout coordinates are in `scripts/dmg-layout.json`.

## What’s here

- **A cohesive clubhouse with a Mac title bar:** Cube Club branding beside the Mac window controls, a toolbar that shares the sidebar’s colors, rounded type, and illustrations. Hide the sidebar for more room or use Mac keyboard shortcuts.
- **My clubhouse:** an original illustrated cube character, a friendly starting point, and saved learning progress.
- **Cube Quest — four stages, an optional branch, and 35 lessons:** Beginner / First Solve → Intermediate / Piece Partners → Advanced / Clever Solutions → Speed Solver / Smooth Moves. Stages and lessons show their prerequisites and open through mastery, stage questions, and parent-confirmed physical milestones.
- **Block Builders — an optional Roux branch, eight lessons:** opens after First Solve, alongside Piece Partners. Meet the middle slice (M), finish a left block, build the right block with wide r turns, turn the top corners yellow-up with Sune, trade two corners, find the edge-flipping “arrow”, place the side edges, and finish the last four edges with only M and U. Graduating the branch opens nothing else; a parent can open it separately.
- **First solve — 13 short missions:** cube notation, making a daisy, matching the white cross, right/left patterns, white-corner insertion, both middle-edge insertions, yellow cross, corner homes, finishing corner orientation, Sune as an alternative pattern, and the final edge cycle. New lessons explain trapped-piece recovery and why the lower layers temporarily look mixed during corner orientation.
- **Next steps — six more missions:** direct white-cross insertion, alignment and restoration; ready F2L pairs on the right and left; and an introductory pair-building case. Follow the actual corner/edge stickers through each turn, with per-move explanations and six-face diagrams.
- **Pattern practice:** eight cross/F2L recognition cases, gentle hints, links to the matching animated lesson, and three-case reviews that prioritize mistakes before new and less-practiced cases.
- **An actual cube model:** drag to orbit; turn any face; watch the layer rotate; undo; scramble; return to a fresh cube. The animation geometry is tested against the solver’s permutation model for all 18 moves.
- **Learn, practice, explain, check:** guided completion records exploration; memory practice permits hints; a correct concept answer records understanding; a fresh independent move sequence earns mastery. Wrong turns, hints, reading the next instruction, or stepping backward require a fresh independent check. Old exploration and badges remain saved.
- **Eight new workshops:** last-layer orientation versus permutation, Anti-Sune, efficient ready-pair insertion, T and Y PLL examples, inspection, comfortable finger practice, and a two-pair lookahead drill.
- **Optional solve timer:** opens after a parent confirms an independent real-cube solve. Start/stop buttons and Space control timing; only a confirmed solved cube saves a time. Retains the last 50 local times with personal best, arithmetic mean of the last five, and a next-practice focus. No time threshold controls progression.
- **Solve my cube:** six-face camera capture, suggested colors, manual painting and rotation, and full physical-state validation. Choose **Teach me to solve** (the default) for a beginner layer-by-layer plan, or **Just show the moves** for the original general solution. Teaching shows a short sequence, moving-piece highlights, a reason for the pattern, eight milestone markers, six-face diagrams, and deliberate pauses to compare the real cube. Existing finished layers are respected; guided solves do not award independent mastery.
- **Cube vision:** animated center-only cube illustrations show each requested face and its top-edge orientation. Reduced motion shows the final grip. A live outline follows detected 3×3 faces. Tilt is corrected before sampling, several frames must agree, and capture pauses for review. Optional six-center color teaching adapts the classifier to the current cube and room lighting.
- **Check my move:** optional snapshot checks after a guided turn. Review one or more faces; the app distinguishes ambiguous views, partial matches, full six-face matches, and common single-turn mistakes. Conditional repair instructions help undo an identified mistake.
- **Case detective:** seven visual challenges using real cube states, highlighted stickers, hints, accessible color descriptions, and explanations for yellow shapes, edge slots, and a corner’s home.
- **Together time:** parent-and-child rounds with alternating caller/turner roles, a reveal/predict/turn/discuss flow, gentle wrong-move feedback, and shared discoveries.
- **Settings & grown-up corner:** Light, Dark, or Follow my Mac appearance; larger teaching text; reduced motion; read-aloud, slower turns and face labels; saved camera auto-capture choice; parent milestones and starting-stage overrides. Clear timer history, restore lesson locks, or deliberately reset all learning progress. Overrides open practice without awarding mastery or graduation; the controls are not password protection.
- **Discovery badges:** effort and learning count. There are no leaderboards, accounts, advertising, or streak penalties. Timing is optional.

## Try it in two minutes

1. Open **Start my adventure** and use **Next move**. Watch four right turns restore the cube.
2. Answer the question, choose **Practice from memory**, then complete **Check myself** to master the first lesson and unlock the next. A parent can adjust the starting stage in **Grown-up corner**.
3. Open **Practice playground**. Make a turn and undo it. Drag the cube to see its hidden faces.
4. Open **Solve my cube → Try a sample cube → Teach me to solve** to exercise the complete solver without a camera.

## Make it yours

Open **Settings & grown-up corner** in the sidebar, the toolbar’s gear button, or **Cube Club → Settings…** (⌘,).

- **Look & feel:** choose Light, Dark, or Follow my Mac. The native window follows the same appearance; the cube’s sticker colors stay unchanged. Larger text increases teaching copy and controls. Reduce motion shows turn results without spinning, and also respects the Mac’s Reduce Motion setting.
- **Learning & camera:** choose read-aloud instructions, slower animated turns, center face letters, and automatic capture when a face is steady. Changing auto-capture inside a scan also saves the choice for the next scan or move check. The camera still starts only when requested and every capture needs review.
- **Progress:** manage parent confirmations and starting-stage overrides. **Clear times…** removes timer history while preserving lesson progress and timer access. **Restore lesson locks** removes parent overrides while preserving earned mastery and graduations.

To start over, open **Progress → Reset all progress…**. Review the explanation, check the acknowledgement, and confirm. This clears all learning milestones, discoveries, practice records, solve counts, parent overrides, times, and saved lesson/solve sessions; it returns the learning path to the first beginner lesson and locks the optional timer. Appearance, accessibility, voice, pacing, labels, camera preferences, and learned camera colors remain saved. Cancel leaves everything unchanged. Save a backup before resetting if you want to bring this journey back later. There is no automatic reset during an update.

Settings and progress stay on this Mac. This release uses one learner profile with manual backup export/import; it does not sync automatically between Macs.

## Pause, resume, and backups

Lessons and guided solves save after each completed turn. Choose **Save & take a break**, or quit and come back later. The clubhouse shows separate **Continue** cards for your last lesson and your last cube solve; a lesson never displaces a physical-cube solve. Starting another lesson replaces the saved lesson, and a newly verified solve replaces the saved solve. Camera scans in progress, playground turns, recognition rounds, and running timers are not resumable sessions.

Continuing shows six face diagrams, including the top-edge color for each view. Hold yellow up and green in front, compare your physical cube, and choose **My cube matches · continue**. If the cube changed during the break, choose **My cube changed · scan again**. Resuming never starts the camera or plays moves automatically. Teaching-stage confirmations and completed-turn positions are retained; undoing a stage requires its review again. Independent lesson checks deliberately restart at move one after a break. Learned and practiced milestones remain saved; resume itself awards no mastery.

In **Settings → Progress**, choose **Save a backup…** to create a JSON file using the Mac’s Save dialog. It contains progress, settings, the two saved sessions, and learned RGB color samples; it contains no camera pictures. Put a copy somewhere safe before reinstalling or moving Macs.

Choose **Restore a backup…**, select the file, review its summary, and acknowledge replacement. Unsupported formats, oversized files, invalid cube states, and malformed data leave the current journey unchanged. Restoring replaces the local profile; it does not merge two profiles. The previous saved journey is retained on this Mac. **Recover the journey from before the last restore…** lets you review and restore that copy, including after restarting the app. Keep a separate backup for protection if the Mac or its app data is lost. Re-teach camera colors when the new camera or lighting differs.

## Mac navigation

The packaged app puts the Cube Club wordmark beside the Mac window controls in a native AppKit toolbar. The toolbar and original clubhouse sidebar share a continuous light/dark background. The current page or lesson appears beneath the wordmark; click the wordmark to return home. Rounded type, green navigation highlights, the learner profile, and footer keep the teaching screens’ design. The duplicate sidebar wordmark and web top header are hidden only in the Mac app. The camera button opens cube review; it does not turn on the camera automatically. The speaker button controls read-aloud, and the gear opens settings. Navigate with the sidebar or click the wordmark to return home; the toolbar has no history arrow.

- **⌃⌘S:** show or hide the sidebar.
- **⌘[**: use the Go menu’s explicitly named return command to reach Cube Quest from a lesson, or My clubhouse from a main section. This is a parent-page shortcut, not navigation history.
- **⌘1–8:** open the destinations listed in the **Go** menu.
- **⌘,:** open Settings.
- **⌃⌘F:** enter or exit full screen.

Window size and position are remembered. The sidebar is visible at launch and can be hidden temporarily for extra practice space. Native navigation respects open reviews and confirmation dialogs, waits for an active cube turn, and uses the same learning gates and timer behavior as the teaching screens. Light/Dark/Follow my Mac apply to both the native controls and lesson content.

## Follow Cube Quest

Open **Cube Quest** in the sidebar. All four destinations are visible, with the optional Block Builders branch beneath them. A locked destination previews its lessons and explains which earlier graduation is needed. Within a stage, master the previous lesson to open the next one. Each lesson has four saved steps:

1. **Learn:** finish the guided pattern or autoplay.
2. **Practice:** perform the pattern from memory. Hints and retries count as practice.
3. **Explain:** answer the lesson’s discovery question. You can try again.
4. **Independent check:** start fresh and choose all moves without mistakes, hints, next-instruction read-aloud, or backward steps. Explanations that reveal algorithms are hidden during this check. Camera use and physical turning speed are not required.

A graduation needs every lesson in that stage mastered, three independently answered stage questions, and a grown-up’s explicit confirmation of the physical-cube milestone. A wrong stage answer explains the idea and offers a fresh attempt. Earned graduations remain open. The reset control explicitly clears all progress, overrides, and saved times; there is no automatic loss of progress.

Existing `completed`, quiz, recognition, playground and guided-solve records survive the update. An old watched lesson remains **explored**, not retrospectively mastered. In **Grown-up corner**, a parent may deliberately **Open through Intermediate / Advanced / Speed Solver** to choose an appropriate starting point. This opens all practice lessons through that stage without awarding badges for mastery or graduation. These controls use explicit acknowledgements, not a PIN or parental authentication system.

**Piece Partners** includes the six direct-cross/F2L lessons and two last-layer foundations. Expand the six-face illustrations and follow outlined pieces. Cross/F2L pattern cases and reviews open alongside their matching lessons; linked demonstrations and Together Time obey the same lesson gates.

**Clever Solutions** adds efficient pair insertion and T/Y PLL workshops. **Smooth Moves** introduces inspection, comfortable turning and lookahead, including a verified two-pair example. The real-cube milestone evaluates a thoughtful practice session, never a required time. The optional **My solve timer** can open earlier, as soon as a grown-up confirms the first independent solve. Timing is self-confirmed; the camera does not judge it. Leaving a running timer stops it for review without saving an unconfirmed result.

The beginner teaching planner handles a full scanned state through daisy → matched white cross → white corners → middle edges → yellow cross → corner homes → corner orientation → final edges. It skips work already complete, lifts trapped pieces, and verifies every milestone and the full solution. Its deliberate beginner patterns can use substantially more moves than the general solver. Standalone lessons are prepared examples; read their setup instructions before applying a sequence to a physical cube. The intermediate/advanced material remains an introductory selection, not an exhaustive F2L or two-look/full PLL/OLL library. Graduations rely on the parent’s observed physical skills as well as in-app checks. Unfinished lessons and guided solves keep separate saved places across launches; see Pause, resume, and backups below.

## Scan a real cube

Use a standard 3×3 color arrangement: **yellow on top, green in front, orange on the right**, white on the bottom, red on the left, and blue on the back. Lighting calibration learns these six named colors; it does not remap a different center arrangement.

1. Choose **Use my camera** and allow camera access when macOS asks. You can always paint the colors manually instead.
2. Start by fitting one whole face inside the dashed square in bright, even light. Keep the face toward the camera and fingers behind the edges. The guide can find the nine-square grid even when the outer-edge detector misses it. A solid outline then follows the face; small hand movements and moderate tilt are okay.
3. For the four side faces, keep the yellow center at the top. For the yellow face, keep the blue center toward the top of the image. For the white face, keep the green center toward the top of the image.
4. Hold still for about a second. Automatic capture suggests colors when six recent frames provide consistent evidence. A single brief detection miss preserves the hold progress but disables capture until a fresh verified view returns. Repeated misses or a sudden large movement start the hold again. Inspect every square, fix any suggestion with the palette, and choose **Colors look right**. As soon as a real face has an outline, choose **Use this picture** to review a single clear view. This works even while automatic capture is still checking several frames. Unclear stickers stay as question marks; paint those squares, check all nine colors and the face orientation, then confirm. **Use a new picture** deliberately replaces the current suggestions; ongoing video cannot overwrite your corrections.
5. Check all six faces. Choose **Teach me to solve** for beginner layers and explanations, or select **Just show the moves** and then **Show me the moves** for the general solution. The general solver’s first run builds lookup tables and can take several seconds.
6. Hold yellow up and green toward you. In teaching mode, make the shown turn on your real cube, then choose **I made this turn**. Complete each short sequence. At a milestone, compare the described pieces and optionally use the camera check, then choose **This matches my cube**. Clockwise always means looking straight at the face being turned.
7. During corner orientation, finish every four-move group and every indicated top turn: the lower layers recover at the end. At completion, check all six faces before celebrating. This records guided practice; it does not unlock lesson mastery, graduation, or the independent-solve timer.

For difficult colors, open **Match my cube’s colors**. Automatic capture pauses. Choose each face tab, show the matching center, hold still, and select **Teach [color] from the center**. The center can be taught after two agreeing pictures; all six learned colors are needed to enable the calibrated classifier. Close the panel to resume captures. Each learned color is saved on this Mac and restored after quitting. Partial calibration is kept too, so you can finish teaching later. Re-teach after changing cubes, cameras, or lighting; use Reset learned colors in the scanner or Settings → Learning & camera → Forget learned colors.

Apple Vision detects rectangles, and a geometric detector checks the internal 3×3 seams or fits a lattice of sticker rectangles. Version 0.9.1 added rectangle tracking between frames and bounded guide-based grid detection when the outer edge is missed. Version 0.9.2 lets a detected face produce a reviewed suggestion without waiting for all nine colors to agree across six frames. Every tracked or guided frame must independently pass the physical-grid checks and resample its colors; tracking never reuses an earlier face’s colors. Core Image straightens the detected face before sampling. Automatic capture requires a stable outline and agreement across recent frames. Explicit picture review keeps dark, uneven, glared, or ambiguous colors as question marks for correction. Plain rectangles and heavily covered faces are rejected in the generated-image tests. This is classical computer vision, with no custom trained cube model. Strong tilt, tiny cubes, reflective finishes, busy backgrounds, and unfamiliar lighting can still defeat it. Manual entry is always available, and real-world accuracy has not yet been measured across physical cubes.

Invalid color counts, duplicates, flipped edges, twisted corners, and impossible permutation parity are rejected before solving. A detected center mismatch is called out. No camera frame is saved to disk or sent anywhere.

**The app checks snapshots; it does not continuously track your hands.** After making the displayed move and tapping **Next move**, choose **Check my last move**. The checker stays tied to that completed step and pauses the guide.

- Show the suggested face and hold still for automatic capture, choose **Use this picture** as soon as an outline appears, or enter the colors manually.
- Correct every suggestion, then choose **Compare reviewed colors**. Dark, uneven, or borderline color patches stay unknown until corrected.
- A view that fits several turns asks for another side. A partial match explicitly leaves hidden faces unchecked. Only six reviewed matching faces confirm the full state.
- A likely missed or mistaken single turn offers conditional repair instructions. After trying them, choose **I tried the repair** to discard old observations and check fresh views.
- If no single-turn explanation fits, review orientation/colors or start a fresh six-face scan. The checker never silently changes the solution or advances the step.

Keep the cube’s sticker arrangement unchanged while capturing several faces; reorient the whole cube to show each side. These checks assume the previous guided state was correct. Color recognition can be mistaken, and manual review remains necessary. Camera images are never saved. The camera stops when its review closes, and both scanning and move-check screens have an explicit camera-off control.

## Teaching versus solving

The learning path uses deliberately prepared cases. Completing an example teaches that pattern; it does not mean the same algorithm solves every scrambled state. The **When do I use this?** panel explains setup and orientation.

The scan solver uses Kociemba’s two-phase algorithm through cube.js. It finds a practical sequence for the exact state, rather than generating a beginner layer-by-layer explanation. The guided solve and the teaching lessons are clearly labeled in the app. Every proposed solution is applied to a clone and checked before it is shown.

## Tests

```sh
./scripts/test.sh
```

GitHub Actions runs the same script and a full app build on every push to `main` and every pull request ([workflow](.github/workflows/test.yml)).

Uses Apple’s JavaScriptCore plus native Vision/Core Image, with no additional package installation. Native image tests require access to macOS graphics services; a restricted headless sandbox can return empty image buffers. The suite also opens a temporary WebKit window with generated frames to measure preview throughput under slow detection; it does not open the camera or use learner data. The suite checks:

- All 18 rendered move permutations against the cubie model (972 sticker checks).
- Algorithm inverse setups, quiz data, daisy petals, Sune orientation, and middle-layer insertion setup.
- Illegal scan states including flipped edges, twisted corners, and odd parity.
- Basic color classification and stored-progress sanitization.
- HTML escaping: `html`, `escapeHTML` and `raw` escape markup characters, attribute quotes, nested fragments and arrays.
- Slice (M, E, S), wide (r and the other lowercase turns) and whole-cube (x, y, z) animation against the cube model, from a scrambled start; spoken wording for every move.
- Block Builders: each lesson's setup, piece positions and descriptions; both blocks stay intact through the right-block, corner and edge steps; the corner swap keeps yellow up and reduces a diagonal case to a matching-side case; the branch's gates, grants, suggestions and graduation.
- Every button route in the interface: navigation, playground, lesson controls, pattern practice, Case Detective, Together Time and scan review, each driven through the page's click handling.
- Appearance defaults and live system changes, larger text, reduced-motion turns, saved camera preferences, legacy progress migration, separate reset scopes, cancellation, preference preservation, and reset persistence failure recovery.
- Native wordmark navigation and modal protection, toolbar and original-sidebar navigation, lesson subtitles, sidebar hide/show, matching theme colors, larger-text layouts, scan/reset modal guards, rejected toolbar navigation during turns, progression gates, and timer behavior when leaving through native navigation.
- Twenty deterministic 25-move scrambles through the general solver; 120 more through the beginner planner, with exact chunk states and all eight milestone objectives checked.
- All 27 legal top-corner twist patterns, all 24 top-corner permutations, and all 12 even final-edge permutations through the beginner planner.
- The native teaching UI from a six-face sample through review pauses, undo/redo, optional camera checks, explicit final confirmation, cancellation and both solver modes. New daisy lessons use their actual learning goal rather than requiring a fully solved cube.
- Every requested move against no turn and all 18 possible single turns, with exact-state repair verification.
- Partial/ambiguous observations, unknown stickers, wrong centers, multi-turn divergence, and adaptive face selection.
- Seven legal challenge cases, complete shared-round state transitions, uncertain camera patches, and migration of existing saved progress.
- Native detection of generated flat, tilted, off-center, and solved-color faces; perspective-corrected sampling; independent preview row-order checks; and rejection of blank, tiny, clipped, and heavily occluded faces.
- Color calibration, exposure variation, glare, temporal agreement, gentle hand drift, short detection misses, repeated loss, interruptions, and wrong centers.
- Guide recovery with the outer detector deliberately disabled, tracking through moving frames, fresh color sampling after a face changes, tracking resets, wide-camera guide geometry, and rejection of blank surfaces, stripes, and occlusion.
- Next-step lesson preconditions, matching-pair geometry, highlighted-piece tracking after every move, restoration of the cross and finished slots, recognition-case setups, review priority, and saved-progress migration.
- Cube Quest: legacy migration, stage and lesson prerequisites, assisted versus independent attempts, graduation reachability, parent grants, saved times, last-layer preconditions and two-pair drill geometry.
- An isolated native WebKit test runs all 27 lessons and four graduations through the actual interface, including mistakes, retries, bypass prevention, physical-milestone confirmation, persistence, timer review/discard, and minimum-window layout.
- Camera bridge integration: one-shot automatic capture, review locks, stale and out-of-order preview/analysis packets, calibration, and pending-solve protection.
- Independent preview/detection queues, bounded delivery until WebKit finishes decoding, stop/restart isolation, and preview throughput with deliberately slow analysis.

See [verification notes](docs/VERIFICATION.md) for the native UI checks and remaining hardware testing.

## Project structure

```text
Sources/CubeClub/App.swift                 AppKit window, camera, speech, persistence, solver bridge
Sources/CubeClub/CameraFramePipeline.swift  Independent preview and detection, bounded WebKit delivery
Sources/CubeClub/CubeSolver.swift          Shared background JavaScriptCore service for both solve modes
Sources/CubeClub/CubeVision.swift          Apple Vision proposals, sticker geometry, correction and sampling
Sources/CubeClub/Resources/Web/            Entirely local WebKit teaching interface
  app.js                                  Shared state, native bridge, navigation, dialogs and button routing
  home-ui.js                              Clubhouse welcome, mascot and discoveries page
  lesson-ui.js                            Guided lessons and solves, recall checks and concept questions
  play-ui.js                              Practice playground
  scan-ui.js                              Six-face review, manual painting and solver requests
  core.js                                 Beginner curriculum, scan validation, colors, solver guard and safe HTML helpers
  next-core.js                            Cross/F2L curriculum, piece tracking, practice and review state
  next-ui.js                              Diagrams and cross/F2L pattern practice
  quest-lessons.js                         Additional last-layer and speed workshops
  roux-lessons.js                          Block Builders: the optional Roux branch
  quest-core.js                            Mastery, progression, graduation and timing state
  quest-ui.js                              Adventure map, parent checkpoints and solve timer
  coach-core.js                           Observation matching, challenge cases, shared-round state
  coach-ui.js                             Move checks, Case Detective, and Together Time
  vision-core.js                          Color calibration and temporal camera evidence
  camera-ui.js                            Shared detection overlay, capture and color teaching
  cube-view.js                            3D projection and animated layer turns
  vendor/                                 Pinned cube.js 1.3.2 sources and MIT license
scripts/                                  Build, icon generation, and test entry points
Tests/                                    Model, rendering-geometry, and solver checks
docs/                                     Design direction, next features, verification notes
```

Native AVFoundation camera access never requests microphone access. AVSpeechSynthesizer reads the instructions. UserDefaults stores lesson progress, preferences, saved sessions, calibration samples, and the most recent pre-restore recovery copy. Native Save/Open panels export and import bounded JSON backup files. A serial JavaScriptCore queue runs the solver away from the UI. The teaching interface is local HTML/CSS/Canvas in WKWebView; it makes no network requests. Navigation is restricted to bundled files and native bridge messages to the main bundled frame.

For layout work only, serve the `Web` folder with a local server. Browser preview supports the learning interface, local progress, and a worker-based solver. Camera scanning is implemented in the native Mac app.

## References and credits

- Original illustration, visual design, curriculum wording, and app code created for this project.
- [Rubik’s solution guides](https://www.rubiks.com/solution-guides) provided a reference for the beginner layer sequence; lesson wording and planner are original.
- [CubeSkills F2L](https://www.cubeskills.com/tutorials/f2l) and [Optimising the Beginner’s Method](https://www.cubeskills.com/tutorials/optimising-the-beginners-method) informed the progression into direct cross planning and corner-edge pairs. The app’s explanations, diagrams, and practice cases are original; every taught setup is checked against the cube model.
- [CubeSkills four-look last layer](https://www.cubeskills.com/tutorials/4-look-last-layer), [PLL algorithms](https://www.cubeskills.com/uploads/pdf/tutorials/pll-algorithms.pdf), and [lookahead progression](https://cubeskills.com/blog/lookahead-progression-framework) informed the additional topics. Explanations and generated cube diagrams are original; algorithms are checked against the local cubie model.
- The Block Builders branch teaches the Roux method, published by Gilles Roux in 2003. Philo Li’s article [“How to Solve a Rubik’s Cube in 30 Seconds Without Memorizing”](https://medium.com/@philo2018/how-to-solve-a-rubiks-cube-in-30-seconds-without-memorizing-even-a-child-can-understand-828b73525a7b) prompted it, including the arrow idea for flipping edges. Lessons, cases and explanations are original and checked against the local cubie model.
- [Official Rubik’s solution guides](https://www.rubiks.com/solution-guides) informed the beginner stage structure. No branded images or tutorial text were copied.
- [cube.js by Petri Lehtinen and Ludovic Fernandez](https://github.com/ldez/cubejs/tree/v1.3.2), pinned to **v1.3.2**, provides the cubie model and two-phase solver. Its [MIT license](Sources/CubeClub/Resources/Web/vendor/LICENSE.cubejs) is included in source and bundled with the app.
- Independent project; not affiliated with or endorsed by Rubik’s.
