"""Local release integrity checks; no network services or real signing secrets."""
import importlib.util
from http.server import HTTPServer
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]


class ReleaseHelpers(unittest.TestCase):
 def test_modified_source_cache_cannot_produce_a_release_archive(self):
  lock = json.loads((ROOT / "mobile-native/native-source-lock.json").read_text(encoding="utf-8"))
  temporary_root = ROOT / "artifacts/mobile-release-helper-tests"
  temporary_root.mkdir(parents=True, exist_ok=True)
  with tempfile.TemporaryDirectory(dir=temporary_root) as directory:
   cache = Path(directory)
   (cache / lock["archives"][0]["file"]).write_bytes(b"altered source archive")
   output = cache / "release.zip"
   result = subprocess.run([sys.executable, str(ROOT / "mobile-native/scripts/package-native-sources.py"), "--cache", str(cache), "--output", str(output)], capture_output=True, text=True, timeout=20)
   self.assertNotEqual(result.returncode, 0)
   self.assertIn("checksum differs", result.stderr)
   self.assertFalse(output.exists())

 def signer(self, origin):
  spec = importlib.util.spec_from_file_location("signer", ROOT / "mobile-native/scripts/sign-vault-local.py")
  module = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(module)
  server = HTTPServer(("127.0.0.1", 0), module.Handler)
  server.timeout = 2
  server.used = False
  address = "http://127.0.0.1:" + str(server.server_port)
  module.ORIGIN = address
  thread = threading.Thread(target=server.handle_request, daemon=True)
  thread.start()
  try:
   request = urllib.request.Request(address + "/sign/" + module.TOKEN, data=b"key=not-a-key&password=fictional", headers={"Origin": origin})
   with self.assertRaises(urllib.error.HTTPError) as error:
    urllib.request.urlopen(request, timeout=5)
   self.assertEqual(error.exception.code, 403)
   self.assertFalse(server.used)
  finally:
   thread.join(timeout=5)
   server.server_close()

 def test_signer_rejects_foreign_origin_before_accepting_credentials(self):
  self.signer("https://untrusted.invalid")

 def test_signer_rejects_missing_origin_before_accepting_credentials(self):
  self.signer("")

 def test_finished_signing_page_never_renders_password_inputs_again(self):
  spec = importlib.util.spec_from_file_location("finished_signer", ROOT / "mobile-native/scripts/sign-vault-local.py")
  module = importlib.util.module_from_spec(spec)
  spec.loader.exec_module(module)
  server = HTTPServer(("127.0.0.1", 0), module.Handler)
  server.used = True
  server.completed = True
  thread = threading.Thread(target=server.handle_request, daemon=True)
  thread.start()
  try:
   with urllib.request.urlopen("http://127.0.0.1:" + str(server.server_port) + "/sign/" + module.TOKEN, timeout=5) as response:
    page = response.read()
   self.assertIn(b"signed and verified", page)
   self.assertNotIn(b"<input", page)
  finally:
   thread.join(timeout=5)
   server.server_close()


if __name__ == "__main__":
 unittest.main()
