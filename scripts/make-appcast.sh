#!/bin/bash
# Writes the Sparkle appcast that tells installed copies about one release.
#
#   ./scripts/make-appcast.sh <app> <dmg> <download-url> <output.xml> [private-key-file]
#
# The version, build and minimum macOS come from <app>. The DMG is signed with the
# EdDSA key in [private-key-file], or with the "cube-club" key in the login keychain.
set -euo pipefail
if [[ $# -lt 4 || $# -gt 5 ]]; then
  sed -n 4p "$0" >&2
  exit 1
fi
app=$1 dmg=$2 url=$3 output=$4 key=${5:-}
root="$(cd "$(dirname "$0")/.." && pwd)"
sign_update="$root/.build/artifacts/sparkle/Sparkle/bin/sign_update"
[[ -x "$sign_update" ]] || { echo "sign_update is missing. Run ./scripts/build.sh first." >&2; exit 1; }

plist="$app/Contents/Info.plist"
version=$(plutil -extract CFBundleShortVersionString raw "$plist")
build=$(plutil -extract CFBundleVersion raw "$plist")
minimum=$(plutil -extract LSMinimumSystemVersion raw "$plist")
if [[ -n "$key" ]]; then
  signature=$("$sign_update" --ed-key-file "$key" "$dmg")
else
  signature=$("$sign_update" --account cube-club "$dmg")
fi
# sign_update prints: sparkle:edSignature="…" length="…"
[[ "$signature" =~ ^sparkle:edSignature=\"[A-Za-z0-9+/=]+\"\ length=\"[0-9]+\"$ ]] || { echo "Unexpected sign_update output: $signature" >&2; exit 1; }
hardware=""
if [[ "$(lipo -archs "$app/Contents/MacOS/CubeClub")" == arm64 ]]; then
  hardware="      <sparkle:hardwareRequirements>arm64</sparkle:hardwareRequirements>"
fi

cat > "$output" <<XML
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>Cube Club</title>
    <item>
      <title>Cube Club $version</title>
      <pubDate>$(LC_ALL=C date -u '+%a, %d %b %Y %H:%M:%S +0000')</pubDate>
      <sparkle:version>$build</sparkle:version>
      <sparkle:shortVersionString>$version</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>$minimum</sparkle:minimumSystemVersion>
$hardware
      <enclosure url="$url" type="application/octet-stream" $signature/>
    </item>
  </channel>
</rss>
XML
xmllint --noout "$output"
echo "Wrote $output for Cube Club $version (build $build)"
