#!/bin/bash
# Launches the built app with Swift Package Manager's build folder hidden, so the app can use
# only what is inside its bundle, and fails unless it stays running. A GitHub-built 0.12.0
# crashed at launch on every other Mac because it looked for resources in the runner's .build.
#
#   ./scripts/smoke-launch.sh [app]
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
app=${1:-"$root/build/Cube Club.app"}
binary="$app/Contents/MacOS/CubeClub"
[[ -x "$binary" ]] || { echo "No app at $app. Run ./scripts/build.sh first." >&2; exit 1; }
# The app loads its interface from one of these (App.swift webRoot): Swift 6.4 nests the
# resource bundle's contents under Contents/Resources, Swift 6.1 keeps them at the top.
bundle="$app/Contents/Resources/CubeClub_CubeClub.bundle"
if [[ -f "$bundle/Contents/Resources/Web/index.html" ]]; then echo "Interface found in the nested bundle layout."
elif [[ -f "$bundle/Web/index.html" ]]; then echo "Interface found in the flat bundle layout."
else echo "The app has no interface in ${bundle#"$app/"}." >&2; exit 1; fi

hidden="$root/.build-hidden-for-launch-test"
moved=""
restore() { if [[ -n "$moved" ]]; then mv "$hidden" "$root/.build"; fi; }
trap restore EXIT
if [[ -d "$root/.build" ]]; then mv "$root/.build" "$hidden"; moved=1; fi

log=$(mktemp)
"$binary" >"$log" 2>&1 &
pid=$!
sleep 8
if kill -0 "$pid" 2>/dev/null; then
  kill "$pid"; wait "$pid" 2>/dev/null || true
  echo "Launch check passed: $(basename "$app") stayed running without the build folder."
else
  wait "$pid" && status=0 || status=$?
  echo "Launch check failed: the app exited with status $status within 8 seconds." >&2
  tail -20 "$log" >&2
  exit 1
fi
