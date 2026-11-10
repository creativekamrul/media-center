package local.mediacenter.library

import android.app.Activity
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView

/** Isolated test APK: real OS focus interruption, without media or application-data access. */
class FocusTestActivity : Activity() {
 private lateinit var audio: AudioManager
 private var request: AudioFocusRequest? = null
 private val main = Handler(Looper.getMainLooper())
 override fun onCreate(state: Bundle?) {
  super.onCreate(state)
  check(packageName == "local.mediacenter.library.test")
  setContentView(TextView(this).apply { text = "Temporary audio-focus acceptance check" })
  audio = getSystemService(AudioManager::class.java)
 }
 override fun onResume() {
  super.onResume()
  if (request != null) return
  main.postDelayed({
   if (isFinishing || isDestroyed) return@postDelayed
   val next = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
    .setOnAudioFocusChangeListener { }.build()
   request = next
   val granted = audio.requestAudioFocus(next) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
   getSharedPreferences("focus_acceptance", MODE_PRIVATE).edit().putBoolean("granted", granted).putBoolean("released", false).commit()
   main.postDelayed({ finish() }, 6000)
  }, 500)
 }
 override fun onDestroy() {
  main.removeCallbacksAndMessages(null)
  request?.let { audio.abandonAudioFocusRequest(it) }
  getSharedPreferences("focus_acceptance", MODE_PRIVATE).edit().putBoolean("released", request != null).commit()
  super.onDestroy()
 }
}
