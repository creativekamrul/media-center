package local.mediacenter.library
import kotlin.math.abs
/** Android media clients extrapolate a playing clock. Repeating an unchanged paused state is Binder spam. */
internal class MediaTransportThrottle {
 private data class State(val key:String,val playing:Boolean,val position:Double,val speed:Double,val at:Long)
 private var last:State?=null
 fun publish(key:String,playing:Boolean,position:Double,speed:Double,now:Long):Boolean {
  val at=position.takeIf{it.isFinite()}?.coerceAtLeast(0.0)?:0.0;val rate=speed.takeIf{it.isFinite()&&it>0}?:1.0
  val old=last;val predicted=old?.let{it.position+if(it.playing)(now-it.at).coerceAtLeast(0)/1000.0*it.speed else 0.0}
  val changed=old==null||old.key!=key||old.playing!=playing||old.speed!=rate||now<old.at||abs(at-predicted!!)>(if(playing).75 else .05)||(playing&&now-old.at>=5000)
  if(changed)last=State(key,playing,at,rate,now)
  return changed
 }
}
