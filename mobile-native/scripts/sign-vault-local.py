"""One-shot loopback signing form. Secrets stay out of command arguments and logs.

Use only on the developer's computer, then stop the process. A random capability,
exact Origin check and fixed source APK restrict this to one authorized signing job.
"""
import argparse
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
import urllib.parse

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_KEY = "4caa7a7352a70c56070ed6a63d496ccfb00fb3e543f6103f88796ec78bd3a124"
SOURCE = ROOT / "release/mobile/Media-Center-Mobile-1.0.0-rc.2-preview-arm64.apk"
EXPECTED_APK = "6a3a76bc642992cef709bee6a995d0fd90d5d56c7da4d81ea49321c5cb2ae989"
EXPECTED_CERTIFICATE = "058bc5c79fbc4462dabb952d3a2627778e5653c0a0000e15043eb6755b7adf65"
DESTINATION = ROOT / "release/mobile/Media-Center-Mobile-1.0.0-rc.2-permanent-key-candidate-arm64.apk"
TARGETS = [{"source": SOURCE, "sha256": EXPECTED_APK, "destination": DESTINATION}]
REPORT = ROOT / "artifacts/mobile-native-tests/permanent-signing-20261110.json"
PORT = 18549
TOKEN = secrets.token_urlsafe(32)
ORIGIN = "http://127.0.0.1:" + str(PORT)
PAGE = ("<!doctype html><html lang=en><meta charset=utf-8><title>Local Android signing</title>"
 "<h1>Media Center local signing</h1><p>This one-use form sends the saved signing key only to this computer."
 " It signs only the hash-verified local candidate APKs listed below. It does not publish or install them.</p>"
 "<form method=post action=/sign/" + TOKEN + ">"
 "<label>PKCS12 Base64<input name=key type=password autocomplete=off required></label>"
 "<label>Keystore password<input name=password type=password autocomplete=off required></label>"
 "<button>Sign local candidate</button></form></html>").encode()


