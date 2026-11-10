"""Verify fixed local release APKs, including native page alignment and test isolation."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
TOOLS = Path.home() / 'AppData/Local/Android/Sdk/build-tools/37.0.0'
CERT = '058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65'
DEV_CERT = 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c'


def verify(path, compressed, certificate):
    env = dict(os.environ, JAVA_HOME=r'C:\Program Files\Android\Android Studio\jbr')
    result = subprocess.run([str(TOOLS / 'apksigner.bat'), 'verify', '--verbose', '--print-certs', str(path)], env=env, capture_output=True, text=True, check=True)
    actual = re.search(r'certificate SHA-256 digest: ([a-f0-9]+)', result.stdout).group(1)
    assert actual == certificate, 'Unexpected signing certificate'
    manifest = subprocess.check_output([str(TOOLS / 'aapt.exe'), 'dump', 'badging', str(path)], text=True)
    assert "package: name='local.mediacenter.mobile' versionCode='9' versionName='1.0.0'" in manifest
    assert "sdkVersion:'26'" in manifest
    native_count = 0
    with path.open('rb') as raw, zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        for info in archive.infolist():
            if info.filename.endswith('.dex'):
                data = archive.read(info)
                for name in (b'FocusTestActivity', b'UpdateTestActivity', b'TransitionTestActivity'):
                    assert name not in data, 'Test activity leaked into production APK'
            if not info.filename.startswith('lib/') or not info.filename.endswith('.so'):
                continue
            assert info.filename.startswith('lib/arm64-v8a/'), 'Unexpected native ABI'
            assert (info.compress_type != zipfile.ZIP_STORED) == compressed
            data = archive.read(info)
            assert data[:6] == b'\x7fELF\x02\x01'
            phoff = struct.unpack_from('<Q', data, 32)[0]
            phsize, count = struct.unpack_from('<HH', data, 54)
            for index in range(count):
                offset = phoff + index * phsize
                if struct.unpack_from('<I', data, offset)[0] == 1:
                    assert struct.unpack_from('<Q', data, offset + 48)[0] >= 16384, 'ELF load alignment below 16 KB'
            if not compressed:
                raw.seek(info.header_offset)
                header = raw.read(30)
                name_size, extra_size = struct.unpack_from('<HH', header, 26)
                assert (info.header_offset + 30 + name_size + extra_size) % 16384 == 0, 'APK native offset below 16 KB alignment'
            native_count += 1
    assert native_count > 0
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert path.with_suffix('.apk.sha256').read_text().split()[0] == digest
    return dict(file=path.name, sha256=digest, certificateSha256=actual, versionCode=9, versionName='1.0.0', nativeLibraries=native_count, compressedNativeLibraries=compressed, native16KBAlignment=True, testActivitiesExcluded=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    suffixes = ('preview-arm64', 'preview-emulator-arm64') if args.preview else ('arm64', 'permanent-key-candidate-emulator-arm64')
    report = [verify(ROOT / f'release/mobile/Media-Center-Mobile-1.0.0-{suffix}.apk', index == 1, DEV_CERT if args.preview else CERT) for index, suffix in enumerate(suffixes)]
    output = ROOT / f'artifacts/mobile-native-tests/{"preview" if args.preview else "final-signed"}-apk-verification-20261111.json'
    output.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
