package local.mediacenter.library
import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.TextView

/** Test-APK-only visible bootstrap. The real production DownloadService owns the transfer. */
class TransferTestActivity:Activity(){
 override fun onCreate(state:Bundle?){super.onCreate(state);check(packageName=="local.mediacenter.library.test");setContentView(TextView(this).apply{text="Disposable transfer lifecycle acceptance"});OfflineStore.attach(applicationContext){NativeTrackResolver.resolve(applicationContext,it,false)}}
 override fun onResume(){super.onResume();Handler(Looper.getMainLooper()).postDelayed({
  try{OfflineStore.control(applicationContext,"service-active","resume")}catch(_:Exception){getSharedPreferences("service_fixture",MODE_PRIVATE).edit().putBoolean("bootstrapFailed",true).commit()}
  Handler(Looper.getMainLooper()).postDelayed({finish()},1000)
 },250)}
}
