"""Guarded QA-only updater acceptance; never installs or clears the real app."""
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
ADB = Path.home() / "AppData/Local/Android/Sdk/platform-tools/adb.exe"
PACKAGE = "local.mediacenter.library.test"
FIXTURE = ROOT / "artifacts/mobile-update-fixture"


def adb(*args):
    result = subprocess.run([str(ADB), "-s", "emulator-5556", *args], capture_output=True, text=True, timeout=90)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


def main():
    assert "Media_Center_Migration_QA" in adb("emu", "avd", "name")
    assert "versionCode=0 " in adb("shell", "dumpsys", "package", PACKAGE)
    files = {
        "candidate": FIXTURE / "candidate.apk",
        "wrong-signer": FIXTURE / "wrong-signer.apk",
        "baseline": FIXTURE / "baseline.apk",
        "wrong-package": ROOT / "release/mobile/Media-Center-Mobile-1.0.0-arm64.apk",
    }
    for name, file in files.items():
        assert file.is_file()
        adb("push", str(file), "/data/local/tmp/mc-updater-" + name + ".apk")
    rows = []
    for mode in ["checksum", "truncated", "foreign-redirect", "wrong-package", "wrong-signer", "old-code", "valid"]:
        adb("shell", "am", "force-stop", PACKAGE)
        adb("shell", "run-as", PACKAGE, "rm", "-f", "files/update-result.json")
        name = "baseline" if mode == "old-code" else mode if mode in files else "candidate"
        adb("shell", "run-as", PACKAGE, "cp", "/data/local/tmp/mc-updater-" + name + ".apk", "files/update-input.apk")
        adb("shell", "am", "start", "-n", PACKAGE + "/local.mediacenter.library.UpdateTestActivity", "--es", "mode", mode)
        deadline = time.monotonic() + 40
        while time.monotonic() < deadline:
            try:
                row = json.loads(adb("shell", "run-as", PACKAGE, "cat", "files/update-result.json"))
                break
            except (RuntimeError, json.JSONDecodeError):
                time.sleep(.5)
        else:
            raise AssertionError("No result for " + mode)
        assert row["mode"] == mode and row["passed"], row
        if mode != "valid":
            assert row["rejectedFileRemoved"], row
        rows.append(row)
        print("PASS " + mode, flush=True)
    report = {"avd": "Media_Center_Migration_QA", "separateTestPackage": PACKAGE,
              "transport": "In-process deterministic GitHub responses; real production updater and Android package verification",
              "cases": rows, "installerConfirmationPending": True}
    (ROOT / "artifacts/mobile-native-tests/updater-native-20261111.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
