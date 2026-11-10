package local.mediacenter.library
import android.content.Context
import android.content.Intent
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

data class Playable(val account:String,val id:String,val title:String,val artist:String,val album:String,val cover:String,val url:String,val duration:Double,val headers:String="",val suffix:String="audio",val descriptor:android.os.ParcelFileDescriptor?=null,val kind:String="music",val parts:List<AudioPart> = emptyList(),val startPosition:Double=0.0,val session:SpokenSession?=null,val jellyfin:JellyfinMedia?=null,val descriptors:List<android.os.ParcelFileDescriptor> = emptyList(),val localProgressKey:String="",val fallbackFrom:String="",val spokenTarget:SpokenTarget?=null)
object Playback {
 private val worker=Executors.newSingleThreadScheduledExecutor()
 private val resolver=Executors.newFixedThreadPool(2)
 private data class Prepared(val from:Playable,val next:Playable,val index:Int,val epoch:Long,val entry:Long=-1,val engine:Long=0,var ready:Boolean=false,var fadeAt:Long=0,var clock:MusicFadeClock?=null,var fadeLength:Double=0.0)
 private var transitions=MusicTransitions();private var prepared:Prepared?=null;private var stageEpoch=0L;private var stageBusy=false;private var stageAttempt=-1L;private var transitionNotice="";private var clearPlaylistOnLoad=false;private var observedDuration=0.0;private var userVolume=100.0;private var fadeTimer:java.util.concurrent.ScheduledFuture<*>?=null
 fun getTransitions()=transitions.json().toString()
 internal fun setTransitions(value:MusicTransitions){try{worker.submit{pollEvents();cancelPreparation();transitions=value;configureTransitions()}.get()}catch(e:java.util.concurrent.ExecutionException){throw(e.cause?:e)}}
 private fun configureTransitions(){if(handle!=0L)command("set","options/gapless-audio",if(transitions.gapless&&transitions.crossfade==0.0)"weak" else "no")}
 private fun stopFadeTimer(){fadeTimer?.cancel(false);fadeTimer=null}
 // Fade gains use the monotonic clock; overdue timer invocations must not catch up in a burst.
 private fun startFadeTimer(){if(fadeTimer==null)fadeTimer=worker.scheduleWithFixedDelay({try{fadeStep()}catch(_:Throwable){cancelPreparation();transitionNotice="Crossfade stopped; ordinary playback is available."}},25,25,TimeUnit.MILLISECONDS)}
 private fun cancelPreparation(){stopFadeTimer();stageEpoch++;stageBusy=false;stageAttempt=-1L;val old=prepared;prepared=null;clearPlaylistOnLoad=false;if(old?.engine!=null&&old.engine!=0L)NativeMpv.destroy(old.engine);if(handle!=0L){runCatching{command("playlist-clear")};if(old?.fadeAt!=null&&old.fadeAt>0)runCatching{command("set","volume",userVolume.toString())}}}
 private fun valid(p:Prepared)=p.epoch==stageEpoch&&queue.getOrNull(index)===p.from&&queue.getOrNull(p.index)===p.next&&!sleepAtEnd&&endAt==0L
 private fun prepareNext(){
  if(!loaded||paused||ended||resolving||prepared!=null||stageBusy||stageAttempt==stageEpoch||(!transitions.gapless&&transitions.crossfade<=0)||outputRecovery.used)return
  val from=queue.getOrNull(index)?:return;val nextIndex=MusicTransitionPlan.next(index,queue.size,repeat,shuffle)?:return;val next=queue[nextIndex]
  // fd:// can share an open-file offset when two decoders read the same descriptor.
  // Repeating that occurrence uses the ordinary reload path instead of a second reader.
  if(MusicTransitionPlan.sharedDescriptor(from===next,from.descriptor!=null||from.descriptors.isNotEmpty()))return
  if(!MusicTransitionPlan.eligible(from.kind,next.kind,from.parts.isNotEmpty()||next.parts.isNotEmpty(),next.startPosition,sleepAtEnd||endAt>0))return
  val epoch=stageEpoch;stageAttempt=epoch;stageBusy=true
  resolver.execute{try{val result=if(next.url.isNotEmpty())next else requireNotNull(resolve)(next);worker.execute ready@{
   if(epoch!=stageEpoch||queue.getOrNull(index)!==from||queue.getOrNull(nextIndex)!==next){if(result!==next)release(result);return@ready};stageBusy=false
   if(!MusicTransitionPlan.eligible(from.kind,result.kind,from.parts.isNotEmpty()||result.parts.isNotEmpty(),result.startPosition,sleepAtEnd||endAt>0)){if(result!==next)release(result);return@ready}
   queue=queue.mapIndexed{i,t->if(i==nextIndex)result else t}
   try{
    if(transitions.crossfade>0){val h=NativeMpv.create(requireNotNull(context));check(h!=0L);try{applyAudioTo(h,result.kind);check(NativeMpv.command(h,arrayOf("set","options/gapless-audio","no"))>=0);check(NativeMpv.command(h,arrayOf("set","volume","0"))>=0);check(NativeMpv.command(h,arrayOf("set","speed",(NativeMpv.property(handle,"speed")?:"1")))>=0);check(NativeMpv.command(h,arrayOf("set","pause","yes"))>=0);check(NativeMpv.command(h,arrayOf("set","demuxer-max-bytes","8MiB"))>=0);check(NativeMpv.load(h,result.url,false,result.headers)>=0);prepared=Prepared(from,result,nextIndex,epoch,engine=h)}catch(e:Throwable){NativeMpv.destroy(h);throw e}}
    else {command("set","options/prefetch-playlist",if(MusicTransitionPlan.prefetch(from.account,from.headers,result.account,result.headers))"yes" else "no");check(NativeMpv.load(handle,result.url,true,result.headers)>=0);val count=NativeMpv.property(handle,"playlist-count")!!.toInt();val id=NativeMpv.property(handle,"playlist/${count-1}/id")!!.toLong();prepared=Prepared(from,result,nextIndex,epoch,entry=id)}
    transitionNotice=""
   }catch(_:Throwable){transitionNotice="Next track could not be prepared; normal playback will retry.";runCatching{command("playlist-clear")}}
   publish()
  }}catch(_:Throwable){worker.execute{if(epoch==stageEpoch){stageBusy=false;transitionNotice="Next track could not be prepared; normal playback will retry.";publish()}}}}
 }
 private fun adoptGapless(p:Prepared){
  JellyfinProgress.observe(null,0.0,false,false)
  index=p.index;generation++;stageEpoch++;prepared=null;stageAttempt=-1;loaded=false;ended=false;paused=NativeMpv.property(handle,"pause")=="yes";pendingSeek=0.0;partIndex=0;observedDuration=p.next.duration;relativeClock.reset(0.0);diagnosticSource=p.next;ListeningHistory.restart();clearPlaylistOnLoad=true;error="";android.util.Log.i("MCTransition","gapless-handoff")
 }
 private fun promoteFade(p:Prepared,naturalEnd:Boolean=false){
  stopFadeTimer()
  JellyfinProgress.observe(p.from.jellyfin,if(naturalEnd)observedDuration else position(),loaded,false);JellyfinProgress.observe(null,0.0,false,false)
  val old=handle;val at=NativeMpv.property(p.engine,"time-pos")?.toDoubleOrNull()?:0.0;ListeningHistory.observe(queue.getOrNull(index)?.let{metadata(it)},false);ListeningHistory.restart();handle=p.engine;prepared=null;stageEpoch++;stageAttempt=-1;generation++;index=p.index;loaded=true;ended=false;pendingSeek=0.0;partIndex=0;observedDuration=p.next.duration;relativeClock.reset(at);diagnosticSource=p.next;NativeMpv.command(handle,arrayOf("set","volume",userVolume.toString()));NativeMpv.command(handle,arrayOf("set","pause",if(paused)"yes" else "no"));NativeMpv.destroy(old);error="";android.util.Log.i("MCTransition",if(p.fadeAt>0)"crossfade-handoff" else "prepared-handoff");publish()
 }
 private fun fadeStep(){
  val p=prepared?:return;if(p.engine==0L)return
  val frameNow=android.os.SystemClock.elapsedRealtime()
  if(!valid(p)){cancelPreparation();return}
  for(i in 0..31){when(NativeMpv.event(p.engine)){0->break;8->p.ready=true;-1,-2->{val finished=ended;cancelPreparation();stageAttempt=stageEpoch;transitionNotice="Next track could not be prepared; normal playback will retry.";if(finished)advance(1,true);return}}}
  if(!p.ready||!loaded)return;if(paused){p.clock?.step(frameNow,false);stopFadeTimer();return}
  val now=android.os.SystemClock.elapsedRealtime()
  if(p.fadeAt==0L){val speed=NativeMpv.property(handle,"speed")?.toDoubleOrNull()?:1.0;val nextDuration=NativeMpv.property(p.engine,"duration")?.toDoubleOrNull()?:p.next.duration;val length=MusicTransitionPlan.fadeSeconds(transitions.crossfade,duration(),nextDuration,speed);val remaining=(duration()-position())/speed;if(length<=0||remaining>length||remaining<=0)return;p.fadeLength=length;p.fadeAt=now;p.clock=MusicFadeClock(p.fadeLength,now);check(NativeMpv.command(p.engine,arrayOf("set","pause","no"))>=0);android.util.Log.i("MCTransition","crossfade-start");startFadeTimer()}
  val progress=requireNotNull(p.clock).step(now,true);val gains=MusicTransitionPlan.gains(progress)
  NativeMpv.command(handle,arrayOf("set","volume",(userVolume*gains.first).toString()));NativeMpv.command(p.engine,arrayOf("set","volume",(userVolume*gains.second).toString()))
  if(progress>=1)promoteFade(p)
 }
 private var continuationEpoch=0L;private var continuationSuppressed=false;private var continuation=false;private var continuationPending=false;private var continuationAttempt=-1L
 fun setContinuation(enabled:Boolean){worker.execute{if(continuation!=enabled){continuation=enabled;continuationEpoch++;if(enabled){continuationSuppressed=false;continuationAttempt=-1L}}}}
 private fun continueQueue(){
  val current=queue.getOrNull(index)?:return
  if(!continuation||continuationSuppressed||endAt>0||continuationPending||continuationAttempt==generation||queue.size>=5000||!QueueRecommendations.eligible(current.kind,loaded&&!paused,repeat,sleepAtEnd,queue.lastIndex-index,duration()-position()))return
  val c=context?:return;val token=generation;val epoch=continuationEpoch;continuationAttempt=token;continuationPending=true;val excluded=queue.map{it.account to it.id}.toSet()
  resolver.execute{val tracks=try{SmartQueue.fetch(c,current,excluded)}catch(_:Exception){emptyList()};worker.execute{continuationPending=false;if(continuation&&!continuationSuppressed&&continuationEpoch==epoch&&generation==token&&loaded&&!paused&&!ended&&repeat=="off"&&!sleepAtEnd&&endAt==0L){val now=queue.map{it.account to it.id}.toSet();val added=tracks.filter{(it.account to it.id) !in now}.take(5000-queue.size);if(added.isNotEmpty()){queue=queue+added;publish()}}}}
 }
 private var generation=0L
 private var resolving=false
 @Volatile private var diagnosticSource:Playable?=null
 fun probeAudio()=AudioSourceProbe.read(diagnosticSource)
 private val relativeClock=RelativePlaybackClock()
 private var outputRecovery=OutputRecovery()
 private fun outputOptions(){for((name,value) in OutputRecovery.compatible){val result=NativeMpv.command(handle,arrayOf("set","options/$name",value));if(result<0){android.util.Log.w("MCPlayback","Output option $name rejected ($result)");throw IllegalStateException("Output option could not be applied")}}}

