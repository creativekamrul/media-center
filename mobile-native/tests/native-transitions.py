"""Actual native transition regression; never targets a phone or real application UID."""
import argparse
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
ADB = Path.home() / "AppData/Local/Android/Sdk/platform-tools/adb.exe"
PACKAGE = "local.mediacenter.library.test"


def adb(*args, required=True):
    result = subprocess.run([str(ADB), "-s", "emulator-5556", *args], capture_output=True, text=True, timeout=60)
    if required and result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-test-app", action="store_true")
    args = parser.parse_args()
    assert "Media_Center_Migration_QA" in adb("emu", "avd", "name")
    apk = ROOT / "artifacts/mobile-update-fixture/baseline.apk"
    assert "Success" in adb("install", "-t", "-r", str(apk))
    adb("reverse", "tcp:18547", "tcp:18547")
    adb("shell", "am", "force-stop", PACKAGE)
    adb("shell", "run-as", PACKAGE, "rm", "-f", "files/transition-result.json")
    try:
        launch = adb("shell", "am", "start", "-n", PACKAGE + "/local.mediacenter.library.TransitionTestActivity")
        assert "Error" not in launch, launch
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            raw = adb("shell", "run-as", PACKAGE, "cat", "files/transition-result.json", required=False)
            if raw.startswith("{"):
                report = json.loads(raw)
                break
            time.sleep(1)
        else:
            raise AssertionError("Native transition test did not finish")
        if report.get("passed"):
            pid = adb("shell", "pidof", PACKAGE).strip()
            assert pid.isdigit()
            events = adb("logcat", "-d", "--pid=" + pid, "-s", "MCTransition:I")
            assert "crossfade-handoff" in events and "gapless-handoff" in events
            report["nativeHandoffEventsVerified"] = True
        target = ROOT / "artifacts/mobile-native-tests/native-transition-regression-20261111.json"
        target.write_text(json.dumps(report, indent=2), encoding="utf-8")
        assert report["passed"], report
        print(json.dumps(report), flush=True)
    except Exception:
        details = adb("logcat", "-d", "-s", "AndroidRuntime:E", "MCPlayback:E")
        (ROOT / "artifacts/mobile-native-tests/native-transition-failure-20261111.log").write_text(details[-20000:], encoding="utf-8")
        raise
    finally:
        adb("shell", "am", "force-stop", PACKAGE)
        if not args.keep_test_app:
            assert "Success" in adb("uninstall", PACKAGE)


if __name__ == "__main__":
    main()
