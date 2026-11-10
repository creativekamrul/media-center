package local.mediacenter.library
import android.app.*
import android.content.*
import android.media.*
import android.media.session.*
import android.os.*

class PlaybackService:Service(){
 companion object {@Volatile var artworkPixels:Int=0;private set}

 private var artwork:android.graphics.Bitmap?=null
 private var artworkKey="";private var artGeneration=0L;private var destroyed=false
 private val artWorker=java.util.concurrent.ThreadPoolExecutor(1,1,0L,java.util.concurrent.TimeUnit.MILLISECONDS,java.util.concurrent.ArrayBlockingQueue<Runnable>(1),java.util.concurrent.ThreadPoolExecutor.DiscardOldestPolicy())
 private fun loadArtwork(t:org.json.JSONObject?){
  val account=t?.optString("account").orEmpty();val cover=t?.optString("coverArt").orEmpty().ifBlank{t?.optString("id").orEmpty()};val key=account+":"+cover+":"+CustomArtwork.version(applicationContext,account.ifBlank{"none"},cover.ifBlank{"none"})
  if(key==artworkKey)return;artworkKey=key;val token=++artGeneration;artwork=null;artworkPixels=0
  if(account.isBlank()||cover.isBlank())return
  artWorker.execute{val bitmap=try{val uri=android.net.Uri.parse(NativeArtwork.read(applicationContext,account,cover,384));contentResolver.openInputStream(uri)?.use{android.graphics.BitmapFactory.decodeStream(it)}?.let{val scale=320.0/maxOf(it.width,it.height);android.graphics.Bitmap.createScaledBitmap(it,(it.width*scale).toInt().coerceAtLeast(1),(it.height*scale).toInt().coerceAtLeast(1),true)}}catch(_:Exception){null}
   main.post{if(!destroyed&&token==artGeneration){artwork=bitmap;artworkPixels=bitmap?.width?:0;lastMetadata="";lastNotification="";update()}}
  }
 }

 private val transportUpdates=MediaTransportThrottle()
 private lateinit var session:MediaSession
 private lateinit var audio:AudioManager
 private var focus:AudioFocusRequest?=null
 private lateinit var wake:PowerManager.WakeLock
 private val main=Handler(Looper.getMainLooper());private var lastNotification="";private var lastMetadata="";private val updatePending=java.util.concurrent.atomic.AtomicBoolean(false)
 private val noisy=object:BroadcastReceiver(){override fun onReceive(c:Context?,i:Intent?){Playback.control("pause")}}
 override fun onCreate(){super.onCreate();wake=getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"MediaCenter:Playback");wake.setReferenceCounted(false);audio=getSystemService(AudioManager::class.java)
  getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("playback","Media playback",NotificationManager.IMPORTANCE_LOW))
  session=MediaSession(this,"Media Center");session.setCallback(object:MediaSession.Callback(){
   override fun onPlay(){Playback.control("resume")};override fun onPause(){Playback.control("pause")};override fun onSkipToNext(){Playback.headset(true)};override fun onSkipToPrevious(){Playback.headset(false)};override fun onSeekTo(pos:Long){Playback.control("seek",pos/1000.0)};override fun onStop(){Playback.control("stop");stopSelf()}
  });session.isActive=true
  startForeground(51,notification())
  val listener=AudioManager.OnAudioFocusChangeListener{change->if(change<0)Playback.control("pause")}
  focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()).setOnAudioFocusChangeListener(listener).build()
  Playback.requestFocus={audio.requestAudioFocus(focus!!)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED}
  Playback.control("resume")
  if(Build.VERSION.SDK_INT>=33)registerReceiver(noisy,IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),RECEIVER_NOT_EXPORTED) else registerReceiver(noisy,IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY))
  Playback.onState={if(updatePending.compareAndSet(false,true))main.post{updatePending.set(false);update()}}
 }
 private fun action(name:String,label:String,icon:Int):Notification.Action {val intent=Intent(this,PlaybackService::class.java).setAction(name);return Notification.Action.Builder(icon,label,PendingIntent.getService(this,name.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)).build()}
 private fun notification():Notification {
  val s=org.json.JSONObject(Playback.state());val t=s.optJSONObject("track");val open=packageManager.getLaunchIntentForPackage(packageName)
  val content=open?.let{PendingIntent.getActivity(this,0,it,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)}
  return Notification.Builder(this,"playback").setSmallIcon(R.drawable.ic_media_center_notification).setContentTitle(t?.optString("title")?:"Media Center").setContentText(t?.optString("artist")?:"Preparing playback").setLargeIcon(artwork).setContentIntent(content).setVisibility(Notification.VISIBILITY_PUBLIC).setOnlyAlertOnce(true).setOngoing(s.optBoolean("playing"))
   .addAction(action("previous","Previous",android.R.drawable.ic_media_previous)).addAction(action("toggle",if(s.optBoolean("playing"))"Pause" else "Play",if(s.optBoolean("playing"))android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)).addAction(action("next","Next",android.R.drawable.ic_media_next)).setStyle(Notification.MediaStyle().setMediaSession(session.sessionToken).setShowActionsInCompactView(0,1,2)).build()
 }
 private fun update(){val s=org.json.JSONObject(Playback.state());if(s.optBoolean("playing")){if(!wake.isHeld)wake.acquire(600000)}else if(wake.isHeld)wake.release();val t=s.optJSONObject("track")
  val playing=s.optBoolean("playing");val position=s.optDouble("position",0.0).takeIf{it.isFinite()}?.coerceAtLeast(0.0)?:0.0;val speed=s.optDouble("speed",1.0).takeIf{it.isFinite()&&it>0}?:1.0
  if(transportUpdates.publish(MediaTransportIdentity.key(s),playing,position,speed,SystemClock.elapsedRealtime()))session.setPlaybackState(PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_SEEK_TO or PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_STOP).setState(if(s.optBoolean("playing"))PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,(position*1000).toLong(),if(playing)speed.toFloat() else 0f).build())
  loadArtwork(t)
  val metadataKey=MediaTransportIdentity.key(s)+s.optDouble("duration",0.0)
  if(metadataKey!=lastMetadata){lastMetadata=metadataKey;session.setMetadata(MediaMetadata.Builder().putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART,artwork).putBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON,artwork).putString(MediaMetadata.METADATA_KEY_TITLE,t?.optString("title")?:"").putString(MediaMetadata.METADATA_KEY_ARTIST,t?.optString("artist")?:"").putString(MediaMetadata.METADATA_KEY_ALBUM,t?.optString("album")?:"").putLong(MediaMetadata.METADATA_KEY_DURATION,(s.optDouble("duration",0.0)*1000).toLong()).build())}
  val notificationKey=metadataKey+s.optBoolean("playing")
  if(notificationKey!=lastNotification){lastNotification=notificationKey;getSystemService(NotificationManager::class.java).notify(51,notification())}
 }
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int{intent?.action?.let{if(it=="next"||it=="previous")Playback.headset(it=="next") else Playback.control(it)};return START_NOT_STICKY}
 override fun onBind(intent:Intent?)=session.controller.sessionToken.let{null}
 override fun onDestroy(){destroyed=true;artGeneration++;artWorker.shutdownNow();Playback.onState=null;main.removeCallbacksAndMessages(null);Playback.requestFocus=null;Playback.control("stop");if(wake.isHeld)wake.release();focus?.let{audio.abandonAudioFocusRequest(it)};unregisterReceiver(noisy);session.release();super.onDestroy()}
}
