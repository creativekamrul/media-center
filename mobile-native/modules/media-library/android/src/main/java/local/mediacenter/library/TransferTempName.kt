package local.mediacenter.library

import java.util.UUID

/** Names are scoped to the persisted transfer token; never discover arbitrary partial files. */
internal object TransferTempName {
 fun current(token:String,suffix:String):String {
  require(UUID.fromString(token).toString()==token)
  require(suffix.matches(Regex("[A-Za-z0-9]{2,5}")))
  return ".mc-$token.partial.$suffix"
 }
 fun recovery(token:String,stored:String,target:String):List<String> {
  val suffix=target.substringAfterLast('.')
  val next=current(token,suffix)
  val legacy=".mc-$token.partial"
  require(stored==legacy||stored==next)
  // Android can append the media extension to older journaled temporary names.
  return if(stored==legacy)listOf(legacy,next) else listOf(next)
 }
}
