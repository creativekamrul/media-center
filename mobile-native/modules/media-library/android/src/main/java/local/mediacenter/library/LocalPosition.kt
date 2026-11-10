package local.mediacenter.library
import android.content.Context
import org.json.JSONObject
/** Offline listening preserves a local resume point without blindly uploading server deltas. */
object LocalPosition {
 private var savedPosition=Double.NaN;private var key="";private var position=0.0;private var last=0L;private var playing=false
 fun read(c:Context,key:String):Double=try{JSONObject(c.getSharedPreferences("spoken_checkpoints",Context.MODE_PRIVATE).getString(key,"{}")!!).optDouble("currentTime",0.0)}catch(_:Exception){0.0}
 fun observe(c:Context,current:String,at:Double,active:Boolean){
  val now=android.os.SystemClock.elapsedRealtime()
  if(key!=current){save(c);key=current;savedPosition=Double.NaN;last=0};position=at
  if(current.isNotEmpty()&&(!savedPosition.isFinite()||now-last>5000||playing!=active)){save(c);last=now};playing=active
 }
 private fun save(c:Context){if(key.isNotEmpty()&&ProgressHeartbeat.changed(savedPosition,position)){savedPosition=position;c.getSharedPreferences("spoken_checkpoints",Context.MODE_PRIVATE).edit().putString(key,JSONObject().put("currentTime",position).put("updatedAt",System.currentTimeMillis()).put("offline",true).toString()).apply()}}
}
