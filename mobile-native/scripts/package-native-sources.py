"""Collect pinned engine sources; never substitute current upstream sources.

Run from the repository root. Downloads stay in ignored artifacts/ and release/.
Archives are retained verbatim, including licenses and upstream build scripts.
The manifest records each URL, immutable revision, byte count and SHA-256.
"""
import argparse
import configparser
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
APP_COMMIT = "fdf74f6830c47dbaa8a22ac79726e8303f1db5af"
BINARY_SHA = "0b0e0a534dd6b8d2b117f06952e0600064ad97702e48bff02543e3e32107803d"
GIT = [
 ("mpv-android", "mpv-android/mpv-android", APP_COMMIT),
 ("mpv", "mpv-player/mpv", "0b7ed670f7c353dd3dd4f8ae0fc788a181a15aa6"),
 ("ffmpeg", "FFmpeg/FFmpeg", "094a2f8a2a5e7fa64736e067de224ce28fdf5979"),
 ("dav1d", "videolan/dav1d", "362bc11"),
 ("libass", "libass/libass", "b2fe9d8"),
 ("libplacebo", "haasn/libplacebo", "3330a51"),
 ("freetype2", "freetype/freetype", "VER-2-14-3"),
]
TARBALLS = [
 ("mbedtls", "3.6.7", "https://github.com/Mbed-TLS/mbedtls/releases/download/mbedtls-3.6.7/mbedtls-3.6.7.tar.bz2"),
 ("fribidi", "1.0.16", "https://github.com/fribidi/fribidi/releases/download/v1.0.16/fribidi-1.0.16.tar.xz"),
 ("harfbuzz", "14.4.0", "https://github.com/harfbuzz/harfbuzz/releases/download/14.4.0/harfbuzz-14.4.0.tar.xz"),
 ("unibreak", "8.0", "https://github.com/adah1972/libunibreak/releases/download/libunibreak_8_0/libunibreak-8.0.tar.gz"),
 ("libxml2", "2.15.4", "https://gitlab.gnome.org/GNOME/libxml2/-/archive/v2.15.4/libxml2-v2.15.4.tar.gz"),
 ("fontconfig", "2.18.3", "https://gitlab.freedesktop.org/fontconfig/fontconfig/-/archive/2.18.3/fontconfig-2.18.3.tar.gz"),
 ("lua", "5.2.4", "https://www.lua.org/ftp/lua-5.2.4.tar.gz"),
 ("curl", "8.21.0", "https://curl.se/download/curl-8.21.0.tar.gz"),
]


def read(url):
 req = urllib.request.Request(url, headers={"User-Agent": "Media-Center-source-archive", "Accept": "application/vnd.github+json"})
 with urllib.request.urlopen(req, timeout=180) as response:
  data = response.read(256 * 1024 * 1024 + 1)
  if len(data) > 256 * 1024 * 1024:
   raise ValueError("Source archive exceeds collector limit")
  return data


