package local.mediacenter.library
import kotlin.math.abs
/** Only active playback needs heartbeats. A paused seek is an explicit new checkpoint, not a timer write. */
internal class ProgressHeartbeat(private val interval:Long){
 private var sent=Double.NaN;private var observed=0.0;private var observedAt=0L;private var sentAt=0L;private var active=false
 fun reset(position:Double,now:Long,playing:Boolean=false){sent=position;observed=position;observedAt=now;sentAt=now;active=playing}
 fun due(position:Double,playing:Boolean,now:Long):Boolean {
  if(!position.isFinite()||position<0)return false
  val elapsed=(now-observedAt).coerceAtLeast(0)/1000.0;val jump=abs(position-observed)>(if(!active&&!playing).05 else maxOf(2.0,elapsed*4))
  val send=(playing&&now-sentAt>=interval)||(active!=playing)||jump
  observed=position;observedAt=now;active=playing
  if(send){sent=position;sentAt=now};return send
 }
 fun needsPosition(position:Double,listened:Double,playing:Boolean)=playing||listened>0||changed(sent,position)
 companion object {fun changed(previous:Double,position:Double)=position.isFinite()&&position>=0&&(!previous.isFinite()||abs(previous-position)>.001)}
}
