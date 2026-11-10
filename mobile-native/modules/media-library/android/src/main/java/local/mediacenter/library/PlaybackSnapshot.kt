package local.mediacenter.library

/** One immutable publication keeps state and queue revisions consistent across bridge reads. */
internal data class PlaybackSnapshot(val state:String,val version:Long,val queue:String){
 fun clientState(knownVersion:Long):String {
  if(knownVersion==version)return state
  return state.dropLast(1)+(if(state=="{}")"" else ",")+"\"queue\":"+queue+"}"
 }
 companion object {
  fun initial()=PlaybackSnapshot("{\"loaded\":false,\"playing\":false,\"position\":0,\"duration\":0,\"index\":0,\"queueVersion\":0}",0,"[]")
 }
}
