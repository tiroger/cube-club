#!/usr/bin/env python3
"""Create and verify the drag-to-install image without automating Finder."""
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import tempfile

import dmgbuild
from ds_store import DSStore
from mac_alias import Alias

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "build/Cube Club.app"
ENTITLEMENTS = ROOT / "scripts/CubeClub.entitlements"
BACKGROUND = ROOT / "build/dmg-background.tiff"
EMBEDDED_BACKGROUND = Path("Contents/Resources/InstallerBackground.tiff")
LAYOUT = json.loads((ROOT / "scripts/dmg-layout.json").read_text())


def run(*args, capture=False):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE if capture else None).stdout


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def contents(folder):
    result = {}
    for path in folder.rglob("*"):
        name = str(path.relative_to(folder))
        if path.is_symlink():
            result[name] = "link:" + os.readlink(path)
        elif path.is_file():
            result[name] = digest(path)
    return result


def tuck_background_into_app(mount_point, _options):
    """Keep Finder's background file out of the installer's top-level view."""
    volume = Path(mount_point)
    source = volume / ".background.tiff"
    target = volume / APP.name / EMBEDDED_BACKGROUND
    if digest(source) != digest(target):
        raise RuntimeError("The installer background differs from the signed app resource.")
    # Rename on the same HFS+ volume to retain the file ID used by Finder's
    # background alias. The signed app already contains these exact bytes.
    source.replace(target)


def verify(image):
    run("/usr/bin/hdiutil", "verify", str(image), capture=True)
    with tempfile.TemporaryDirectory(prefix="cube-club-dmg-check-") as temporary:
        mount = Path(temporary) / "volume"
        mount.mkdir()
        attached = False
        try:
            run("/usr/bin/hdiutil", "attach", "-readonly", "-nobrowse", "-noautoopen",
                "-mountpoint", str(mount), str(image), capture=True)
            attached = True
            root_items = {p.name for p in mount.iterdir()}
            if root_items != {"Cube Club.app", "Applications", ".DS_Store"}:
                raise RuntimeError(f"Unexpected installer contents: {root_items}")
            if not (mount / "Applications").is_symlink() or os.readlink(mount / "Applications") != "/Applications":
                raise RuntimeError("The Applications shortcut is not correct.")
            run("/usr/bin/codesign", "--verify", "--deep", "--strict", str(mount / APP.name))
            if contents(mount / APP.name) != contents(APP):
                raise RuntimeError("The packaged app differs from the source build.")
            embedded = mount / APP.name / EMBEDDED_BACKGROUND
            if digest(embedded) != digest(BACKGROUND):
                raise RuntimeError("The installer background differs from the prepared artwork.")
            with DSStore.open(str(mount / ".DS_Store"), "r") as store:
                view = store["."]["icvp"]
                if view["backgroundType"] != 2 or not view.get("backgroundImageAlias"):
                    raise RuntimeError("Finder background is not configured.")
                if Alias.from_bytes(view["backgroundImageAlias"]).target.cnid != embedded.stat().st_ino:
                    raise RuntimeError("Finder background alias does not identify the embedded artwork.")
                for name, position in LAYOUT["icons"].items():
                    if tuple(store[name]["Iloc"]) != tuple(position):
                        raise RuntimeError(f"Incorrect icon location: {name}")
                if view["iconSize"] != LAYOUT["icon_size"]:
                    raise RuntimeError("Incorrect installer icon size.")
            if not (os.statvfs(mount).f_flag & os.ST_RDONLY):
                raise RuntimeError("The final installer volume is not read-only.")
        finally:
            if attached:
                run("/usr/bin/hdiutil", "detach", str(mount), capture=True)
    print("Verified: read-only image, two top-level items, exact app contents, signature, Applications link, artwork and icon layout.")


def main():
    if not APP.is_dir() or not BACKGROUND.is_file():
        raise SystemExit("Build the app and prepare its background with scripts/build-dmg.sh.")
    info = plistlib.loads((APP / "Contents/Info.plist").read_bytes())
    version = info["CFBundleShortVersionString"]
    if not re.fullmatch(r"[0-9]+(?:\.[0-9]+){1,2}", version):
        raise SystemExit("The app version is not suitable for a release filename.")
    architecture = run("/usr/bin/lipo", "-archs", str(APP / "Contents/MacOS/CubeClub"), capture=True).decode().split()
    arch_label = "universal" if set(architecture) == {"arm64", "x86_64"} else "-".join(architecture)
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", arch_label):
        raise SystemExit("Unexpected app architecture.")
    app_background = APP / EMBEDDED_BACKGROUND
    if not app_background.is_file() or digest(app_background) != digest(BACKGROUND):
        shutil.copyfile(BACKGROUND, app_background)
        run("/usr/bin/codesign", "--force", "--sign", "-", "--entitlements", str(ENTITLEMENTS), str(APP))
    run("/usr/bin/codesign", "--verify", "--deep", "--strict", str(APP))
    # Re-signing without it would make the general solver's first run about 20 times slower.
    if b"com.apple.security.cs.allow-jit" not in run("/usr/bin/codesign", "-d", "--entitlements", "-", str(APP), capture=True):
        raise SystemExit("The app is missing its JIT entitlement. Rebuild it with ./scripts/build.sh.")
    destination = ROOT / "dist"
    destination.mkdir(exist_ok=True)
    filename = f"Cube-Club-{version}-{arch_label}.dmg"
    # Only replace a previous release after the new image passes verification.
    with tempfile.TemporaryDirectory(prefix=".cube-club-package-", dir=destination) as temporary:
        image = Path(temporary) / filename
        settings = {
            "format": "UDZO", "filesystem": "HFS+", "compression_level": 9,
            "size": "48m", "files": [str(APP)], "symlinks": {"Applications": "/Applications"},
            "background": str(BACKGROUND), "create_hook": tuck_background_into_app,
            # Finder counts its title/path bars in the window bounds. Keep enough
            # room for the whole illustration even when the user's path bar is on.
            "window_rect": ((160, 120), (LAYOUT["width"], LAYOUT["height"] + LAYOUT["window_chrome_height"])),
            "default_view": "icon-view", "include_icon_view_settings": True,
            "include_list_view_settings": False,
            "icon_locations": {name: tuple(point) for name, point in LAYOUT["icons"].items()},
            "icon_size": LAYOUT["icon_size"], "text_size": LAYOUT["text_size"],
            "label_pos": "bottom", "arrange_by": None,
            "show_status_bar": False, "show_tab_view": False, "show_toolbar": False,
            "show_pathbar": False, "show_sidebar": False, "show_icon_preview": False,
        }
        print(f"Creating {filename}…", flush=True)
        dmgbuild.build_dmg(str(image), "Cube Club", settings=settings, lookForHiDPI=False)
        run("/usr/bin/codesign", "--force", "--sign", "-", str(image))
        run("/usr/bin/codesign", "--verify", "--strict", str(image))
        verify(image)
        final = destination / filename
        image.replace(final)
    checksum = digest(final)
    final.with_suffix(".dmg.sha256").write_text(f"{checksum}  {filename}\n")
    print(f"\nReady: {final}\nSize: {final.stat().st_size / 1024 / 1024:.1f} MB\nSHA-256: {checksum}")
    print("Local development package. Public distribution still needs Developer ID signing and Apple notarization.")


if __name__ == "__main__":
    main()