class Handler(BaseHTTPRequestHandler):
 def log_message(self, *args):
  pass

 def reply(self, status, body):
  self.send_response(status)
  self.send_header("Content-Type", "text/html; charset=utf-8")
  self.send_header("Content-Length", str(len(body)))
  self.send_header("Cache-Control", "no-store")
  self.send_header("Content-Security-Policy", "default-src 'none'; form-action 'self'; frame-ancestors 'none'")
  self.send_header("X-Content-Type-Options", "nosniff")
  self.end_headers()
  self.wfile.write(body)

 def do_GET(self):
  if self.path not in ("/" + TOKEN, "/sign/" + TOKEN):
   self.reply(404, b"Not found")
  elif self.server.used:
   body = b"<h1>Local candidate signed and verified</h1><p>This signing session is finished. No more password entry is needed.</p>" if getattr(self.server, "completed", False) else b"<h1>Signing session finished</h1><p>Check the local verification result. This one-use form cannot be submitted again.</p>"
   self.reply(200, body)
  else:
   self.reply(200, PAGE)

 def do_POST(self):
  if self.path != "/sign/" + TOKEN or self.headers.get("Origin") != ORIGIN or self.server.used:
   self.reply(403, b"Rejected")
   return
  length = int(self.headers.get("Content-Length", "0"))
  if not 1 <= length <= 65536:
   self.reply(400, b"Invalid request")
   return
  self.server.used = True
  result = {"signed": False, "apks": []}
  phase = "read-form"
  try:
   fields = urllib.parse.parse_qs(self.rfile.read(length).decode("utf-8"), max_num_fields=2)
   key = base64.b64decode(fields["key"][0], validate=True)
   password = fields["password"][0]
   phase = "key-checksum"
   if hashlib.sha256(key).hexdigest() != EXPECTED_KEY:
    raise ValueError("Wrong signing key")
   if not 1 <= len(password) <= 1024 or password == "<redacted>":
    raise ValueError("Invalid or redacted password")
   validate_targets(TARGETS)
   environment = dict(os.environ)
   environment["MC_LOCAL_SIGN_PASSWORD"] = password
   environment["JAVA_HOME"] = str(Path(os.environ["ProgramFiles"]) / "Android/Android Studio/jbr")
   signer = Path(os.environ["LOCALAPPDATA"]) / "Android/Sdk/build-tools/37.0.0/apksigner.bat"
   phase = "sign-candidate"
   with tempfile.TemporaryDirectory(prefix="MediaCenter-Signing-") as directory:
    keyfile = Path(directory) / "release.p12"
    keyfile.write_bytes(key)
    for target in TARGETS:
     source, destination = target["source"], target["destination"]
     staged = destination.with_suffix(".signing.apk")
     try:
      run = subprocess.run([str(signer), "sign", "--ks", str(keyfile), "--ks-type", "PKCS12", "--ks-key-alias", "media-center-mobile", "--ks-pass", "env:MC_LOCAL_SIGN_PASSWORD", "--key-pass", "env:MC_LOCAL_SIGN_PASSWORD", "--v4-signing-enabled", "false", "--out", str(staged), str(source)], env=environment, capture_output=True, timeout=120)
      if run.returncode != 0:
       diagnostic = (run.stdout + run.stderr).decode("utf-8", errors="replace").lower()
       result["toolFailure"] = next((label for needle, label in [("password was incorrect", "password-rejected"), ("keystore was tampered", "password-rejected"), ("no key found", "alias-unavailable"), ("java_home", "java-environment"), ("access is denied", "file-access")] if needle in diagnostic), "signer-rejected")
       raise RuntimeError("Signing failed")
      phase = "verify-signature"
      verification = subprocess.run([str(signer), "verify", "--verbose", "--print-certs", str(staged)], env=environment, capture_output=True, text=True, timeout=45)
      if verification.returncode != 0:
       raise RuntimeError("Signature verification failed")
      cert = next(line.rsplit(": ", 1)[1] for line in verification.stdout.splitlines() if "certificate SHA-256 digest:" in line)
      if cert != EXPECTED_CERTIFICATE:
       raise ValueError("Wrong permanent certificate")
      digest = hashlib.sha256(staged.read_bytes()).hexdigest()
      staged.replace(destination)
      destination.with_suffix(".apk.sha256").write_text(digest + "  " + destination.name + "\n", encoding="utf-8")
      result["apks"].append({"file": destination.name, "sourceSha256": target["sha256"], "apkSha256": digest})
     finally:
      if staged.exists():
       staged.unlink()
   environment.pop("MC_LOCAL_SIGN_PASSWORD", None)
   password = ""
   key = b""
   fields.clear()
   result.update(signed=True, certificateSha256=EXPECTED_CERTIFICATE)
   try:
    self.reply(200, b"<html><title>Local candidate signed</title><h1>Local candidate signed and verified</h1><p>No publication or installation occurred. Temporary key material was removed.</p></html>")
    result["browserResponseDelivered"] = True
   except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
    # A lost browser connection must not turn verified files into a signing failure.
    result["browserResponseDelivered"] = False
  except Exception as error:
   result.update(failedPhase=phase, errorType=type(error).__name__)
   # Never forward exception text, request fields, passwords or tool output.
   self.reply(500, b"Signing failed. Inspect the key selection and retry with a new local signing session.")
  finally:
   self.server.completed = result["signed"]
   REPORT.write_text(json.dumps(result, indent=2), encoding="utf-8")
   print("Signing job complete: " + str(result["signed"]), flush=True)


def validate_targets(targets):
 if not 1 <= len(targets) <= 4:
  raise ValueError("Invalid local signing batch")
 destinations = set()
 for target in targets:
  for key in ("source", "destination"):
   path = Path(target[key]).resolve()
   if not path.is_relative_to((ROOT / "release/mobile").resolve()) or path.suffix != ".apk":
    raise ValueError("Signing paths must stay in release/mobile")
   target[key] = path
  if target["source"] == target["destination"] or target["destination"] in destinations:
   raise ValueError("Signing destinations must be unique")
  destinations.add(target["destination"])
  if hashlib.sha256(target["source"].read_bytes()).hexdigest() != target["sha256"]:
   raise ValueError("Candidate changed")


if __name__ == "__main__":
 parser = argparse.ArgumentParser(description=__doc__)
 parser.add_argument("--batch", type=Path)
 arguments = parser.parse_args()
 if arguments.batch:
  TARGETS = json.loads(arguments.batch.read_text(encoding="utf-8"))["targets"]
  for target in TARGETS:
   target["source"] = ROOT / target["source"]
   target["destination"] = ROOT / target["destination"]
  REPORT = ROOT / "artifacts/mobile-native-tests/permanent-signing-batch-20261111.json"
 validate_targets(TARGETS)
 PAGE += ("<ul>" + "".join("<li>" + target["destination"].name + "</li>" for target in TARGETS) + "</ul>").encode()
 server = HTTPServer(("127.0.0.1", PORT), Handler)
 server.used = False
 server.timeout = 1
 print("Local signing form: " + ORIGIN + "/" + TOKEN, flush=True)
 try:
  finished_at = None
  while finished_at is None or time.monotonic() - finished_at < 30:
   server.handle_request()
   if server.used and finished_at is None:
    finished_at = time.monotonic()
 finally:
  server.server_close()
