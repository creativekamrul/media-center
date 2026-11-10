package local.mediacenter.library

object CacheJobState {
 fun control(status:String,action:String):String {
  require(action in setOf("pause","resume","cancel"))
  if(status=="complete")return status
  return when(action){"pause"->"paused";"cancel"->"cancelled";else->"queued"}
 }
 fun interrupted(status:String)=if(status in setOf("downloading","queued"))"paused" else status
 /** Only an Android restart of an active foreground service may recover active jobs. */
 fun restore(status:String,systemRestart:Boolean)=if(systemRestart&&status in setOf("downloading","queued"))"queued" else interrupted(status)
 fun failed(status:String)=if(status=="downloading")"error" else status
}
