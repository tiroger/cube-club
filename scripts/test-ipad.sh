#!/bin/bash
# Builds the iPad app, runs it on an iPad simulator, and checks it from inside the page
# (Tests/ipad-checks.js). Also builds the release configuration for devices.
#
#   ./scripts/test-ipad.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Command line tools alone can't build for iPad; use Xcode when xcode-select points elsewhere.
if [[ -z "${DEVELOPER_DIR:-}" && "$(xcode-select -p)" != *Xcode*.app* && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
work=$(mktemp -d "${TMPDIR:-/tmp}/cube-club-ipad.XXXXXX")
device=""
cleanup() {
  if [[ -n "$device" ]]; then xcrun simctl terminate "$device" club.cube.ipad >/dev/null 2>&1 || true; fi
  rm -rf "$work"
}
trap cleanup EXIT

# An iPad simulator on the newest installed iOS runtime, created if none exists.
device=$(xcrun simctl list devices available --json | python3 -c '
import json, re, sys
runtimes = json.load(sys.stdin)["devices"]
def version(key):
    return [int(n) for n in re.findall(r"\d+", key.split(".")[-1])]
for key in sorted((k for k in runtimes if ".iOS-" in k), key=version, reverse=True):
    for d in runtimes[key]:
        if d["name"].startswith("iPad") or "iPad" in d["name"]:
            print(d["udid"]); sys.exit()
')
if [[ -z "$device" ]]; then
  runtime=$(xcrun simctl list runtimes available --json | python3 -c 'import json,sys; r=[x for x in json.load(sys.stdin)["runtimes"] if x["platform"]=="iOS"]; print(r[-1]["identifier"] if r else "")')
  type=$(xcrun simctl list devicetypes --json | python3 -c 'import json,sys; t=[x for x in json.load(sys.stdin)["devicetypes"] if x["name"].startswith("iPad Air")]; print(t[-1]["identifier"] if t else "")')
  [[ -n "$runtime" && -n "$type" ]] || { echo "No iPad simulator runtime is installed." >&2; exit 1; }
  device=$(xcrun simctl create "Cube Club iPad" "$type" "$runtime")
fi
echo "Simulator: $(xcrun simctl list devices | grep "$device" | sed 's/^ *//')"

# Boot now so the simulator warms up while the builds run; a cold first boot on a CI runner
# can take minutes.
xcrun simctl boot "$device" 2>/dev/null || true

echo "Building for the simulator…"
xcodebuild -project ipad/CubeClubPad.xcodeproj -scheme CubeClubPad -configuration Debug \
  -destination "id=$device" -derivedDataPath "$work/build" CODE_SIGNING_ALLOWED=NO build -quiet
app=$(find "$work/build/Build/Products" -name CubeClubPad.app -maxdepth 2 | head -1)

echo "Building the release configuration for devices…"
xcodebuild -project ipad/CubeClubPad.xcodeproj -scheme CubeClubPad -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath "$work/release" CODE_SIGNING_ALLOWED=NO build -quiet

xcrun simctl bootstatus "$device" -b >/dev/null
xcrun simctl install "$device" "$app"
# Grant the camera up front so a permission prompt can't stall the run.
xcrun simctl privacy "$device" grant camera club.cube.ipad

# Runs the checks once and prints the app's result line, or nothing if it gave none in time.
run_checks() {
  local log="$work/console-$1.log" launcher result=""
  xcrun simctl launch --console-pty --terminate-running-process "$device" club.cube.ipad \
    --debug-script "$(cat Tests/ipad-checks.js)" >"$log" 2>&1 &
  launcher=$!
  for _ in $(seq 1 300); do
    result=$(tr -d '\r' <"$log" | grep -oE "\[debug\] (PASS|FAIL).*" | head -1 || true)
    [[ -n "$result" ]] && break
    kill -0 "$launcher" 2>/dev/null || break
    sleep 1
  done
  kill "$launcher" 2>/dev/null || true
  echo "$result"
}

diagnose() {
  echo "Is the app running? $(xcrun simctl spawn "$device" launchctl list 2>/dev/null | grep -c club.cube.ipad) matching process(es)." >&2
  local reports
  reports=$(find ~/Library/Logs/DiagnosticReports -name 'CubeClubPad*' -mmin -15 2>/dev/null | head -3)
  if [[ -n "$reports" ]]; then echo "Recent crash reports:" >&2; for r in $reports; do head -40 "$r" >&2; done; fi
  tail -20 "$work"/console-*.log >&2 2>/dev/null || true
}

result=$(run_checks 1)
if [[ -z "$result" ]]; then
  # No answer at all usually means a slow first launch on a cold runner, not a failed check.
  # A real crash fails the second attempt too.
  echo "The app gave no answer within 5 minutes; launching it once more." >&2
  diagnose
  result=$(run_checks 2)
fi

if [[ "$result" == "[debug] PASS"* ]]; then
  echo "${result#\[debug\] PASS }: interface, layout, in-page solver, storage and camera answers on iPad."
else
  echo "iPad checks failed: ${result:-the app gave no answer in two launches (it may have crashed).}" >&2
  diagnose
  exit 1
fi
