#!/bin/bash
# Archives the iPad app and uploads it to TestFlight.
#
#   ./scripts/release-ipad.sh            # archive, sign for App Store distribution, upload
#   ./scripts/release-ipad.sh --export   # same, but save the .ipa locally instead of uploading
#
# Version and build come from scripts/Info.plist, so the iPad build matches the Mac release.
# Needs an App Store Connect API key with the Admin role, which may use Apple's cloud-managed
# distribution certificate: APP_STORE_CONNECT_ADMIN_KEY_FILE, APP_STORE_CONNECT_ADMIN_KEY_ID
# and APP_STORE_CONNECT_ISSUER_ID.
set -euo pipefail
cd "$(dirname "$0")/.."
destination=upload
if [[ "${1:-}" == --export ]]; then destination=export; elif [[ $# -gt 0 ]]; then sed -n 3,4p "$0" >&2; exit 1; fi
if [[ -z "${DEVELOPER_DIR:-}" && "$(xcode-select -p)" != *Xcode*.app* && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
: "${APP_STORE_CONNECT_ADMIN_KEY_FILE:?}" "${APP_STORE_CONNECT_ADMIN_KEY_ID:?}" "${APP_STORE_CONNECT_ISSUER_ID:?}"
auth=(-allowProvisioningUpdates
      -authenticationKeyPath "$APP_STORE_CONNECT_ADMIN_KEY_FILE"
      -authenticationKeyID "$APP_STORE_CONNECT_ADMIN_KEY_ID"
      -authenticationKeyIssuerID "$APP_STORE_CONNECT_ISSUER_ID")

version=$(plutil -extract CFBundleShortVersionString raw scripts/Info.plist)
build=$(plutil -extract CFBundleVersion raw scripts/Info.plist)
out="build/ipad"
rm -rf "$out"
mkdir -p "$out"
echo "Cube Club for iPad $version (build $build), $(xcodebuild -version | head -1)"

# Archive unsigned; the export step signs everything for App Store distribution.
xcodebuild -project ipad/CubeClubPad.xcodeproj -scheme CubeClubPad -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$out/CubeClubPad.xcarchive" archive \
  MARKETING_VERSION="$version" CURRENT_PROJECT_VERSION="$build" \
  CODE_SIGNING_ALLOWED=NO -quiet

cat > "$out/export.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>$destination</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>GLG686ZJ9Q</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
PLIST

xcodebuild -exportArchive -archivePath "$out/CubeClubPad.xcarchive" -exportPath "$out/export" \
  -exportOptionsPlist "$out/export.plist" "${auth[@]}"

if [[ "$destination" == upload ]]; then
  echo "Uploaded Cube Club for iPad $version ($build). It appears in TestFlight once Apple finishes processing."
else
  ipa=$(find "$out/export" -name '*.ipa' | head -1)
  codesign -dvv "$ipa" >/dev/null 2>&1 || true
  echo "Exported $ipa"
fi