def main():
 parser = argparse.ArgumentParser(description=__doc__)
 parser.add_argument("--cache", type=Path, default=ROOT / "artifacts/mobile-source-release/archives")
 parser.add_argument("--output", type=Path, default=ROOT / "release/mobile/Media-Center-native-sources-2026-09-17.zip")
 args = parser.parse_args()
 args.cache.mkdir(parents=True, exist_ok=True)
 lock = json.loads((ROOT / "mobile-native/native-source-lock.json").read_text(encoding="utf-8"))
 expected = {record["name"]: record for record in lock["archives"]}
 records = []
 seen = set()

 def archive(name, revision, url, suffix):
  if not re.fullmatch(r"[A-Za-z0-9_.-]+", name + revision):
   raise ValueError("Unsafe archive identity")
  pinned = expected[name]
  if revision != pinned["revision"] or url != pinned["url"]:
   raise ValueError("Source revision differs from reviewed lock: " + name)
  dest = args.cache / (name + "-" + revision + suffix)
  if not dest.exists():
   data = read(url)
   # Confirm an archive, never package an HTML error response as source.
   with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tar:
    if not tar.getmembers():
     raise ValueError("Empty source archive: " + name)
   temporary = dest.with_suffix(dest.suffix + ".part")
   temporary.write_bytes(data)
   temporary.replace(dest)
  data = dest.read_bytes()
  if len(data) != pinned["bytes"] or hashlib.sha256(data).hexdigest() != pinned["sha256"]:
   raise ValueError("Source checksum differs from reviewed lock: " + name)
  with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tar:
   if not tar.getmembers():
    raise ValueError("Invalid cached source archive: " + name)
  records.append({"name": name, "revision": revision, "url": url, "file": dest.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
  print("Collected " + name + " " + revision, flush=True)
  return data

 def git(name, repo, revision, depth=0):
  if depth > 8:
   raise ValueError("Excessive nested submodules")
  cache_key = (repo, revision)
  if cache_key in seen:
   return
  seen.add(cache_key)
  pin = args.cache / (name + "-revision.json")
  if re.fullmatch(r"[0-9a-f]{40}", revision):
   full = revision
  elif pin.exists():
   saved = json.loads(pin.read_text(encoding="utf-8"))
   assert saved["repo"] == repo and saved["ref"] == revision
   full = saved["commit"]
  else:
   full = json.loads(read("https://api.github.com/repos/" + repo + "/commits/" + revision))["sha"]
   pin.write_text(json.dumps({"repo": repo, "ref": revision, "commit": full}, indent=2), encoding="utf-8")
  assert re.fullmatch(r"[0-9a-f]{40}", full)
  data = archive(name, full, "https://codeload.github.com/" + repo + "/tar.gz/" + full, ".tar.gz")
  with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
   members = [m for m in tar.getmembers() if m.name.count("/") == 1 and m.name.endswith("/.gitmodules")]
   if not members:
    return
   config = configparser.ConfigParser()
   config.read_string(tar.extractfile(members[0]).read().decode("utf-8"))
  treefile = args.cache / (name + "-" + full + "-tree.json")
  if not treefile.exists():
   treefile.write_bytes(read("https://api.github.com/repos/" + repo + "/git/trees/" + full + "?recursive=1"))
  tree = json.loads(treefile.read_text(encoding="utf-8"))
  if tree.get("truncated"):
   raise ValueError("Truncated submodule tree: " + name)
  links = {e["path"]: e["sha"] for e in tree["tree"] if e["mode"] == "160000"}
  for section in config.sections():
   path = config[section]["path"]
   if path not in links:
    raise ValueError("Unresolved submodule: " + name + "/" + path)
   url = config[section]["url"]
   match = re.fullmatch(r"https://github.com/([^/]+/[^/]+?)(?:\.git)?/?", url)
   if not match:
    raise ValueError("Submodule requires explicit provenance review: " + url)
   child_name = name + "--" + path.replace("/", "--")
   git(child_name, match[1], links[path], depth + 1)
   child = next(record for record in records if record["name"] == child_name)
   child.setdefault("placements", []).append({"parent": name, "path": path})

 for name, repo, ref in GIT:
  git(name, repo, ref)
 for name, version, url in TARBALLS:
  suffix = ".tar.bz2" if url.endswith(".bz2") else ".tar.xz" if url.endswith(".xz") else ".tar.gz"
  archive(name, version, url, suffix)
 if records != lock["archives"]:
  raise ValueError("Source/submodule inventory differs from reviewed lock")
 manifest = {"upstreamRelease": "2026-09-17", "upstreamApkSha256": BINARY_SHA, "archives": records}
 args.output.parent.mkdir(parents=True, exist_ok=True)
 temporary = args.output.with_suffix(".zip.part")
 with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_STORED) as output:
  output.writestr("manifest.json", json.dumps(manifest, indent=2) + "\n")
  output.write(ROOT / "docs/mobile/MPV-ANDROID-PROVENANCE.md", "BUILD-PROVENANCE.md")
  output.write(Path(__file__), "package-native-sources.py")
  output.write(ROOT / "mobile-native/native-source-lock.json", "native-source-lock.json")
  for notice in sorted((ROOT / "mobile-native/licenses").glob("*-NDK30-LICENSE.txt")):
   output.write(notice, "runtime-notices/" + notice.name)
  output.writestr("README.txt", "These archives retain the exact sources, license files, patches and build scripts.\n"
   "Start with mpv-android at the recorded commit. Its buildscripts/ directory is an embedded tree.\n"
   "Populate buildscripts/deps/{name}/ with the matching archive contents (strip the enclosing archive directory).\n"
   "Names freetype2 and unibreak follow upstream directory names. Populate submodule paths using placements in manifest.json.\n"
   "Do not run download-deps.sh without restoring these pinned sources: its Git branches can advance.\n"
   "Follow buildscripts/README.md and include/depinfo.sh for Linux tool dependencies and Android NDK r30.\n"
   "Native configuration and patches are in buildscripts/scripts/ and buildscripts/patches/ in the upstream snapshot.\n"
   "Media Center extracts the unmodified ARM64 shared libraries; it uses its own JNI bridge, not libplayer.so.\n"
   "The complete Media Center application/JNI/build-plugin sources must accompany the release separately.\n"
   "This archive is a source collection, not a claim of a bit-for-bit reproduction of upstream binaries.\n")
  for record in records:
   output.write(args.cache / record["file"], "archives/" + record["file"])
 temporary.replace(args.output)
 digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
 args.output.with_suffix(args.output.suffix + ".sha256").write_text(digest + "  " + args.output.name + "\n", encoding="utf-8")
 print("Source collection: " + str(args.output), flush=True)


if __name__ == "__main__":
 main()
