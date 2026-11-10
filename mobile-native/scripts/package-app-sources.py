"""Package current project sources without ignored profiles, binaries or signing material."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "release/mobile/Media-Center-Mobile-1.0.0-app-sources.zip"


def main():
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    added = subprocess.check_output([
        "git", "ls-files", "--others", "--exclude-standard", "-z", "--",
        "mobile-native", "mobile", "docs/mobile", "postman",
    ], cwd=ROOT).decode().split("\0")
    names = sorted(set(tracked + added) - {""})
    entries = []
    for name in names:
        path = (ROOT / name).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            raise ValueError("Missing or escaped source: " + name)
        parts = {p.lower() for p in Path(name).parts}
        if parts & {"node_modules", "artifacts", "release", ".git", ".expo", "__pycache__"}:
            raise ValueError("Non-source directory: " + name)
        if path.suffix.lower() in {".apk", ".aab", ".keystore", ".jks", ".p12", ".key", ".sqlite", ".db"}:
            raise ValueError("Private or binary artifact: " + name)
        if path.name.startswith(".env") and path.name != ".env.example":
            raise ValueError("Environment file: " + name)
        entries.append((name, path.read_bytes()))
    assert any(name.endswith("/MobileUpdates.kt") for name, _ in entries)
    assert any(name.endswith("/CMakeLists.txt") for name, _ in entries)
    assert any(name == "mobile-native/package-lock.json" for name, _ in entries)
    manifest = {
        "version": "1.0.0", "versionCode": 9,
        "scope": "Current working-tree source, including desktop, mobile JNI/config plugins and locked dependencies. Separate native-source and notice archives accompany this collection.",
        "files": [{"path": name, "sha256": hashlib.sha256(data).hexdigest()} for name, data in entries],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in entries:
            archive.writestr("media-center/" + name, data)
        archive.writestr("SOURCE-MANIFEST.json", json.dumps(manifest, indent=2))
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    OUTPUT.with_suffix(OUTPUT.suffix + ".sha256").write_text(digest + "  " + OUTPUT.name + "\n", encoding="utf-8")
    print(json.dumps({"file": OUTPUT.name, "sourceFiles": len(entries), "sha256": digest}))


if __name__ == "__main__":
    main()
