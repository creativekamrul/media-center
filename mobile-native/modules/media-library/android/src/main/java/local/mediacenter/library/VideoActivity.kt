package local.mediacenter.library

import android.app.*
import android.os.*
import android.view.*
import android.widget.*
import android.graphics.Color
import android.content.Context
import android.media.AudioManager
import android.media.AudioFocusRequest
import android.media.AudioAttributes
import org.json.*
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

/** Private in-app video screen. Intent carries a one-use ID, never a token or stream URL. */
class VideoActivity:Activity(),SurfaceHolder.Callback {
 companion object {private val leases=ConcurrentHashMap.newKeySet<String>();fun hasOpenVideo()=leases.isNotEmpty();private val pending=ConcurrentHashMap<String,JellyfinMedia>();fun stage(m:JellyfinMedia):String=ProgressEditGuard.start{if(pending.size>=8){m.descriptor?.close();throw IllegalStateException("Close the existing video player before opening another")};val key=UUID.randomUUID().toString();pending[key]=m;leases.add(key);key};fun discard(key:String){leases.remove(key);pending.remove(key)?.descriptor?.close()}}
 private lateinit var media:JellyfinMedia
 private val audioManager by lazy { getSystemService(Context.AUDIO_SERVICE) as AudioManager }
 private val focus by lazy { AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build()).setOnAudioFocusChangeListener { change -> if(change<0&&engine!=0L){command("set","pause","yes");paused=true;if(loaded&&started){saveHistory();checkpoint();report("Progress")}} }.build() }
 private val videoClock=RelativePlaybackClock();private var checkpointAt=Double.NaN;private var engine=0L;private var loaded=false;private var ended=false;private var failed=false;private var started=false;private var opened=false;private var dragging=false;private var paused=false;private var position=0.0;private var duration=0.0;private var lastReport=0L;private var lastTick=0L;private var listened=0.0;private var counted=false;private var totalListened=0.0
 private val ui=Handler(Looper.getMainLooper());private val network=Executors.newSingleThreadExecutor()
 private var pipRequested=false;private lateinit var back:Button;private lateinit var status:TextView;private lateinit var seek:SeekBar;private lateinit var controls:LinearLayout;private lateinit var play:Button;private lateinit var history:ListeningStore
 private val tick=object:Runnable{override fun run(){
  if(engine==0L)return
  try{
   for(i in 0..32){when(NativeMpv.event(engine)){
    0->break
    8->{loaded=true;ended=false;failed=false;videoClock.awaitSeek(position,SystemClock.elapsedRealtime());if(position>0)command("seek",position.toString(),"absolute+exact");started=true;report("Playing")}
    -1->{loaded=false;failed=true;paused=true;saveHistory();checkpoint();if(started)report("Stopped",true);started=false;status.text=PlaybackFailure.message(NativeMpv.lastError(engine));play.text="Retry";play.isEnabled=true}
    -2->completePlayback()
   }}
   if(VideoCompletion.reached(loaded,ended,failed,NativeMpv.property(engine,"eof-reached")))completePlayback()
   if(loaded){
    if(!ended){position=videoClock.read(NativeMpv.property(engine,"time-pos"),SystemClock.elapsedRealtime());duration=NativeMpv.property(engine,"duration")?.toDoubleOrNull()?.takeIf{it.isFinite()&&it>0}?:duration;paused=NativeMpv.property(engine,"pause")=="yes"}
    if(!dragging)seek.progress=if(duration>0)(position/duration*10000).toInt() else 0
    val label="${clock(position)} / ${clock(duration)}"+(if(media.offline)" · Cached original" else "");if(status.text.toString()!=label)status.text=label;val transport=if(paused)"Play" else "Pause";if(play.text.toString()!=transport)play.text=transport;play.isEnabled=true
    val now=SystemClock.elapsedRealtime();if(!paused&&!ended&&lastTick>0)listened+=((now-lastTick)/1000.0).coerceIn(0.0,1.0);lastTick=now
    if(!paused&&!ended&&now-lastReport>10000){saveHistory();checkpoint();report("Progress");lastReport=now}
   }
  }catch(_:Throwable){loaded=false;failed=true;paused=true;runCatching{command("set","pause","yes")};saveHistory();checkpoint();if(started)report("Stopped",true);started=false;status.text="Video playback stopped unexpectedly";play.text="Retry";play.isEnabled=engine!=0L}
  if(play.contentDescription?.toString()!=play.text.toString())play.contentDescription=play.text;ui.postDelayed(this,250)
 }}
 override fun onCreate(state:Bundle?){super.onCreate(state);val found=pending.remove(intent.getStringExtra("session"));if(found==null){finish();return};media=found;history=ListeningStore(this);duration=media.item.optDouble("duration");position=media.item.optDouble("resume");window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  val root=FrameLayout(this);root.setBackgroundColor(Color.BLACK);val surface=SurfaceView(this);surface.holder.addCallback(this);root.addView(surface,FrameLayout.LayoutParams(-1,-1));surface.setOnClickListener{if(isInPictureInPictureMode)return@setOnClickListener;controls.visibility=if(controls.visibility==View.VISIBLE)View.GONE else View.VISIBLE}
  back=button("Back"){finish()};root.addView(back,FrameLayout.LayoutParams(-2,-2,Gravity.TOP or Gravity.START).apply{topMargin=dp(12);leftMargin=dp(12)})
  controls=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(16),dp(12),dp(16),dp(20));setBackgroundColor(0xa6000000.toInt())};val title=TextView(this).apply{text=media.item.optString("title");setTextColor(Color.WHITE);textSize=18f;typeface=font()};controls.addView(title);status=TextView(this).apply{typeface=font();text="Opening original stream…";setTextColor(Color.WHITE)};controls.addView(status)
  seek=SeekBar(this).apply{max=10000;contentDescription="Video position";setOnSeekBarChangeListener(object:SeekBar.OnSeekBarChangeListener{override fun onStartTrackingTouch(s:SeekBar){dragging=true};override fun onProgressChanged(s:SeekBar,p:Int,user:Boolean){if(user)status.text=clock(duration*p/10000)};override fun onStopTrackingTouch(s:SeekBar){if(loaded)seekTo(duration*s.progress/10000);dragging=false}})};controls.addView(seek,LinearLayout.LayoutParams(-1,dp(48)))
  play=button("Pause",true){val recovery=PlaybackRecovery.point(ended,loaded,false,failed,position);if(recovery!=null){if(audioManager.requestAudioFocus(focus)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED)reloadVideo(recovery,true)}else if(loaded&&(!paused||audioManager.requestAudioFocus(focus)==AudioManager.AUDIOFOCUS_REQUEST_GRANTED)){command("cycle","pause");paused=!paused;saveHistory();checkpoint();report("Progress")}}.apply{isEnabled=false}
  val previous=button("−5s"){seekTo(position-5)};val next=button("+5s"){seekTo(position+5)};val captions=button("Subtitles"){tracks("sub")};val audio=button("Audio"){tracks("audio")}
  if(resources.configuration.screenWidthDp>=600)addControlRow(listOf(previous,play,next,captions,audio)) else {addControlRow(listOf(previous,play,next));addControlRow(listOf(captions,audio))}
  val tools=mutableListOf(button("Chapters"){chapters()},button("Options"){options()})
  if(packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_PICTURE_IN_PICTURE))tools.add(button("Mini player"){enterPip()})
  addControlRow(tools);root.addView(controls,FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));setContentView(root);root.post { hideSystemBars() }
 }
 @Suppress("DEPRECATION")
 private fun hideSystemBars(){
  if(Build.VERSION.SDK_INT>=30){
   window.insetsController?.hide(WindowInsets.Type.systemBars())
   window.insetsController?.systemBarsBehavior=WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
  }else{
   window.decorView.systemUiVisibility=View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
  }
 }
 private fun enterPip(){if(!loaded)return;pipRequested=true;try{val width=NativeMpv.property(engine,"video-params/w")?.toIntOrNull()?:16;val height=NativeMpv.property(engine,"video-params/h")?.toIntOrNull()?:9;val ratio=(width.toDouble()/height.coerceAtLeast(1)).coerceIn(.42,2.39);val ok=enterPictureInPictureMode(PictureInPictureParams.Builder().setAspectRatio(android.util.Rational((ratio*1000).toInt(),1000)).build());if(!ok)pipRequested=false}catch(_:Exception){pipRequested=false;Toast.makeText(this,"Picture-in-picture is unavailable",Toast.LENGTH_SHORT).show()}}
 override fun onPictureInPictureModeChanged(active:Boolean,config:android.content.res.Configuration){super.onPictureInPictureModeChanged(active,config);pipRequested=false;controls.visibility=if(active)View.GONE else View.VISIBLE;back.visibility=if(active)View.GONE else View.VISIBLE}
 override fun onStart(){super.onStart();if(engine!=0L){ui.removeCallbacks(tick);lastTick=0;ui.post(tick)}}
 override fun onStop(){if(!isInPictureInPictureMode){ui.removeCallbacks(tick);lastTick=0;if(loaded){command("set","pause","yes");paused=true}};super.onStop()}
 private fun chapters(){if(!loaded)return;val count=(NativeMpv.property(engine,"chapter-list/count")?.toIntOrNull()?:0).coerceIn(0,2000);if(count==0){Toast.makeText(this,"No chapter markers available",Toast.LENGTH_SHORT).show();return};val labels=(0 until count).map{NativeMpv.property(engine,"chapter-list/$it/title")?.takeIf{t->t.isNotBlank()}?:"Chapter ${it+1}"};AlertDialog.Builder(this).setTitle("Chapters").setItems(labels.toTypedArray()){_,i->NativeMpv.property(engine,"chapter-list/$i/time")?.toDoubleOrNull()?.let{seekTo(it)}}.show()}
 private fun options(){if(!loaded)return;val labels=arrayOf("Speed: 0.75×","Speed: 1×","Speed: 1.25×","Speed: 1.5×","Speed: 2×","Subtitles smaller","Subtitles normal","Subtitles larger","Audio delay −0.1s","Audio delay +0.1s","Reset audio delay");AlertDialog.Builder(this).setTitle("Playback options").setItems(labels){_,i->when(i){in 0..4->command("set","speed",listOf("0.75","1","1.25","1.5","2")[i]);in 5..7->command("set","sub-scale",listOf("0.8","1","1.3")[i-5]);8,9->{val delay=NativeMpv.property(engine,"audio-delay")?.toDoubleOrNull()?:0.0;command("set","audio-delay",(delay+if(i==8)-.1 else .1).coerceIn(-10.0,10.0).toString())};10->command("set","audio-delay","0")}}.show()}
 private fun font()=com.facebook.react.common.assets.ReactFontManager.getInstance().getTypeface("DMSans_400Regular",android.graphics.Typeface.NORMAL,assets)
 private fun dp(v:Int)=(v*resources.displayMetrics.density).toInt()
 private fun addControlRow(buttons:List<Button>){
  val row=LinearLayout(this).apply{gravity=Gravity.CENTER;orientation=LinearLayout.HORIZONTAL}
  buttons.forEachIndexed{i,button->row.addView(button,LinearLayout.LayoutParams(0,dp(48),1f).apply{if(i>0)marginStart=dp(8)})}
  controls.addView(row,LinearLayout.LayoutParams(-1,-2).apply{topMargin=dp(8)})
 }
 private fun button(label:String,primary:Boolean=false,action:()->Unit)=Button(this).apply{
  typeface=font();textSize=14f;text=label;contentDescription=label;isAllCaps=false;minWidth=0;minimumWidth=0;minHeight=dp(48);minimumHeight=dp(48);setPadding(dp(12),0,dp(12),0)
  setTextColor(if(primary)0xff111820.toInt() else Color.WHITE)
  val shape=android.graphics.drawable.GradientDrawable().apply{cornerRadius=dp(12).toFloat();setColor(if(primary)0xffe4e9f2.toInt() else 0xee252930.toInt());if(!primary)setStroke(dp(1),0x40ffffff)}
  background=android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(if(primary)0x33000000 else 0x33ffffff),shape,null)
  setOnClickListener{try{action()}catch(_:Exception){Toast.makeText(this@VideoActivity,"That control is unavailable while the stream changes",Toast.LENGTH_SHORT).show()}}
 }

 private fun clock(v:Double):String{val n=v.coerceAtLeast(0.0).toInt();return if(n>=3600)"%d:%02d:%02d".format(n/3600,n/60%60,n%60) else "%d:%02d".format(n/60,n%60)}
 private fun command(vararg args:String){if(engine!=0L)check(NativeMpv.command(engine,arrayOf(*args))>=0)}
 private fun reloadVideo(at:Double,playing:Boolean){
  check(engine!=0L);val replay=ended;saveHistory();checkpoint();command("stop");for(i in 0..32){if(NativeMpv.event(engine)==0)break}
  loaded=false;ended=false;failed=false;started=false;position=at.coerceIn(0.0,duration);videoClock.reset(position);paused=!playing;lastTick=0;lastReport=SystemClock.elapsedRealtime()
  if(replay){totalListened=0.0;counted=false};play.isEnabled=false;status.text=if(media.offline)"Opening cached original…" else "Opening original stream…";command("set","pause",if(paused)"yes" else "no");command("set","http-header-fields",media.headers);command("loadfile",media.url,"replace")
 }
 private fun completePlayback(){if(ended)return;ended=true;failed=false;paused=true;duration=NativeMpv.property(engine,"duration")?.toDoubleOrNull()?.takeIf{it.isFinite()&&it>0}?:duration;position=duration;videoClock.reset(duration);lastTick=0;saveHistory();checkpoint();if(started)report("Stopped");started=false}
 private fun seekTo(value:Double){if(!loaded&&!ended&&!failed)return;val target=value.coerceIn(0.0,duration);if(ended||failed){reloadVideo(target,false);checkpoint();return};position=target;videoClock.awaitSeek(position,SystemClock.elapsedRealtime());command("seek",position.toString(),"absolute+exact");checkpoint();report("Progress")}
 private fun tracks(type:String){if(!loaded)return;val count=NativeMpv.property(engine,"track-list/count")?.toIntOrNull()?:0;val rows=(0 until count).filter{NativeMpv.property(engine,"track-list/$it/type")==type}.map{JSONObject().put("id",NativeMpv.property(engine,"track-list/$it/id")?.toIntOrNull()?:0).put("title",NativeMpv.property(engine,"track-list/$it/title")?:"").put("lang",NativeMpv.property(engine,"track-list/$it/lang")?:"Track")};val labels=mutableListOf<String>();val ids=mutableListOf<String>();if(type=="sub"){labels.add("Off");ids.add("no")};rows.forEach{labels.add(it.optString("title").ifBlank{it.optString("lang","Track")+" "+it.optInt("id")});ids.add(it.getInt("id").toString())};if(labels.isEmpty()){Toast.makeText(this,"No embedded tracks available",Toast.LENGTH_SHORT).show();return};AlertDialog.Builder(this).setTitle(if(type=="sub")"Subtitles" else "Audio tracks").setItems(labels.toTypedArray()){_,i->command("set",if(type=="sub")"sid" else "aid",ids[i])}.show()}
 override fun surfaceCreated(holder:SurfaceHolder){try{engine=NativeMpv.createVideo(applicationContext,holder.surface);check(engine!=0L);paused=if(opened)paused||audioManager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED else audioManager.requestAudioFocus(focus)!=AudioManager.AUDIOFOCUS_REQUEST_GRANTED;opened=true;command("set","pause",if(paused)"yes" else "no");command("set","http-header-fields",media.headers);if(!ended&&!failed)command("loadfile",media.url,"replace") else {play.text=if(failed)"Retry" else "Play";play.isEnabled=true};ui.post(tick)}catch(_:Throwable){status.text="The native video engine could not start"}}
 override fun surfaceChanged(holder:SurfaceHolder,format:Int,width:Int,height:Int){command("set","android-surface-size","${width}x$height")}
 override fun surfaceDestroyed(holder:SurfaceHolder){ui.removeCallbacks(tick);saveHistory();checkpoint();if(started)report("Stopped");started=false;loaded=false;if(engine!=0L){NativeMpv.destroy(engine);engine=0L}}
 override fun onPause(){if(!isInPictureInPictureMode&&!pipRequested&&engine!=0L&&loaded&&!ended&&!failed){command("set","pause","yes");paused=true;saveHistory();checkpoint();report("Progress")};super.onPause()}
 private fun checkpoint(){if(!ProgressHeartbeat.changed(checkpointAt,position))return;checkpointAt=position;getSharedPreferences("jellyfin_checkpoints",Context.MODE_PRIVATE).edit().putString(media.account.getString("id")+":"+media.id,JSONObject().put("position",position).put("offline",media.offline).put("source",media.source).put("kind",media.item.getString("kind")).put("duration",duration).put("updatedAt",System.currentTimeMillis()).toString()).apply()}
 private fun saveHistory(){if(listened<=0)return;val data=JSONObject(media.item.toString()).put("account",media.account.getString("id")).put("id",media.id);totalListened+=listened;val count=!counted&&totalListened>=30;try{history.add(JSONArray(listOf(media.account.getString("id"),media.item.getString("kind"),media.id)).toString(),data,listened,count);if(count)counted=true;listened=0.0}catch(_:Exception){}}
 private fun report(event:String,failed:Boolean=false){val p=position;val pause=paused;if(media.offline||network.isShutdown)return;ProgressEditGuard.report(network){try{Jellyfin.report(media,event,p,pause,failed)}catch(_:Exception){ui.post{Toast.makeText(this,"Progress sync failed; local position kept",Toast.LENGTH_SHORT).show()}}}}
 override fun onDestroy(){ui.removeCallbacks(tick);if(engine!=0L){saveHistory();checkpoint();if(started)report("Stopped");started=false;loaded=false;NativeMpv.destroy(engine);engine=0L};if(::media.isInitialized)runCatching{media.descriptor?.close()};if(::history.isInitialized)history.close();audioManager.abandonAudioFocusRequest(focus);network.shutdown();intent.getStringExtra("session")?.let{leases.remove(it)};super.onDestroy()}
}
