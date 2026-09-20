# Cube Club

A gentle, playful Rubik’s Cube workshop for a curious eight-year-old. A native macOS app with an illustrated clubhouse, a real interactive 3D cube, short algorithm lessons, and a camera-assisted guide for the cube in your hands.

## Open the app

Open **`build/Cube Club.app`** in Finder. The supplied local build is for Apple silicon and requires macOS 13 or later. It is locally signed for development, not notarized for public distribution.

To build from source, install Xcode or Apple’s Swift command line tools, then run:

```sh
./scripts/build.sh
open "build/Cube Club.app"
```

You can also open `Package.swift` in Xcode. Use the packaged `.app` when testing the camera: it contains the camera permission description and a stable app identity. No npm install, remote service, API key, or account is needed. Building on an Intel Mac produces an Intel build.

## What’s here

- **My clubhouse:** an original illustrated cube character, a friendly starting point, and saved learning progress.
- **Nine short missions:** cube notation, daisy-to-cross, right- and left-hand patterns, middle edge insertion, yellow cross, Sune, corner cycling, and a final edge cycle.
- **An actual cube model:** drag to orbit; turn any face; watch the layer rotate; undo; scramble; return to a fresh cube. The animation geometry is tested against the solver’s permutation model for all 18 moves.
- **Learn, then recall:** step through a pattern, watch a slow replay, try the next move from memory, request a hint, and answer a short discovery question. Every algorithm includes its use case and an explanation.
- **Solve my cube:** six-face camera capture, suggested colors, manual painting and rotation, full physical-state validation, and a verified move-by-move solution.
- **Grown-up corner:** read-aloud instructions, slower motion, face labels, and learning-progress reset. System reduced-motion preferences are respected.
- **Discovery badges:** effort and learning count. There are no racing timers, leaderboards, accounts, advertising, or streak penalties.

## Try it in two minutes

1. Open **Start my adventure** and use **Next move**. Watch four right turns restore the cube.
2. Open **The right-hand move**. Try **Watch the full pattern**, then **Try from memory**.
3. Open **Practice playground**. Make a turn and undo it. Drag the cube to see its hidden faces.
4. Open **Solve my cube → Try a sample cube → Show me the steps** to exercise the complete solver without a camera.

## Scan a real cube

Use a standard 3×3 color arrangement: **yellow on top, green in front, orange on the right**, white on the bottom, red on the left, and blue on the back. Other color layouts need calibration support in a future version.

1. Choose **Use my camera** and allow camera access when macOS asks. You can always paint the colors manually instead.
2. Hold the requested face square to the camera in bright, even light; align it with the nine-square guide.
3. For the four side faces, keep the yellow center at the top. For the yellow face, keep the blue center toward the top of the image. For the white face, keep the green center toward the top of the image.
4. Choose **Read these colors**. Inspect every square, fix any suggestion with the palette, and choose **Colors look right**.
5. Check all six faces and choose **Show me the steps**. The first solve builds lookup tables and can take several seconds.
6. Hold yellow up and green toward you. Make the shown turn on your real cube, then advance the guide. Clockwise always means looking straight at the face being turned.

Color recognition is a simple local color classifier, not a trained vision model. Glare, dim light, unusual sticker colors, and a tilted cube can confuse it. Corrections are part of the scan flow. Invalid color counts, duplicates, flipped edges, twisted corners, and impossible permutation parity are rejected before solving. A detected center mismatch is called out. No frame is saved to disk or sent anywhere.

**The app does not continuously verify your physical moves.** If your real cube stops matching, undo the last turn or scan it again. The app stops the camera when the scan closes.

## Teaching versus solving

The learning path uses deliberately prepared cases. Completing an example teaches that pattern; it does not mean the same algorithm solves every scrambled state. The **When do I use this?** panel explains setup and orientation.

The scan solver uses Kociemba’s two-phase algorithm through cube.js. It finds a practical sequence for the exact state, rather than generating a beginner layer-by-layer explanation. The guided solve and the teaching lessons are clearly labeled in the app. Every proposed solution is applied to a clone and checked before it is shown.

## Tests

```sh
./scripts/test.sh
```

Uses Apple’s JavaScriptCore through Swift, with no additional package installation. The suite checks:

- All 18 rendered move permutations against the cubie model (972 sticker checks).
- Algorithm inverse setups, quiz data, daisy petals, Sune orientation, and middle-layer insertion setup.
- Illegal scan states including flipped edges, twisted corners, and odd parity.
- Basic color classification and stored-progress sanitization.
- Twenty deterministic 25-move scrambles, each solved and verified end-to-end.

See [verification notes](docs/VERIFICATION.md) for the native UI checks and remaining hardware testing.

## Project structure

```text
Sources/CubeClub/App.swift                 AppKit window, camera, speech, persistence, solver bridge
Sources/CubeClub/Resources/Web/            Entirely local WebKit teaching interface
  app.js                                  Lessons, practice, scanning and interaction state
  core.js                                 Curriculum, scan validation, colors and solver guard
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
