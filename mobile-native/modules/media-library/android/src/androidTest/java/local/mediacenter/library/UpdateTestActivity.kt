package local.mediacenter.library

import android.app.Activity
import android.os.Bundle
import android.widget.TextView
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLConnection
import java.net.URLStreamHandler
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

/** Test APK only. Exercises the production updater with an in-process GitHub transport.
 * Real APK parsing, certificate checks, FileProvider and the Android installer remain real.
 * No endpoint override or testing switch exists in the production application.
 */
class UpdateTestActivity : Activity() {
 override fun onCreate(state: Bundle?) {
  super.onCreate(state)
  check(packageName == "local.mediacenter.library.test")
  val label = TextView(this).apply { text = "Disposable updater acceptance" }
  setContentView(label)
  val mode = intent.getStringExtra("mode") ?: "valid"
  check(mode in setOf("valid", "checksum", "truncated", "foreign-redirect", "wrong-package", "wrong-signer", "old-code"))
  Thread {
   val result = JSONObject().put("mode", mode)
   try {
    val apk = File(filesDir, "update-input.apk")
    check(apk.isFile)
    val hash = MessageDigest.getInstance("SHA-256").digest(apk.readBytes()).joinToString("") { "%02x".format(it) }
    val download = "https://github.com/creativekamrul/media-center/releases/download/mobile-fixture/Media-Center-Mobile-1.0.1-arm64.apk"
    val asset = JSONObject().put("name", "Media-Center-Mobile-1.0.1-arm64.apk")
     .put("browser_download_url", download).put("size", apk.length())
     .put("digest", "sha256:" + if (mode == "checksum") "0".repeat(64) else hash)
    val feed = JSONArray().put(JSONObject().put("draft", false).put("prerelease", false)
     .put("name", "Disposable update").put("tag_name", "mobile-fixture").put("body", "Generated acceptance only")
     .put("assets", JSONArray().put(asset))).toString().toByteArray()
    URL.setURLStreamHandlerFactory { scheme ->
     if (scheme != "https") null else object : URLStreamHandler() {
      override fun openConnection(url: URL): URLConnection = object : HttpURLConnection(url) {
       override fun connect() {}
       override fun disconnect() {}
       override fun usingProxy() = false
       override fun getResponseCode(): Int = when {
        url.host == "api.github.com" && url.path == "/repos/creativekamrul/media-center/releases" -> 200
        url.toString() == download -> if (mode == "foreign-redirect") 302 else 200
        else -> error("Unexpected fixture request")
       }
       override fun getHeaderField(name: String?): String? =
        if (name.equals("Location", true) && mode == "foreign-redirect") "https://untrusted.invalid/update.apk" else null
       override fun getInputStream(): java.io.InputStream = when {
        url.host == "api.github.com" -> feed.inputStream()
        url.toString() == download && mode == "truncated" -> apk.readBytes().let { it.copyOf(it.size - 1).inputStream() }
        url.toString() == download -> apk.inputStream()
        else -> error("Unexpected fixture download")
       }
      }
     }
    }
    val response = JSONObject(MobileUpdates.check(applicationContext))
    check(response.getBoolean("available"))
    val message = MobileUpdates.install(applicationContext)
    check(mode == "valid") { "Invalid update unexpectedly accepted" }
    check(message == "Confirm the update in the Android installer.")
    result.put("passed", true).put("installerRequested", true)
   } catch (e: Throwable) {
    val expected = when (mode) {
     "checksum" -> e.message == "Update checksum mismatch"
     "truncated", "foreign-redirect" -> e is IllegalArgumentException
     "wrong-package" -> e.message == "Update is for a different app"
     "wrong-signer" -> e.message == "Update signature does not match this installation."
     "old-code" -> e.message == "This version is already installed or newer."
     else -> false
    }
    result.put("passed", expected).put("exception", e.javaClass.simpleName).put("message", e.message)
    result.put("rejectedFileRemoved", !File(cacheDir, "updates/update.apk").exists())
   }
   File(filesDir, "update-result.json").writeText(result.toString())
   runOnUiThread { label.text = result.toString() }
  }.start()
 }
}
