package local.mediacenter.library

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.WindowManager
import android.widget.TextView
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.json.JSONObject

/** Visible, separate-UID native-engine test. All originals are generated silence. */
class TransitionTestActivity : Activity() {
 override fun onCreate(state: Bundle?) {
  super.onCreate(state)
  check(packageName == "local.mediacenter.library.test")
  window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  val label = TextView(this).apply { text = "Generated native transition acceptance" }
  setContentView(label)
  Handler(Looper.getMainLooper()).postDelayed({ Thread {
   val report = JSONObject()
   val files = listOf("a", "b").map { File(cacheDir, "transition-$it.wav") }
   try {
    val rate = 44100
    val wave = ByteBuffer.allocate(44 + rate * 8 * 2).order(ByteOrder.LITTLE_ENDIAN)
    wave.put("RIFF".toByteArray()).putInt(wave.capacity() - 8).put("WAVEfmt ".toByteArray()).putInt(16)
     .putShort(1).putShort(1).putInt(rate).putInt(rate * 2).putShort(2).putShort(16)
     .put("data".toByteArray()).putInt(wave.capacity() - 44)
    files.forEach { it.writeBytes(wave.array()) }
    val entries = files.mapIndexed { index, file ->
     Playable("transition-fixture", "generated-$index", "Generated $index", "Generated fixture", "Generated originals", "", file.path, 8.0, suffix = "wav")
    }
    val prefs = getSharedPreferences("media_library", MODE_PRIVATE)
    check(prefs.edit().putString("ui", "{}").putString("audio", "{}").commit())
    fun snapshot() = JSONObject(Playback.state())
    fun waitFor(seconds: Long = 15, predicate: (JSONObject) -> Boolean): JSONObject {
     val until = SystemClock.elapsedRealtime() + seconds * 1000
     while (SystemClock.elapsedRealtime() < until) {
      val value = snapshot()
      check(value.optString("error").isBlank()) { value.optString("error") }
      if (predicate(value)) return value
      Thread.sleep(25)
     }
     error("Native transition checkpoint timed out: " + snapshot().toString())
    }
    fun stop() {
     Playback.control("stop")
     waitFor { !it.has("track") && !it.optBoolean("loaded") }
    }
    fun begin(crossfade: Int) {
     check(prefs.edit().putString("musicTransitions", JSONObject().put("gapless", true).put("crossfade", crossfade).toString()).commit())
     Playback.play(applicationContext, entries, 0)
     waitFor { it.optBoolean("loaded") && it.optBoolean("playing") && it.optInt("index") == 0 }
     Playback.control("volume", 0.0)
    }
    begin(2)
    waitFor { it.optBoolean("crossfading") }
    val fadeStart = SystemClock.elapsedRealtime()
    Playback.control("pause")
    val paused = waitFor { !it.optBoolean("playing") && it.optBoolean("crossfading") }
    val pauseStart = SystemClock.elapsedRealtime()
    Thread.sleep(500)
    val held = snapshot()
    check(held.optInt("index") == 0 && !held.optBoolean("playing"))
    check(kotlin.math.abs(held.getDouble("position") - paused.getDouble("position")) < .2)
    Playback.control("resume")
    waitFor { it.optBoolean("playing") }
    val pauseEnd = SystemClock.elapsedRealtime()
    val promoted = waitFor { it.optInt("index") == 1 && it.optBoolean("loaded") }
    val activeFadeSeconds = (SystemClock.elapsedRealtime() - fadeStart - (pauseEnd - pauseStart)) / 1000.0
    check(activeFadeSeconds in 1.2..3.0) { "Unexpected fade envelope: $activeFadeSeconds" }
    check(promoted.getDouble("position") in 1.2..4.0) { "Incoming decoder restarted instead of continuing" }
    report.put("crossfadePauseResume", true).put("activeFadeSeconds", activeFadeSeconds)
     .put("incomingPositionAfterPromotion", promoted.getDouble("position"))
    stop()
    begin(2)
    waitFor { it.optBoolean("crossfading") }
    stop()
    Thread.sleep(750)
    check(!snapshot().has("track"))
    report.put("stopCancelsOverlap", true)
    begin(0)
    val next = waitFor { it.optInt("index") == 1 && it.optBoolean("loaded") && it.optBoolean("playing") }
    check(!next.optBoolean("crossfading"))
    report.put("gaplessNativeAdvance", true)
    stop()
    // Use the existing source-derived local fixture for saved-music continuation.
    val source = "continuation-fixture"
    EncryptedAccounts.write(this, source, JSONObject().put("id", source).put("type", "navidrome")
     .put("name", "Generated continuation fixture").put("url", "http://127.0.0.1:18547/music")
     .put("username", "fixture-user").put("password", "fixture-secret").put("allowHttp", true))
    check(prefs.edit().putString("ui", JSONObject().put("automaticContinuation", true).toString()).commit())
    Playback.resolve = { NativeTrackResolver.resolve(applicationContext, it, false, false) }
    fun queue() = JSONObject(Playback.clientState(-1)).getJSONArray("queue")
    Playback.play(applicationContext, listOf(entries[0].copy(account = source, id = "mc-ahead-current")), 0)
    waitFor { it.optInt("index") == 0 && queue().length() == 11 }
    val continuation = queue()
    val identities = (0 until continuation.length()).map { continuation.getJSONObject(it).let { row -> row.getString("account") to row.getString("id") } }
    check(identities.toSet().size == 11 && identities.all { it.first == source })
    Playback.control("clear-upcoming")
    waitFor { queue().length() == 1 }
    Thread.sleep(1000)
    check(queue().length() == 1)
    report.put("nativeSavedMusicContinuation", true).put("continuationHasNoDuplicates", true)
     .put("clearUpcomingSuppressesContinuation", true)
    stop()
    Playback.setContinuation(false)
    Playback.resolve = null
    Playback.idleProgressEdit { files.forEach { check(it.delete()) } }
    report.put("passed", true)
   } catch (e: Throwable) {
    Playback.control("stop")
    report.put("passed", false).put("exception", e.javaClass.simpleName).put("message", e.message)
   }
   File(filesDir, "transition-result.json").writeText(report.toString())
   runOnUiThread { label.text = report.toString() }
  }.start() }, 500)
 }
}
