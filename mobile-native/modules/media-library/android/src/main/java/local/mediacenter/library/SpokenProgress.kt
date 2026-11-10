package local.mediacenter.library

import android.content.Context
import android.os.SystemClock
import org.json.JSONObject
import java.util.concurrent.Executors

data class SpokenSession(val account:JSONObject,val target:SpokenTarget,val id:String,val persist:(JSONObject)->Unit)

/** Retains checkpoints, but never retries an uncertain listening-time delta. */
object SpokenProgress {
 private val network=Executors.newSingleThreadExecutor()
 private var context:Context?=null
 @Volatile private var current:SpokenSession?=null
 private val heartbeat=ProgressHeartbeat(15000);private var checkpointAt=Double.NaN
 private var at=0.0;private var length=0.0;private var listened=0.0
 private var lastTick=0L;private var lastSave=0L;private var lastSync=0L;private var wasPlaying=false
 @Volatile var error="";private set
 fun configure(c:Context){context=c.applicationContext}
 fun observe(session:SpokenSession?,position:Double,duration:Double,playing:Boolean){
  val now=SystemClock.elapsedRealtime()
  if(current!==session){flush(true);current=session;listened=0.0;wasPlaying=false;lastTick=now;lastSave=0;lastSync=now;checkpointAt=Double.NaN;heartbeat.reset(position,now);error=""}
  if(session==null)return
  if(wasPlaying)listened+=((now-lastTick)/1000.0).coerceIn(0.0,2.0)
  lastTick=now;at=position;length=duration
  if(now-lastSave>=5000||wasPlaying!=playing){checkpoint();lastSave=now}
  if(heartbeat.due(at,playing,now)){flush(false);lastSync=now}
  wasPlaying=playing
 }
 private fun checkpoint(){val s=current?:return;val c=context?:return;if(!ProgressHeartbeat.changed(checkpointAt,at))return;checkpointAt=at
  c.getSharedPreferences("spoken_checkpoints",Context.MODE_PRIVATE).edit().putString(s.target.key(s.account.getString("id")),JSONObject().put("currentTime",at).put("duration",length).put("updatedAt",System.currentTimeMillis()).toString()).apply()
 }
 private fun flush(close:Boolean){val s=current?:return;checkpoint()
  val body=if(close&&!heartbeat.needsPosition(at,listened,wasPlaying))JSONObject() else JSONObject().put("currentTime",at).put("duration",length).put("timeListened",listened);listened=0.0
  ProgressEditGuard.report(network){try{Audiobookshelf.request(s.account,"api/session/${ProviderHttp.segment(s.id)}/${if(close)"close" else "sync"}",s.persist,body)}catch(_:Exception){if(current===s)error="Server progress could not be confirmed. Your local checkpoint is kept; uncertain listening time will not be replayed."}}
 }
}
