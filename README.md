# Cube Club

A gentle, playful Rubik’s Cube workshop for a curious eight-year-old. A native macOS app with an illustrated clubhouse, a real interactive 3D cube, short algorithm lessons, and a camera-assisted guide for the cube in your hands.

## Open the app

Open **`build/Cube Club.app`** in Finder. The supplied local build is for Apple silicon and requires macOS 13 or later. It is locally signed for development, not notarized for public distribution.

To build from source, install Xcode or Apple’s Swift command line tools, then run:

```sh
./scripts/build.sh
open "build/Cube Club.app"
```

You can also open `Package.swift` in Xcode. Use the packaged `.app` when testing the camera: it contains the camera permission description and a stable app identity. Version 0.3 adds on-device cube-face detection, perspective correction, steady automatic capture, and optional color calibration to both scanning and move checks. No npm install, remote service, API key, or account is needed. Building on an Intel Mac produces an Intel build.

## What’s here

- **My clubhouse:** an original illustrated cube character, a friendly starting point, and saved learning progress.
- **Nine short missions:** cube notation, daisy-to-cross, right- and left-hand patterns, middle edge insertion, yellow cross, Sune, corner cycling, and a final edge cycle.
- **An actual cube model:** drag to orbit; turn any face; watch the layer rotate; undo; scramble; return to a fresh cube. The animation geometry is tested against the solver’s permutation model for all 18 moves.
- **Learn, then recall:** step through a pattern, watch a slow replay, try the next move from memory, request a hint, and answer a short discovery question. Every algorithm includes its use case and an explanation.
- **Solve my cube:** six-face camera capture, suggested colors, manual painting and rotation, full physical-state validation, and a verified move-by-move solution.
- **Cube vision:** a live outline follows detected 3×3 faces. Tilt is corrected before sampling, several frames must agree, and capture pauses for review. Optional six-center color teaching adapts the classifier to the current cube and room lighting.
- **Check my move:** optional snapshot checks after a guided turn. Review one or more faces; the app distinguishes ambiguous views, partial matches, full six-face matches, and common single-turn mistakes. Conditional repair instructions help undo an identified mistake.
- **Case detective:** seven visual challenges using real cube states, highlighted stickers, hints, accessible color descriptions, and explanations for yellow shapes, edge slots, and a corner’s home.
- **Together time:** parent-and-child rounds with alternating caller/turner roles, a reveal/predict/turn/discuss flow, gentle wrong-move feedback, and shared discoveries.
- **Grown-up corner:** read-aloud instructions, slower motion, face labels, and learning-progress reset. System reduced-motion preferences are respected.
- **Discovery badges:** effort and learning count. There are no racing timers, leaderboards, accounts, advertising, or streak penalties.

## Try it in two minutes

1. Open **Start my adventure** and use **Next move**. Watch four right turns restore the cube.
2. Open **The right-hand move**. Try **Watch the full pattern**, then **Try from memory**.
3. Open **Practice playground**. Make a turn and undo it. Drag the cube to see its hidden faces.
4. Open **Solve my cube → Try a sample cube → Show me the steps** to exercise the complete solver without a camera.

## Scan a real cube

Use a standard 3×3 color arrangement: **yellow on top, green in front, orange on the right**, white on the bottom, red on the left, and blue on the back. Lighting calibration learns these six named colors; it does not remap a different center arrangement.

1. Choose **Use my camera** and allow camera access when macOS asks. You can always paint the colors manually instead.
2. Show one whole face in bright, even light, with all four corners visible and fingers off the stickers. A glowing outline follows the detected face. Moderate tilt is corrected automatically; the face does not need to sit in a fixed guide.
3. For the four side faces, keep the yellow center at the top. For the yellow face, keep the blue center toward the top of the image. For the white face, keep the green center toward the top of the image.
4. Hold still for about a second. Automatic capture suggests colors when six recent frames provide consistent evidence. Inspect every square, fix any suggestion with the palette, and choose **Colors look right**. You can turn automatic capture off and use **Read this face** instead. **Read face again** explicitly replaces a previous capture; ongoing video cannot overwrite manual corrections.
5. Check all six faces and choose **Show me the steps**. The first solve builds lookup tables and can take several seconds.
6. Hold yellow up and green toward you. Make the shown turn on your real cube, then advance the guide. Clockwise always means looking straight at the face being turned.

