package local.mediacenter.library
import kotlin.math.abs
/** Preserve the last file-relative point on unload, and ignore stale samples briefly after a seek. */
internal class RelativePlaybackClock {
 var value=0.0;private set
 private var pending:Double?=null;private var requestedAt=0L
 fun reset(seconds:Double){value=seconds.takeIf{it.isFinite()&&it>=0}?:0.0;pending=null}
 fun awaitSeek(seconds:Double,now:Long){reset(seconds);pending=value;requestedAt=now}
 fun read(raw:String?,now:Long):Double {
  val sample=raw?.toDoubleOrNull()?.takeIf{it.isFinite()&&it>=0};val target=pending
  if(target!=null){if(now-requestedAt in 0 until 2000&&(sample==null||abs(sample-target)>.75))return value;pending=null}
  if(sample!=null)value=sample;return value
 }
}
