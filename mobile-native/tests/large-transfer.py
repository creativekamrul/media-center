"""Prolonged generated-original transfer; guarded QA AVD and separate test UID."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shlex
import struct
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("lifecycle", Path(__file__).with_name("service-lifecycle.py"))
test = importlib.util.module_from_spec(spec)
spec.loader.exec_module(test)
PACKAGE = test.PACKAGE


def main():
    assert test.adb("emu", "avd", "name").splitlines()[0].strip() == "Media_Center_Migration_QA"
    checkpoint = ROOT / "artifacts/mobile-native-tests/large-transfer-progress-20261111.json"
    apk = ROOT / "artifacts/mobile-update-fixture/baseline.apk"
    verify_only = "--verify-completed" in sys.argv
    if not verify_only:
        assert "Success" in test.adb("install", "-t", "-r", str(apk))
        test.adb("reverse", "tcp:18547", "tcp:18547")
        test.seed()
        test.begin()
        test.adb("shell", "input", "keyevent", "KEYCODE_HOME")
    started = time.monotonic()
    samples = json.loads(checkpoint.read_text())["samples"] if verify_only else []
    p = test.preferences()
    row = test.jobs(p)["service-active"]
    while not verify_only and time.monotonic() - started < 480:
        p = test.preferences()
        row = test.jobs(p)["service-active"]
        memory = test.adb("shell", "dumpsys", "meminfo", PACKAGE)
        match = re.search(r"TOTAL PSS:\s*(\d+)", memory)
        if not match:
            match = re.search(r"^\s*TOTAL\s+(\d+)\s", memory, re.M)
        assert match, "No process memory observation"
        allocated = int(test.adb("shell", "run-as", PACKAGE, "du", "-sk", "cache/transfer-fixture").split()[0])
        service = test.adb("shell", "dumpsys", "activity", "services", PACKAGE)
        samples.append({"seconds": round(time.monotonic() - started), "pssKB": int(match.group(1)),
                        "allocatedKB": allocated, "status": row["status"],
                        "foregroundService": "isForeground=true" in service})
        checkpoint.write_text(json.dumps({"samples": samples}, indent=2), encoding="utf-8")
        print(json.dumps(samples[-1]), flush=True)
        if row["status"] in ("complete", "error"):
            break
        assert row["status"] == "downloading", row
        time.sleep(15)
    assert row["status"] == "complete", row
    assert samples[-1]["seconds"] >= 180, "Not a prolonged transfer"
    rows = test.jobs(p)
    assert rows["service-paused"]["status"] == "paused" and rows["service-cancelled"]["status"] == "cancelled"
    items = json.loads(p["items"])
    assert len(items) == 1
    item = items[0]
    expected_bytes = 44 + 96000 * 3600
    assert item["bytes"] == expected_bytes
    relative = item["path"]
    assert relative.startswith("Music/") and ".." not in relative
    original_hash = hashlib.sha256()
    original_hash.update(struct.pack("<4sI4s4sIHHIIHH4sI", b"RIFF", expected_bytes - 8, b"WAVE", b"fmt ", 16,
                                     1, 1, 48000, 96000, 2, 16, b"data", expected_bytes - 44))
    remaining = expected_bytes - 44
    block = bytes(1024 * 1024)
    while remaining:
        count = min(remaining, len(block))
        original_hash.update(block[:count])
        remaining -= count
    actual_hash = test.adb("shell", "run-as", PACKAGE, "sha256sum", shlex.quote("cache/transfer-fixture/" + relative)).split()[0]
    assert actual_hash == item["sha256"] == original_hash.hexdigest()
    memory_growth = max(s["pssKB"] for s in samples) - min(s["pssKB"] for s in samples)
    assert memory_growth < 100 * 1024, "Transfer memory grew with the original"
    report = {"avd": "Media_Center_Migration_QA", "separateTestUid": True, "generatedOriginalBytes": expected_bytes,
              "nativeBackgroundTransferComplete": True, "originalHashVerified": True,
              "pausedAndCancelledJobsPreserved": True, "memoryGrowthKB": memory_growth, "samples": samples,
              "limits": "Not a Samsung result, not a 200 GB cache test, not an overnight/reboot guarantee."}
    (ROOT / "artifacts/mobile-native-tests/large-transfer-20261111.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    assert "Success" in test.adb("uninstall", PACKAGE)
    print("PASS prolonged bounded-memory original transfer; separate test app and its generated media removed.", flush=True)


if __name__ == "__main__":
    main()
