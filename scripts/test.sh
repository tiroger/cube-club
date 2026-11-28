#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
swift scripts/test.swift
python3 voice/verify.py
VISION_TEST_BIN=$(mktemp -d "${TMPDIR:-/tmp}/cube-vision-tests.XXXXXX")
trap 'rm -rf "$VISION_TEST_BIN"' EXIT
swiftc -O Sources/CubeClub/CubeVision.swift Tests/vision-tests.swift -o "$VISION_TEST_BIN/vision-tests"
"$VISION_TEST_BIN/vision-tests"

swiftc -O Sources/CubeClub/CubeVision.swift Sources/CubeClub/CameraFramePipeline.swift Tests/camera-pipeline-tests.swift -o "$VISION_TEST_BIN/camera-pipeline-tests"
"$VISION_TEST_BIN/camera-pipeline-tests"

swiftc -parse-as-library Tests/quest-ui-tests.swift -o "$VISION_TEST_BIN/quest-ui-tests"
"$VISION_TEST_BIN/quest-ui-tests"

"$VISION_TEST_BIN/quest-ui-tests" Tests/settings-ui-tests.js

"$VISION_TEST_BIN/quest-ui-tests" Tests/dispatch-ui-tests.js

"$VISION_TEST_BIN/quest-ui-tests" Tests/onboarding-ui-tests.js

swiftc -parse-as-library Sources/CubeClub/NativeShell.swift Sources/CubeClub/CubeSolver.swift Sources/CubeClub/BackupFiles.swift Tests/native-shell-tests.swift -o "$VISION_TEST_BIN/native-shell-tests"
# Same JIT entitlement as the app, so the native solver runs at app speed.
codesign --force --sign - --entitlements scripts/CubeClub.entitlements "$VISION_TEST_BIN/native-shell-tests" 2>&1 | sed '/replacing existing signature/d'
"$VISION_TEST_BIN/native-shell-tests"

"$VISION_TEST_BIN/native-shell-tests" Tests/teaching-ui-tests.js

"$VISION_TEST_BIN/native-shell-tests" Tests/continuity-ui-tests.js

"$VISION_TEST_BIN/native-shell-tests" Tests/camera-guide-ui-tests.js

swiftc -parse-as-library Sources/CubeClub/BackupFiles.swift Sources/CubeClub/ClubStorage.swift Tests/backup-files-tests.swift -o "$VISION_TEST_BIN/backup-files-tests"
"$VISION_TEST_BIN/backup-files-tests"
