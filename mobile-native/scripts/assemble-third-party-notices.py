"""Assemble original notices, dependency attribution and pinned standard license terms.

Inputs are read-only audit outputs in ignored artifacts/mobile-source-release/.
No application profiles, credentials, cached media or binary dependencies are copied.
"""
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "mobile-native"
INPUT = ROOT / "artifacts/mobile-source-release"
OUTPUT = ROOT / "release/mobile/Media-Center-Mobile-1.0.0-notices.zip"


def main():
 npm = json.loads((INPUT / "npm-license-scan.json").read_text(encoding="utf-8-sig"))
 maven = json.loads((INPUT / "maven-notice-inventory.json").read_text(encoding="utf-8"))
 catalog = json.loads((INPUT / "spdx/manifest.json").read_text(encoding="utf-8"))
 upstream = json.loads((INPUT / "upstream-notices/manifest.json").read_text(encoding="utf-8"))
 if any("unresolved" in row for row in catalog["licenses"]) or any(not row.get("licenses") for row in maven):
  raise ValueError("Dependency license declarations are incomplete")
 entries = {}

 def put(path, raw):
  if path.startswith("/") or ".." in path.split("/") or "\\" in path:
   raise ValueError("Unsafe notice path")
  if len(raw) > 2 * 1024 * 1024:
   raise ValueError("Unexpectedly large notice text")
  entries[path] = raw

 def slug(text):
  return re.sub(r"[^A-Za-z0-9_.@-]", "--", text)

 attribution = {}
 for key, record in sorted(npm.items()):
  if key.startswith("media-center-mobile@"):
   continue
  if not record.get("licenses") or record["licenses"] in ("UNLICENSED", "UNKNOWN"):
   raise ValueError("Unresolved production dependency: " + key)
  preserved = []
  files = {Path(record[k]) for k in ("licenseFile", "noticeFile") if record.get(k)}
  package = Path(record["path"]).resolve()
  if not package.is_relative_to(PROJECT):
   raise ValueError("Audit package escaped the project")
  files.update(p for p in package.iterdir() if p.is_file() and p.name.lower().startswith(("license", "licence", "copying", "notice", "unlicense")))
  for file in sorted(files):
   resolved = file.resolve()
   if not resolved.is_relative_to(PROJECT):
    raise ValueError("Notice escaped the project")
   path = "npm/" + slug(key) + "/" + file.name
   put(path, resolved.read_bytes())
   preserved.append(path)
  attribution[key] = {k: record[k] for k in ("licenses", "repository", "publisher", "email", "url", "copyright") if record.get(k)}
  attribution[key]["preservedFiles"] = preserved
 for file in sorted((PROJECT / "licenses").glob("*.txt")):
  put("project-notices/" + file.name, file.read_bytes())
 for row in catalog["licenses"]:
  raw = (INPUT / "spdx" / (row["id"] + ".txt")).read_bytes()
  if hashlib.sha256(raw).hexdigest() != row["sha256"]:
   raise ValueError("Standard license text changed")
  put("standard-terms/" + row["id"] + ".txt", raw)
 for row in upstream:
  if "file" not in row:
   continue
  raw = (INPUT / "upstream-notices" / row["file"]).read_bytes()
  if hashlib.sha256(raw).hexdigest() != row["sha256"]:
   raise ValueError("Upstream notice text changed")
  put("upstream-notices/" + row["file"], raw)

 def embedded(raw, prefix, nested=False):
  with zipfile.ZipFile(io.BytesIO(raw)) as archive:
   for item in archive.infolist():
    leaf = item.filename.rsplit("/", 1)[-1].lower()
    if not item.is_dir() and leaf.startswith(("license", "licence", "notice", "copying", "copyright")):
     if item.file_size > 2 * 1024 * 1024:
      raise ValueError("Unexpected embedded notice size")
     put(prefix + "/" + slug(item.filename), archive.read(item))
   if not nested and "classes.jar" in archive.namelist():
    embedded(archive.read("classes.jar"), prefix + "/classes", True)

 cache = Path.home() / ".gradle/caches/modules-2/files-2.1"
 for row in maven:
  prefix = "maven/" + slug(row["group"] + ":" + row["name"] + ":" + row["version"])
  folder = cache / row["group"] / row["name"] / row["version"]
  if not folder.resolve().is_relative_to(cache.resolve()):
   raise ValueError("Maven coordinate escaped the dependency cache")
  for file in sorted(folder.glob("*/*")):
   if file.suffix == ".pom":
    put(prefix + "/" + file.name, file.read_bytes())
   elif file.suffix in (".jar", ".aar"):
    embedded(file.read_bytes(), prefix + "/" + slug(file.name))
 metadata = {"npm": attribution, "maven": maven, "standardTerms": catalog, "supplementalUpstreamNotices": upstream}
 put("inventory.json", (json.dumps(metadata, indent=2) + "\n").encode())
 put("README.txt", b"Media Center is GPL-3.0-only. Original notice and copyright files are preserved verbatim.\n"
  b"inventory.json identifies the declared licenses, authors and source repositories. Standard SPDX terms supplement declarations; they do not replace package copyright notices.\n"
  b"The inventory is conservative: npm production dependencies and selected Maven runtime components can include tooling or code removed by bundling/minification.\n"
  b"Some npm distributions provide a README/license declaration without a standalone notice; their available original material and applicable standard terms are included.\n"
  b"The separate pinned MPV/FFmpeg source collection retains engine/dependency sources and original licenses. Distribute it with the complete Media Center application/JNI/build-plugin sources.\n")
 put("Media-Center-GPL-3.0.txt", (ROOT / "LICENSE").read_bytes())
 OUTPUT.parent.mkdir(parents=True, exist_ok=True)
 staged = OUTPUT.with_suffix(".zip.part")
 with zipfile.ZipFile(staged, "w", compression=zipfile.ZIP_DEFLATED) as archive:
  for path, raw in sorted(entries.items()):
   archive.writestr(path, raw)
 staged.replace(OUTPUT)
 digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
 OUTPUT.with_suffix(".zip.sha256").write_text(digest + "  " + OUTPUT.name + "\n", encoding="utf-8")
 print("Collected", len(attribution), "npm dependencies,", len(maven), "Maven components and", len(entries), "notice/metadata files.")
 print("Local notices:", OUTPUT)


if __name__ == "__main__":
 main()
