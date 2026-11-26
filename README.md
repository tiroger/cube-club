# Cube Club

A gentle, playful Rubik’s Cube workshop for a curious eight-year-old: a native macOS app with an illustrated clubhouse, an interactive 3D cube, short lessons, and a camera guide for the cube in your hands.

## Install

Download the latest DMG from [GitHub Releases](https://github.com/tiroger/cube-club/releases/latest) and drag **Cube Club** to **Applications**. It needs an Apple silicon Mac with macOS 13 or later. Releases after 0.11.0 are notarized by Apple, and installed copies update themselves.

Releases up to 0.11.0 aren't notarized. The first time you open one, choose **Open Anyway** in **System Settings → Privacy & Security**. Copies of 0.10.0 or earlier don't update themselves and need one manual install of a newer release.

## What’s inside

- **Cube Quest:** 35 lessons in four stages, from First Solve to Speed Solver, plus **Block Builders**, an optional Roux branch. Each lesson goes learn → practice → explain → check, and a grown-up confirms each stage’s physical-cube milestone.
- **Practice playground:** a 3D cube you can orbit, turn, scramble and undo.
- **Solve my cube:** scan all six faces with the camera or paint them by hand. Then follow a beginner layer-by-layer plan, or just the moves.
- **Check my move:** optional camera snapshots after a guided turn catch common mistakes.
- **Pattern practice, Case detective, Together time:** recognition drills, visual puzzles, and parent-and-child rounds.
- **Solve timer:** optional; it opens after a first independent solve.
- **Grown-up corner:** appearance, larger text, reduced motion, read-aloud, milestones, stage overrides, resets, backups and updates.

There are no accounts, ads, leaderboards or streaks. Progress stays on this Mac.

## Using it

- **Scanning:** hold the cube with yellow on top and green in front. Fill the dashed square with one face in good light, hold still, then review every color before confirming. Manual painting always works. Camera pictures are never saved.
- **Breaks:** lessons and guided solves save after every turn. The clubhouse shows a **Continue** card for each.
- **Backups:** **Settings → Progress → Save a backup…** writes a JSON file; **Restore a backup…** brings it back.
- **Shortcuts:** ⌘1–8 open the main sections, ⌘, opens settings, ⌃⌘S toggles the sidebar, and ⌘[ goes up a level.

## Updates

[Sparkle](https://sparkle-project.org) checks the latest GitHub release once a day. A new version downloads quietly and installs the next time Cube Club quits.
- **Parent control:** **Grown-up corner → Progress → Stay up to date** turns updates off or checks now.
- **Privacy:** GitHub sees the Mac’s IP address; nothing else is sent.

Sparkle installs only DMGs signed with the project’s EdDSA key. Its public half is `SUPublicEDKey` in `scripts/Info.plist`. The private half is in the release Mac’s keychain (account `cube-club`) and in the `SPARKLE_PRIVATE_KEY` secret. If both copies are lost, installed apps can’t update until they’re reinstalled by hand.

## Development

```sh
./scripts/build.sh            # build/Cube Club.app
./scripts/test.sh             # full test suite
./scripts/build-dmg.sh        # dist/Cube-Club-<version>-<arch>.dmg (needs Python 3.11+)
```

- **Requirements:** the Swift command line tools or Xcode. Swift Package Manager fetches Sparkle on the first build.
- **Signing:** builds are ad hoc signed unless `CUBE_CLUB_SIGN_IDENTITY` names a Developer ID certificate.
- **Testing the camera, updates and solver speed:** use the packaged app.
- **CI:** GitHub Actions runs the tests and an app build on every pull request.

### Releasing

1. Bump `CFBundleShortVersionString` and `CFBundleVersion` in `scripts/Info.plist`, `appVersion` in `continuity-core.js`, and the settings footer in `settings-ui.js`.
2. Add a `## Version X.Y.Z` section to `docs/VERIFICATION.md`. It becomes the release notes.
3. Merge to `main`, then tag: `git tag -a vX.Y.Z -m "Cube Club X.Y.Z" && git push origin vX.Y.Z`.
4. Approve the run: on its page, **Review deployments → release → Approve and deploy**.

The [release workflow](.github/workflows/release.yml) runs the tests and signs the app with the Developer ID certificate of team `GLG686ZJ9Q`. It then notarizes the DMG and publishes it with `appcast.xml`. The secrets live in the `release` environment, which only `v*` tags can use; pull requests and branches build unsigned.

`main` accepts changes only through pull requests that pass the tests. Only admins can create `v*` tags, and they can't be moved or deleted. The secrets:

| Secret | Holds |
|---|---|
| `DEVELOPER_ID_CERTIFICATE`, `DEVELOPER_ID_CERTIFICATE_PASSWORD` | The Developer ID identity (base64 `.p12`) and its password |
| `APP_STORE_CONNECT_KEY`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID` | The notarization API key |
| `SPARKLE_PRIVATE_KEY` | The update-signing key |

To notarize on a Mac instead, save the API key once with `xcrun notarytool store-credentials cube-club --key <AuthKey.p8> --key-id <id> --issuer <issuer>`, then:

```sh
CUBE_CLUB_SIGN_IDENTITY="Developer ID Application: Roger Lefort (GLG686ZJ9Q)" ./scripts/build-dmg.sh
./scripts/notarize.sh dist/Cube-Club-<version>-arm64.dmg
```

### Layout

```text
Sources/CubeClub/                 AppKit shell, camera, vision, solver, storage, updates (Swift)
Sources/CubeClub/Resources/Web/   The teaching interface: lessons, quest, scanning, settings (HTML/JS)
Tests/                            Model, vision, and WebKit interface tests
scripts/                          Build, test, signing, notarization, DMG and appcast scripts
docs/                             Design notes and per-release verification
```

[docs/DESIGN.md](docs/DESIGN.md) explains the teaching approach. [docs/VERIFICATION.md](docs/VERIFICATION.md) records what each release was tested against.

## Credits

- Illustration, curriculum wording and code are original to this project.
- The beginner sequence was informed by [Rubik’s solution guides](https://www.rubiks.com/solution-guides). F2L, last layer and lookahead were informed by [CubeSkills](https://www.cubeskills.com). Block Builders teaches Gilles Roux’s method; Philo Li’s [article](https://medium.com/@philo2018/how-to-solve-a-rubiks-cube-in-30-seconds-without-memorizing-even-a-child-can-understand-828b73525a7b) prompted it. Every taught algorithm is checked against the cube model.
- [cube.js](https://github.com/ldez/cubejs/tree/v1.3.2) 1.3.2 provides the cube model and two-phase solver ([MIT](Sources/CubeClub/Resources/Web/vendor/LICENSE.cubejs)). [Sparkle](https://github.com/sparkle-project/Sparkle) 2.10.1 installs updates (MIT).
- Cube Club is an independent project, not affiliated with or endorsed by Rubik’s.