 private var handle=0L
 private var queue=listOf<Playable>();private var index=0;private var loaded=false;private var paused=true
 private var removed:Pair<Int,Playable>?=null;private var removedAt=0L
 private fun discardRemoved(){removed?.second?.let{it.descriptor?.close();it.descriptors.forEach{fd->fd.close()}};removed=null}
 private var engineFailure="";private var error="";private var repeat="off";private var shuffle=false;private var endAt=0L
 private var audio=AudioOptions()
 private var pauseAt=0L;private var sleepAtEnd=false;private val sessionCheckpoint=MusicSessionCheckpoint();private var musicQueue=false;private var spokenQueue=false;private var spokenQueueJson="[]";private val spokenCheckpoint=MusicSessionCheckpoint()
 private fun policy()=PlaybackPolicy.parse(JSONObject(context?.getSharedPreferences("media_library",Context.MODE_PRIVATE)?.getString("playbackPolicy","{}")?:"{}"))
 private fun rewindResume(){if(!paused||pauseAt<=0)return;val target=policy().resume(position(),queue.getOrNull(index)?.kind in setOf("book","podcast"),System.currentTimeMillis()-pauseAt);if(loaded&&target<position())seek(target)}
 fun headset(next:Boolean){context?.let{policy().headsetAction(next)?.let{(action,value)->control(action,value)}}}
 private var context:Context?=null
 private var partIndex=0;private var pendingSeek=0.0;private var ended=false
 @Volatile private var snapshot=PlaybackSnapshot.initial()
 private var publishedQueue:List<Playable>?=null
 private var queueVersion=0L
 private var queueJson="[]"
 var resolve:((Playable)->Playable)?=null
 var requestFocus:(()->Boolean)?=null
 var onState:(()->Unit)?=null
 init { worker.scheduleWithFixedDelay({try{if(removed!=null&&System.currentTimeMillis()-removedAt>10000)discardRemoved();tick()}catch(e:Throwable){error="Playback engine failed";publish()}},0,200,TimeUnit.MILLISECONDS) }
 fun play(ctx:Context,entries:List<Playable>,start:Int){ProgressEditGuard.requirePlaybackAllowed();require(entries.isNotEmpty()&&start in entries.indices);context=ctx.applicationContext
  setContinuation(JSONObject(ctx.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("ui","{}")?:"{}").optBoolean("automaticContinuation"))
  audio=AudioOptions.parse(JSONObject(ctx.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("audio","{}")?:"{}"));SpokenProgress.configure(ctx);ListeningHistory.configure(ctx);ctx.startForegroundService(Intent(ctx,PlaybackService::class.java))
  worker.execute{try{cancelPreparation();discardRemoved();transitions=MusicTransitions.parse(JSONObject(ctx.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("musicTransitions","{}")?:"{}"));generation++;resolving=false;if(handle!=0L){command("stop");while(NativeMpv.event(handle)!=0){}};queue.forEach{it.descriptor?.close();it.descriptors.forEach{fd->fd.close()}};queue=entries;continuationSuppressed=false;index=start;sleepAtEnd=false;partIndex=0;pendingSeek=0.0;loaded=false;ended=false;if(entries[start].parts.isNotEmpty()){val point=AudioTimeline.locate(entries[start].parts,entries[start].startPosition);partIndex=point.index;pendingSeek=point.seconds};publish();if(handle==0L)handle=NativeMpv.create(ctx.applicationContext);check(handle!=0L);userVolume=NativeMpv.property(handle,"volume")?.toDoubleOrNull()?:100.0;configureTransitions();applyAudio();load()}catch(e:Throwable){android.util.Log.e("MCPlayback",if(e is UnsatisfiedLinkError)e.message?:"Native library linking failed" else e.javaClass.simpleName);error="Native MPV could not start ("+e.javaClass.simpleName+")";publish()}}
 }
 fun enqueue(ctx:Context,entries:List<Playable>,next:Boolean){
  require(entries.isNotEmpty());worker.execute{
   if(queue.isEmpty()){play(ctx,entries,0)} else {pollEvents();cancelPreparation();val at=if(next)index+1 else queue.size;queue=queue.take(at)+entries+queue.drop(at);publish()}
  }
 }
 fun enqueueSpoken(ctx:Context,entries:List<Playable>,next:Boolean){
  try{worker.submit{require(entries.isNotEmpty()&&entries.all{it.spokenTarget!=null});require(queue.isEmpty()||queue.all{it.spokenTarget!=null}){"Start a spoken session before adding books or episodes"};require(queue.size+entries.size<=500){"A spoken queue supports up to 500 items"};if(queue.isEmpty())play(ctx,entries,0)else{val at=if(next)index+1 else queue.size;queue=queue.take(at)+entries+queue.drop(at);publish()}}.get()}catch(e:java.util.concurrent.ExecutionException){throw (e.cause?:e)}
 }
 fun setAudio(options:AudioOptions,persist:()->Unit={}){try{worker.submit<Unit>{pollEvents();cancelPreparation();val before=audio;try{audio=options;if(handle!=0L)applyAudio();persist();if(error.startsWith("Audio processing settings")||error.startsWith("Audio settings could not be restored")){error="";publish()}}catch(_:Throwable){audio=before;val recovered=runCatching{if(handle!=0L)applyAudio()}.isSuccess;error=if(recovered)"Audio processing settings were not applied" else "Audio settings could not be restored. Stop playback and reset processing.";publish();throw IllegalStateException(error)}}.get()}catch(e:java.util.concurrent.ExecutionException){throw (e.cause?:e)}}
 private fun applyAudioTo(h:Long,kind:String){for((key,value) in listOf("replaygain" to audio.replayGain,"replaygain-preamp" to audio.preamp.toString(),"replaygain-clip" to "no","replaygain-fallback" to if(audio.replayGain=="no")"0" else audio.fallback.toString(),"af" to audio.filter(kind)))check(NativeMpv.command(h,arrayOf("set",key,value))>=0)}
 private fun applyAudio(){applyAudioTo(handle,queue.getOrNull(index)?.kind?:"music")}
 private fun command(vararg args:String){check(handle!=0L);check(NativeMpv.command(handle,arrayOf(*args))>=0)}
 private fun release(t:Playable){t.descriptor?.close();t.descriptors.forEach{it.close()};t.session?.let{s->resolver.execute{runCatching{Audiobookshelf.request(s.account,"api/session/${ProviderHttp.segment(s.id)}/close",s.persist,JSONObject())}}}}
 private fun recoverStream():Boolean {
  val track=queue.getOrNull(index)?:return false;val c=context?:return false
  if(!StreamFallbackPolicy.eligible(track.kind,track.account,track.fallbackFrom,engineFailure))return false
  val enabled=try{JSONObject(c.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("ui","{}")?:"{}").optBoolean("musicSourceFallback")}catch(_:Exception){false}
  if(!enabled)return false
  val token=++generation;val at=position();loaded=false;resolving=true
  resolver.execute{
   val replacement=try{MusicFallback.find(c,track)}catch(_:Exception){null}
   worker.execute recovered@{
    if(token!=generation){replacement?.let(::release);return@recovered}
    resolving=false
    if(replacement==null){paused=true;error=PlaybackFailure.message(engineFailure);publish();return@recovered}
    val i=queue.indexOfFirst{it===track}
    if(i<0){release(replacement);return@recovered}
    release(track);index=i;queue=queue.mapIndexed{j,t->if(j==i)replacement.copy(startPosition=at.coerceIn(0.0,replacement.duration)) else t}
    try{load(paused)}catch(_:Throwable){loaded=false;paused=true;error="The matching saved copy could not open.";publish()}
   }
  }
  return true
 }
 private fun load(keepPaused:Boolean=false){
  cancelPreparation();transitionNotice="";observedDuration=queue.getOrNull(index)?.duration?:0.0
  diagnosticSource=null
  if(outputRecovery.used){
   // MPV's unspecified audio-format cannot be restored by parsing its printed "no" value.
   // Recreate only when leaving compatibility mode, preserving user volume and speed.
   val volume=NativeMpv.property(handle,"volume")?:"100";val speed=NativeMpv.property(handle,"speed")?:"1"
   NativeMpv.destroy(handle);handle=NativeMpv.create(requireNotNull(context));check(handle!=0L)
   command("set","volume",volume);command("set","speed",speed);applyAudio()
  }
  outputRecovery=OutputRecovery()
  val token=++generation
  ListeningHistory.restart();loaded=false;ended=false;pendingSeek=0.0;partIndex=0
  paused=keepPaused||!(requestFocus?.invoke()?:false);error="";engineFailure=""
  command("stop");while(NativeMpv.event(handle)!=0){}
  var pending=queue[index]
  if(pending.spokenTarget!=null&&pending.url.isNotEmpty()){
   pending.descriptor?.close();pending.descriptors.forEach{it.close()}
   pending=SpokenResolver.pending(SpokenQueueEntry(SpokenResumeRef(pending.account,requireNotNull(pending.spokenTarget)),pending.title),pending.startPosition)
   queue=queue.mapIndexed{i,t->if(i==index)pending else t}
  }
  resolving=pending.url.isEmpty()
  if(!resolving){startResolved();return}
  publish()
  resolver.execute{
   try{
    val result=requireNotNull(resolve)(pending).let{if(pending.startPosition>0)it.copy(startPosition=pending.startPosition) else it}
    worker.execute resultReady@{
     if(token!=generation){release(result);return@resultReady}
     try{
      val at=queue.indexOfFirst{it===pending}
      if(at<0){release(result);resolving=false;return@resultReady}
      index=at;queue=queue.mapIndexed{i,t->if(i==at)result else t};resolving=false;startResolved()
     }catch(_:Throwable){loaded=false;paused=true;error="Unable to open this stream.";publish()}
    }
   }catch(_:Throwable){worker.execute{if(token==generation){resolving=false;loaded=false;paused=true;error="Unable to reach this track. Check the source and connection.";publish()}}}
  }
 }
 private fun startResolved(){applyAudio();val track=queue[index];val point=if(track.parts.isNotEmpty())AudioTimeline.locate(track.parts,track.startPosition) else FilePosition(0,track.startPosition);loadPart(point.index,point.seconds)}
 private fun loadPart(part:Int,seconds:Double){loaded=false;ended=false;partIndex=part;pendingSeek=seconds;relativeClock.reset(seconds);command("stop");while(NativeMpv.event(handle)!=0){};command("set","pause",if(paused)"yes" else "no");val track=queue[index];diagnosticSource=track.copy(url=track.parts.getOrNull(part)?.url?:track.url);command("set","http-header-fields",track.headers);check(NativeMpv.load(handle,track.parts.getOrNull(part)?.url?:track.url,false,track.headers)>=0);publish()}
 private fun seek(seconds:Double){val track=queue.getOrNull(index)?:return;val target=seconds.coerceIn(0.0,duration());if(ended){queue=queue.mapIndexed{i,t->if(i==index)t.copy(startPosition=target) else t};load(true);return};if(track.parts.isEmpty()){relativeClock.awaitSeek(target,android.os.SystemClock.elapsedRealtime());command("seek",target.toString(),"absolute+exact");return};val point=AudioTimeline.locate(track.parts,target);if(point.index!=partIndex)loadPart(point.index,point.seconds) else {relativeClock.awaitSeek(point.seconds,android.os.SystemClock.elapsedRealtime());command("seek",point.seconds.toString(),"absolute+exact")}}
 fun control(action:String,value:Double=0.0,expectedIdentity:String?=null){worker.execute{pollEvents();if(expectedIdentity!=null){val current=queue.getOrNull(index)?:return@execute;if(expectedIdentity!=current.account+":"+current.id)return@execute};try{if(action in setOf("seek","skip","next","previous","queue-index","remove","undo-remove","move-to","clear-upcoming","move-up","move-down","stop","shuffle","repeat","sleep","sleep-end","speed"))cancelPreparation();when(action){
  "pause"->{command("set","pause","yes");paused=true;pauseAt=System.currentTimeMillis()}
  "resume"->{(if((prepared?.fadeAt?:0)>0)null else PlaybackRecovery.point(ended,loaded,resolving,error.isNotBlank(),position()))?.let{point->queue=queue.mapIndexed{i,t->if(i==index)t.copy(startPosition=point) else t};load()};if(requestFocus?.invoke()==true){rewindResume();command("set","pause","no");paused=false}}
  "toggle"->{(if((prepared?.fadeAt?:0)>0)null else PlaybackRecovery.point(ended,loaded,resolving,error.isNotBlank(),position()))?.let{point->queue=queue.mapIndexed{i,t->if(i==index)t.copy(startPosition=point) else t};load();paused=true};if(paused)rewindResume() else pauseAt=System.currentTimeMillis();paused=if(paused)requestFocus?.invoke()!=true else true;command("set","pause",if(paused)"yes" else "no")}
  "seek"->{if(loaded)seek(value)}
  "skip"->{if(loaded)seek(position()+value)}
  "next"->advance(1)
  "previous"->{if(position()>3)seek(0.0) else advance(-1)}
  "volume"->{userVolume=value.coerceIn(0.0,100.0);if(prepared?.fadeAt==0L||prepared==null)command("set","volume",userVolume.toString())}
  "speed"->command("set","speed",value.coerceIn(0.5,3.0).toString())
  "repeat"->{repeat=when(repeat){"off"->"all";"all"->"one";else->"off"}}
  "shuffle"->{shuffle=!shuffle}
  "sleep-end"->{sleepAtEnd=value>0;endAt=0}
  "sleep"->{sleepAtEnd=false;endAt=if(value>0)System.currentTimeMillis()+(value.coerceAtMost(240.0)*60000).toLong() else 0}
  "queue-index"->{val next=value.toInt();require(next in queue.indices);index=next;resetSpokenResume();load()}
  "remove"->{val remove=value.toInt();require(remove in queue.indices);if(remove==index)throw IllegalArgumentException();discardRemoved();removed=remove to queue[remove];removedAt=System.currentTimeMillis();queue=queue.filterIndexed{i,_->i!=remove};if(remove<index)index--}
  "undo-remove"->{val entry=removed?:throw IllegalStateException("Nothing to restore");require(System.currentTimeMillis()-removedAt<=10000){"Undo expired"};val at=entry.first.coerceAtMost(queue.size);queue=queue.take(at)+entry.second+queue.drop(at);if(at<=index)index++;removed=null}
  "move-to"->{val encoded=value.toLong();val from=(encoded/100000).toInt();val to=(encoded%100000).toInt();require(from in queue.indices&&to in queue.indices);val moved=QueueMove.apply(queue,index,from,to);queue=moved.first;index=moved.second}
  "clear-upcoming"->{continuationSuppressed=true;continuationEpoch++;queue.drop(index+1).forEach{it.descriptor?.close();it.descriptors.forEach{fd->fd.close()}};queue=queue.take(index+1)}
  "move-up","move-down"->{val from=value.toInt();val to=from+if(action=="move-up")-1 else 1;require(from in queue.indices&&to in queue.indices);val moved=QueueMove.apply(queue,index,from,to);queue=moved.first;index=moved.second}
  "stop"->{if(loaded){paused=true;publish()};diagnosticSource=null;relativeClock.reset(0.0);discardRemoved();generation++;resolving=false;command("stop");loaded=false;paused=true;queue.forEach{it.descriptor?.close();it.descriptors.forEach{fd->fd.close()}};queue=emptyList();index=0;partIndex=0;pendingSeek=0.0;ended=false}
 };prepared?.takeIf{it.engine!=0L&&it.fadeAt>0}?.let{NativeMpv.command(it.engine,arrayOf("set","pause",if(paused)"yes" else "no"));it.clock?.step(android.os.SystemClock.elapsedRealtime(),false);if(paused)stopFadeTimer()else startFadeTimer()};publish()}catch(e:Throwable){error="Playback action failed";publish()}}}
 private fun resetSpokenResume(){if(queue.getOrNull(index)?.spokenTarget!=null)queue=queue.mapIndexed{i,t->if(i==index)t.copy(startPosition=-1.0)else t}}
 private fun advance(direction:Int,naturalEnd:Boolean=false){if(queue.isEmpty())return;val next=if(shuffle&&queue.size>1)queue.indices.filter{it!=index}.random() else index+direction
  if(next in queue.indices){index=next;resetSpokenResume();load()}else if(repeat=="all"){index=if(direction>0)0 else queue.lastIndex;resetSpokenResume();load()}else when(QueueBoundary.action(direction,naturalEnd)){QueueBoundaryAction.FINISH->{generation++;resolving=false;ended=true;paused=true;command("set","pause","yes")};QueueBoundaryAction.RESTART->{if(loaded)seek(0.0)};QueueBoundaryAction.STAY->{}}}
 private fun position():Double {val track=queue.getOrNull(index);if(ended)return duration();val relative=if(!loaded)pendingSeek else if(handle!=0L)relativeClock.read(NativeMpv.property(handle,"time-pos"),android.os.SystemClock.elapsedRealtime()) else 0.0;return if(track!=null&&track.parts.isNotEmpty())AudioTimeline.whole(track.parts,partIndex,relative) else relative}
 private fun duration():Double {val track=queue.getOrNull(index);if(ended)return observedDuration.takeIf{it>0}?:track?.duration?:0.0;if(track!=null&&(!loaded||track.parts.isNotEmpty()))return track.duration;val value=if(handle!=0L)NativeMpv.property(handle,"duration")?.toDoubleOrNull()?:track?.duration?:0.0 else 0.0;if(value>0)observedDuration=value;return value}
 private fun pollEvents(){if(handle==0L||resolving)return
  for(i in 0..63){when(NativeMpv.event(handle)){
   0->break
   6->{val p=prepared;if(p!=null&&p.entry>=0&&NativeMpv.eventEntry(handle)==p.entry){if(valid(p))adoptGapless(p)else{cancelPreparation();load(paused);return}}}
   8->{if(pendingSeek>0){relativeClock.awaitSeek(pendingSeek,android.os.SystemClock.elapsedRealtime());command("seek",pendingSeek.toString(),"absolute+exact")};loaded=true;ended=false;observedDuration=NativeMpv.property(handle,"duration")?.toDoubleOrNull()?:queue.getOrNull(index)?.duration?:0.0;error="";if(clearPlaylistOnLoad){command("playlist-clear");clearPlaylistOnLoad=false}}
   -1->{cancelPreparation();engineFailure=PlaybackFailure.safeCode(NativeMpv.lastError(handle));pendingSeek=relativeClock.value;if(outputRecovery.retry(engineFailure)){loaded=false;outputOptions();error="";loadPart(partIndex,pendingSeek)}else{JellyfinProgress.failed(queue.getOrNull(index)?.jellyfin);if(!recoverStream()){loaded=false;paused=true;error=PlaybackFailure.message(engineFailure)}}}
   -2->{val p=prepared
    if(p!=null&&valid(p)&&p.engine!=0L&&p.ready){if(p.fadeAt>0){ended=true /* Finish the complementary envelope before retiring the outgoing engine. */}else{NativeMpv.command(p.engine,arrayOf("set","pause",if(paused)"yes" else "no"));promoteFade(p,true)}}
    else if(p!=null&&valid(p)&&p.entry>=0){ended=true;paused=true;publish() /* MPV owns the next entry; START_FILE selects its exact queue identity. */}
    else {cancelPreparation();val parts=queue.getOrNull(index)?.parts?:emptyList();if(partIndex+1<parts.size)loadPart(partIndex+1,0.0) else if(sleepAtEnd){sleepAtEnd=false;endAt=0;ended=true;paused=true;command("set","pause","yes")} else if(repeat=="one"){queue=queue.mapIndexed{j,t->if(j==index)t.copy(startPosition=0.0) else t};load()} else advance(1,true)}
   }
  }}
 }
 private fun tick(){if(handle==0L)return
  if(resolving){if(endAt>0&&System.currentTimeMillis()>=endAt){paused=true;endAt=0};publish();return}
  pollEvents();fadeStep()
  if(endAt>0&&System.currentTimeMillis()>=endAt){cancelPreparation();command("set","pause","yes");paused=true;endAt=0}
  continueQueue();prepareNext();publish()
 }
 private fun metadata(t:Playable)=JSONObject().put("account",t.account).put("id",t.id).put("title",t.title).put("artist",t.artist).put("album",t.album).put("coverArt",t.cover).put("duration",t.duration).put("kind",t.kind).put("fallbackFrom",t.fallbackFrom)
 private fun publish(){
  if(publishedQueue!==queue){publishedQueue=queue;queueVersion++;musicQueue=queue.isNotEmpty()&&queue.all{it.kind in setOf("music","local")};queueJson=JSONArray(queue.map{metadata(it)}).toString();spokenQueue=queue.isNotEmpty()&&queue.all{it.spokenTarget!=null};spokenQueueJson=if(spokenQueue)JSONArray(queue.map{SpokenQueuePlan.row(SpokenResumeRef(it.account,requireNotNull(it.spokenTarget)),it.title)}).toString()else "[]"}
  val state=JSONObject().put("loaded",loaded).put("playing",loaded&&!paused).put("position",position()).put("duration",duration()).put("error",error).put("engineFailure",engineFailure).put("compatibilityOutput",outputRecovery.used).put("index",index).put("repeat",repeat).put("shuffle",shuffle).put("sleepUntil",endAt).put("sleepAtEnd",sleepAtEnd).put("queueVersion",queueVersion)
  queue.getOrNull(index)?.let{state.put("track",metadata(it))}
  if(handle!=0L){state.put("volume",userVolume).put("musicTransitions",transitions.json()).put("transitionNotice",transitionNotice).put("crossfading",prepared?.fadeAt?.let{it>0}?:false);state.put("speed",NativeMpv.property(handle,"speed")?.toDoubleOrNull()?:1.0);state.put("sampleRate",NativeMpv.property(handle,"audio-params/samplerate"));state.put("outputRate",NativeMpv.property(handle,"audio-out-params/samplerate"));state.put("codec",NativeMpv.property(handle,"audio-codec-name"));state.put("sourceFormat",NativeMpv.property(handle,"audio-params/format"));state.put("channels",NativeMpv.property(handle,"audio-out-params/channels"));state.put("outputDriver",NativeMpv.property(handle,"current-ao"));state.put("processing",audio.json())}
  context?.let{LocalPosition.observe(it,queue.getOrNull(index)?.localProgressKey?:"",position(),loaded&&!paused)};ListeningHistory.observe(queue.getOrNull(index)?.let{metadata(it)},loaded&&!paused);SpokenProgress.observe(queue.getOrNull(index)?.session,position(),duration(),loaded&&!paused);JellyfinProgress.observe(queue.getOrNull(index)?.jellyfin,position(),loaded,loaded&&!paused);state.put("syncError",if(!queue.getOrNull(index)?.localProgressKey.isNullOrEmpty())"Offline playback: resume is saved on this phone; server progress is not updated." else SpokenProgress.error.ifBlank{JellyfinProgress.error})
  val checkpointNow=android.os.SystemClock.elapsedRealtime();val checkpointPosition=position();if(loaded&&musicQueue&&sessionCheckpoint.due(queueVersion,index,checkpointPosition,!paused,checkpointNow)){context?.let{it.getSharedPreferences("media_library",Context.MODE_PRIVATE).edit().putString("musicSession",MusicSessionCheckpoint.encode(queueJson,index,checkpointPosition,System.currentTimeMillis())).apply();sessionCheckpoint.saved(queueVersion,index,checkpointPosition,!paused,checkpointNow)}}
  if(loaded&&spokenQueue&&spokenCheckpoint.due(queueVersion,index,checkpointPosition,!paused,checkpointNow)){
   context?.let{c->val current=queue[index];val ref=SpokenResumeRef(current.account,requireNotNull(current.spokenTarget));val now=System.currentTimeMillis();c.getSharedPreferences("media_library",Context.MODE_PRIVATE).edit().putString("spokenQueueSession",SpokenQueuePlan.encode(spokenQueueJson,index,checkpointPosition,now)).putString("lastSpoken",SpokenQueuePlan.row(ref,current.title).put("updated",now).toString()).apply();spokenCheckpoint.saved(queueVersion,index,checkpointPosition,!paused,checkpointNow)}
  }
  snapshot=PlaybackSnapshot(state.toString(),queueVersion,queueJson);onState?.invoke()
 }
 fun <T> idleProgressEdit(block:()->T):T {try{return worker.submit<T>{ProgressEditGuard.edit{check(queue.isEmpty()&&!resolving){"Stop playback before applying a progress choice"};check(!VideoActivity.hasOpenVideo()){ "Close the video player before reviewing progress" };block()}}.get()}catch(e:java.util.concurrent.ExecutionException){throw (e.cause?:e)}}
 fun state()=snapshot.state
 fun clientState(version:Long)=snapshot.clientState(version)
}
