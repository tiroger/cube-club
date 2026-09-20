#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
swift scripts/test.swift
