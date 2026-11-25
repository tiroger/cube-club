#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
swift build -c release --cache-path "${TMPDIR:-/tmp}/cube-club-swift-cache" --disable-sandbox
BIN=$(swift build -c release --show-bin-path)
APP="$PWD/build/Cube Club.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN/CubeClub" "$APP/Contents/MacOS/CubeClub"
cp -R "$BIN/CubeClub_CubeClub.bundle" "$APP/Contents/Resources/"
cp scripts/Info.plist "$APP/Contents/Info.plist"
if [ -f assets/AppIcon.icns ]; then cp assets/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"; fi
codesign --force --deep --sign - --entitlements scripts/CubeClub.entitlements "$APP"
codesign -d --entitlements - "$APP" 2>/dev/null | grep -q com.apple.security.cs.allow-jit || { echo "The app is missing its JIT entitlement" >&2; exit 1; }
printf '\nBuilt %s\n' "$APP"
