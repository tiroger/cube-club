#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
swift scripts/test.swift
VISION_TEST_BIN=$(mktemp -d "${TMPDIR:-/tmp}/cube-vision-tests.XXXXXX")
trap 'rm -rf "$VISION_TEST_BIN"' EXIT
swiftc -O Sources/CubeClub/CubeVision.swift Tests/vision-tests.swift -o "$VISION_TEST_BIN/vision-tests"
"$VISION_TEST_BIN/vision-tests"

swiftc -O Sources/CubeClub/CubeVision.swift Sources/CubeClub/CameraFramePipeline.swift Tests/camera-pipeline-tests.swift -o "$VISION_TEST_BIN/camera-pipeline-tests"
"$VISION_TEST_BIN/camera-pipeline-tests"

swiftc -parse-as-library Tests/quest-ui-tests.swift -o "$VISION_TEST_BIN/quest-ui-tests"
"$VISION_TEST_BIN/quest-ui-tests"

"$VISION_TEST_BIN/quest-ui-tests" Tests/settings-ui-tests.js