For difficult colors, open **Match my cube’s colors**. Automatic capture pauses. Choose each face tab, show the matching center, hold still, and select **Teach [color] from the center**. All six learned colors are needed to enable the calibrated classifier. Close the panel to resume captures. Calibration stays in memory until the app quits; reset and re-teach after changing cubes or lighting.

Apple Vision detects rectangles, and a geometric detector checks the internal 3×3 seams or fits a lattice of sticker rectangles. Core Image straightens the detected face before sampling. The app requires a stable outline and agreement across recent frames; dark, uneven, glared, or ambiguous colors block capture. Plain rectangles and heavily covered faces are rejected in the generated-image tests. This is classical computer vision, with no custom trained cube model. Strong tilt, tiny cubes, reflective finishes, busy backgrounds, and unfamiliar lighting can still defeat it. Manual entry is always available, and real-world accuracy has not yet been measured across physical cubes.

Invalid color counts, duplicates, flipped edges, twisted corners, and impossible permutation parity are rejected before solving. A detected center mismatch is called out. No camera frame is saved to disk or sent anywhere.

**The app checks snapshots; it does not continuously track your hands.** After making the displayed move and tapping **Next move**, choose **Check my last move**. The checker stays tied to that completed step and pauses the guide.

- Show the suggested face and hold still for automatic capture, choose **Read this face** with automatic capture off, or enter the colors manually.
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

Uses Apple’s JavaScriptCore plus native Vision/Core Image, with no additional package installation. Native image tests require access to macOS graphics services; a restricted headless sandbox can return empty image buffers. The suite checks:

- All 18 rendered move permutations against the cubie model (972 sticker checks).
- Algorithm inverse setups, quiz data, daisy petals, Sune orientation, and middle-layer insertion setup.
- Illegal scan states including flipped edges, twisted corners, and odd parity.
- Basic color classification and stored-progress sanitization.
- Twenty deterministic 25-move scrambles, each solved and verified end-to-end.
- Every requested move against no turn and all 18 possible single turns, with exact-state repair verification.
- Partial/ambiguous observations, unknown stickers, wrong centers, multi-turn divergence, and adaptive face selection.
- Seven legal challenge cases, complete shared-round state transitions, uncertain camera patches, and migration of existing saved progress.
- Native detection of generated flat, tilted, off-center, and solved-color faces; perspective-corrected sampling; independent preview row-order checks; and rejection of blank, tiny, clipped, and heavily occluded faces.
- Color calibration, exposure variation, glare, temporal agreement, movement, interruptions, and wrong centers.
- Camera bridge integration: one-shot automatic capture, review locks, stale and out-of-order frames, calibration, and pending-solve protection.

See [verification notes](docs/VERIFICATION.md) for the native UI checks and remaining hardware testing.

## Project structure

```text
Sources/CubeClub/App.swift                 AppKit window, camera, speech, persistence, solver bridge
Sources/CubeClub/CubeVision.swift          Apple Vision proposals, sticker geometry, correction and sampling
Sources/CubeClub/Resources/Web/            Entirely local WebKit teaching interface
  app.js                                  Lessons, practice, scanning and interaction state
  core.js                                 Curriculum, scan validation, colors and solver guard
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

Native AVFoundation camera access never requests microphone access. AVSpeechSynthesizer reads the instructions. UserDefaults stores lesson progress and preferences. A serial JavaScriptCore queue runs the solver away from the UI. The teaching interface is local HTML/CSS/Canvas in WKWebView; it makes no network requests. Navigation is restricted to bundled files and native bridge messages to the main bundled frame.

For layout work only, serve the `Web` folder with a local server. Browser preview supports the learning interface, local progress, and a worker-based solver. Camera scanning is implemented in the native Mac app.

## References and credits

- Original illustration, visual design, curriculum wording, and app code created for this project.
- [Official Rubik’s solution guides](https://www.rubiks.com/solution-guides) informed the beginner stage structure. No branded images or tutorial text were copied.
- [cube.js by Petri Lehtinen and Ludovic Fernandez](https://github.com/ldez/cubejs/tree/v1.3.2), pinned to **v1.3.2**, provides the cubie model and two-phase solver. Its [MIT license](Sources/CubeClub/Resources/Web/vendor/LICENSE.cubejs) is included in source and bundled with the app.
- Independent project; not affiliated with or endorsed by Rubik’s.
