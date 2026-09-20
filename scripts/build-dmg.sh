#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ $# -gt 1 || ($# -eq 1 && "$1" != "--skip-build") ]]; then
  printf 'Usage: %s [--skip-build]\n' "$0" >&2
  exit 1
fi
if [[ "${1:-}" != "--skip-build" ]]; then
  ./scripts/build.sh
fi
export CLANG_MODULE_CACHE_PATH="${TMPDIR:-/tmp}/cube-club-clang-cache"
mkdir -p build
DMG_PYTHON="$PWD/build/dmg-tools/bin/python"
if [[ ! -x "$DMG_PYTHON" ]]; then
  python3 -m venv build/dmg-tools
fi
if ! "$DMG_PYTHON" -c 'from importlib.metadata import version; assert all(version(n)==v for n,v in [("dmgbuild","1.6.7"),("ds_store","1.3.3"),("mac_alias","2.2.3")])' 2>/dev/null; then
  "$DMG_PYTHON" -m pip install --disable-pip-version-check --requirement scripts/requirements-dmg.txt
fi
swift scripts/prepare-dmg-background.swift assets/dmg/installer-background.png build/dmg-background.tiff scripts/dmg-layout.json
"$DMG_PYTHON" scripts/package-dmg.py
