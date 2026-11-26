#!/bin/bash
# Signs Cube Club.app. Both build.sh and the DMG packager use this.
#
#   ./scripts/sign-app.sh <app>
#
# CUBE_CLUB_SIGN_IDENTITY picks the certificate. Unset (or "-") means an ad hoc
# development signature. A "Developer ID Application: …" identity signs for
# notarization: hardened runtime, secure timestamps, and Sparkle's helpers
# re-signed with the same certificate, inside out.
set -euo pipefail
app=${1:?Usage: sign-app.sh <app>}
root="$(cd "$(dirname "$0")/.." && pwd)"
entitlements="$root/scripts/CubeClub.entitlements"
identity=${CUBE_CLUB_SIGN_IDENTITY:--}
sparkle="$app/Contents/Frameworks/Sparkle.framework"

if [[ "$identity" == "-" ]]; then
  # Sparkle keeps its own signature. Not --deep: that would give Sparkle's
  # helpers the app's entitlements.
  codesign --force --sign - --entitlements "$entitlements" "$app"
else
  sign() { codesign --force --timestamp --options runtime --sign "$identity" "$@"; }
  if [[ -d "$sparkle" ]]; then
    sign "$sparkle/Versions/B/XPCServices/Installer.xpc"
    sign --preserve-metadata=entitlements "$sparkle/Versions/B/XPCServices/Downloader.xpc"
    sign "$sparkle/Versions/B/Autoupdate"
    sign "$sparkle/Versions/B/Updater.app"
    sign "$sparkle"
  fi
  sign --entitlements "$entitlements" "$app"
fi

codesign --verify --deep --strict "$app"
granted=$(codesign -d --entitlements - "$app" 2>/dev/null)
for key in com.apple.security.cs.allow-jit com.apple.security.device.camera; do
  grep -q "$key" <<<"$granted" || { echo "The app is missing the $key entitlement." >&2; exit 1; }
done
