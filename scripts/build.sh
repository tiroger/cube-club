#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
swift build -c release --cache-path "${TMPDIR:-/tmp}/cube-club-swift-cache" --disable-sandbox
BIN=$(swift build -c release --show-bin-path)
APP="$PWD/build/Cube Club.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$APP/Contents/Frameworks"
cp "$BIN/CubeClub" "$APP/Contents/MacOS/CubeClub"
cp -R "$BIN/CubeClub_CubeClub.bundle" "$APP/Contents/Resources/"
# ditto preserves the framework's symlinks.
rm -rf "$APP/Contents/Frameworks/Sparkle.framework"
ditto "$BIN/Sparkle.framework" "$APP/Contents/Frameworks/Sparkle.framework"
cp scripts/Info.plist "$APP/Contents/Info.plist"
if [ -f assets/AppIcon.icns ]; then cp assets/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"; fi
# Ad hoc by default; set CUBE_CLUB_SIGN_IDENTITY to sign with a Developer ID.
./scripts/sign-app.sh "$APP"
printf '\nBuilt %s\n' "$APP"
