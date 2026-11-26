#!/bin/bash
# Notarizes a Developer ID signed DMG, staples the ticket, and rewrites its checksum.
#
#   ./scripts/notarize.sh <dmg>
#
# Credentials, in order of preference:
#   APP_STORE_CONNECT_KEY_ID, APP_STORE_CONNECT_ISSUER_ID and APP_STORE_CONNECT_KEY_FILE
#     (an App Store Connect API key; the release workflow sets these), or
#   the notarytool keychain profile "cube-club", saved once on a Mac with:
#     xcrun notarytool store-credentials cube-club --key <AuthKey.p8> --key-id <id> --issuer <issuer>
set -euo pipefail
dmg=${1:?Usage: notarize.sh <dmg>}
[[ -f "$dmg" ]] || { echo "No such DMG: $dmg" >&2; exit 1; }
codesign -dv "$dmg" 2>&1 | grep -q "Authority=Developer ID Application" || { echo "$dmg is not Developer ID signed." >&2; exit 1; }

if [[ -n "${APP_STORE_CONNECT_KEY_ID:-}" ]]; then
  credentials=(--key "${APP_STORE_CONNECT_KEY_FILE:?}" --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "${APP_STORE_CONNECT_ISSUER_ID:?}")
else
  credentials=(--keychain-profile cube-club)
fi

echo "Submitting $(basename "$dmg") to Apple's notary service…"
result=$(xcrun notarytool submit "$dmg" "${credentials[@]}" --wait --timeout 30m --output-format json)
status=$(plutil -extract status raw - <<<"$result" 2>/dev/null || echo unknown)
id=$(plutil -extract id raw - <<<"$result" 2>/dev/null || echo "")
if [[ "$status" != Accepted ]]; then
  echo "Notarization finished with status: $status" >&2
  [[ -n "$id" ]] && xcrun notarytool log "$id" "${credentials[@]}" >&2 || true
  exit 1
fi
echo "Accepted (submission $id)."

xcrun stapler staple "$dmg"
xcrun stapler validate "$dmg"
spctl --assess --type open --context context:primary-signature -vv "$dmg" 2>&1 | tee /dev/stderr | grep -q "source=Notarized Developer ID" \
  || { echo "Gatekeeper does not accept $dmg as notarized." >&2; exit 1; }

# Stapling changes the file, so the checksum is written afterwards.
( cd "$(dirname "$dmg")" && shasum -a 256 "$(basename "$dmg")" > "$(basename "$dmg").sha256" )
echo "Notarized and stapled: $dmg"
cat "$dmg.sha256"
