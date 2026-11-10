package local.mediacenter.library
import org.json.JSONObject

/** An unchanged paused queue must not be rewritten by the playback ticker. */
internal class MusicSessionCheckpoint {
 private var version=-1L;private var index=-1;private var position=Double.NaN;private var playing:Boolean?=null;private var at=0L
 fun due(queueVersion:Long,trackIndex:Int,current:Double,active:Boolean,now:Long):Boolean {
  if(!current.isFinite()||current<0)return false
  val changed=ProgressHeartbeat.changed(position,current)
  return version!=queueVersion||index!=trackIndex||playing!=active||(!active&&changed)||(active&&changed&&now-at>=5000)
 }
 fun saved(queueVersion:Long,trackIndex:Int,current:Double,active:Boolean,now:Long){version=queueVersion;index=trackIndex;position=current;playing=active;at=now}
 companion object {
  /** queueJson is the already-serialized native metadata snapshot; do not parse 5,000 rows again. */
  fun encode(queueJson:String,index:Int,position:Double,updated:Long):String {
   require(queueJson.startsWith('[')&&queueJson.endsWith(']')&&index>=0&&position.isFinite()&&position>=0)
   val fields=JSONObject().put("index",index).put("position",position).put("updated",updated).toString()
   return fields.dropLast(1)+",\"queue\":"+queueJson+"}"
  }
 }
}
