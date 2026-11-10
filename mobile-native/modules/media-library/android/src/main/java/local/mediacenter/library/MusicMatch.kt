package local.mediacenter.library
import java.text.Normalizer
import java.util.Locale
import kotlin.math.abs
internal data class MusicIdentity(val account:String,val id:String,val title:String,val artist:String,val album:String,val duration:Double,val kind:String="music")
internal object MusicMatch {
 private fun text(s:String)=Normalizer.normalize(s,Normalizer.Form.NFKC).trim().replace(Regex("\\s+")," ").lowercase(Locale.ROOT)
 fun same(wanted:MusicIdentity,candidate:MusicIdentity):Boolean {
  if(wanted.kind !in setOf("music","local")||candidate.kind !in setOf("music","local")||wanted.account==candidate.account)return false
  if(wanted.title.isBlank()||wanted.artist.isBlank()||wanted.album.isBlank()||candidate.id.isBlank()||!wanted.duration.isFinite()||!candidate.duration.isFinite()||wanted.duration<=0||candidate.duration<=0)return false
  return text(wanted.title)==text(candidate.title)&&text(wanted.artist)==text(candidate.artist)&&text(wanted.album)==text(candidate.album)&&abs(wanted.duration-candidate.duration)<=2.0
 }
}
