package local.mediacenter.library
import org.json.JSONObject

internal data class MusicTransitions(val gapless:Boolean=true,val crossfade:Double=0.0){
 fun json()=JSONObject().put("gapless",gapless).put("crossfade",crossfade)
 companion object{fun parse(raw:JSONObject):MusicTransitions{if(raw.has("crossfade"))require(raw.opt("crossfade") is Number);val seconds=raw.optDouble("crossfade",0.0);require(seconds.isFinite()&&seconds in 0.0..12.0){"Crossfade must be between 0 and 12 seconds"};if(raw.has("gapless"))require(raw.opt("gapless") is Boolean);return MusicTransitions(raw.optBoolean("gapless",true),seconds)}}
}
/** Presentation-time envelope: decoder EOF is not permission to jump to full gain. */
internal class MusicFadeClock(private val length:Double,now:Long){
 private var last=now;private var elapsed=0.0
 init{require(length.isFinite()&&length>0&&length<=12)}
 fun step(now:Long,playing:Boolean):Double{if(playing)elapsed+=(now-last).coerceAtLeast(0)/1000.0;last=maxOf(last,now);return (elapsed/length).coerceIn(0.0,1.0)}
}
internal object MusicTransitionPlan {
 fun sharedDescriptor(sameOccurrence:Boolean,hasDescriptor:Boolean)=sameOccurrence&&hasDescriptor
 fun music(kind:String)=kind in setOf("music","local")
 fun eligible(current:String,next:String,parts:Boolean,nextStart:Double,timed:Boolean)=music(current)&&music(next)&&!parts&&nextStart<=0&&!timed
 fun next(index:Int,size:Int,repeat:String,shuffle:Boolean,random:(List<Int>)->Int={it.random()}):Int? {
  if(size<1||index !in 0 until size)return null
  if(repeat=="one")return index
  if(shuffle&&size>1)return random((0 until size).filter{it!=index})
  return (index+1).takeIf{it<size}?:if(repeat=="all")0 else null
 }
 fun fadeSeconds(requested:Double,currentDuration:Double,nextDuration:Double,speed:Double):Double {
  if(!requested.isFinite()||!currentDuration.isFinite()||!nextDuration.isFinite()||!speed.isFinite()||speed<=0||currentDuration<2||nextDuration<2)return 0.0
  return minOf(requested.coerceIn(0.0,12.0),currentDuration/(2*speed),nextDuration/(2*speed))
 }
 /** Linear complementary gains keep their sum <= 1, including correlated tracks. */
 fun gains(progress:Double):Pair<Double,Double>{val p=progress.coerceIn(0.0,1.0);return (1-p) to p}
 fun prefetch(currentAccount:String,currentHeaders:String,nextAccount:String,nextHeaders:String)=currentAccount==nextAccount&&currentHeaders==nextHeaders
}
