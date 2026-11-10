package local.mediacenter.library

import android.os.SystemClock
import java.util.concurrent.Executors

/** File-loaded starts a session; changing items closes it with its last known position. */
object JellyfinProgress {
 private val network=Executors.newSingleThreadExecutor()
 private val heartbeat=ProgressHeartbeat(10000)
 private var current:JellyfinMedia?=null
 private var at=0.0;private var paused=true;private var last=0L
 @Volatile var error="";private set
 fun observe(media:JellyfinMedia?,position:Double,loaded:Boolean,playing:Boolean){
  val now=SystemClock.elapsedRealtime()
  if(current!==media){current?.let{send(it,"Stopped",at,paused)};current=null;error=""}
  if(media==null||!loaded)return
  if(current==null){current=media;send(media,"Playing",position,!playing);last=now;heartbeat.reset(position,now,playing)}
  else if(heartbeat.due(position,playing,now)){send(media,"Progress",position,!playing);last=now}
  at=position;paused=!playing
 }
 fun failed(media:JellyfinMedia?){val old=current;if(old!=null&&old===media){send(old,"Stopped",at,true,true);current=null}}
 private fun send(media:JellyfinMedia,event:String,position:Double,paused:Boolean,failed:Boolean=false){ProgressEditGuard.report(network){try{Jellyfin.report(media,event,position,paused,failed)}catch(_:Exception){error="Jellyfin progress could not be synchronized."}}}
}
