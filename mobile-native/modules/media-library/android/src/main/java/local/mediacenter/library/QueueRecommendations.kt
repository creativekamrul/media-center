package local.mediacenter.library
import java.util.Locale
internal data class QueueCandidate(val account:String,val id:String,val artist:String,val score:Double=0.0){val identity get()=account to id}
internal object QueueRecommendations {
 fun eligible(kind:String,playing:Boolean,repeat:String,sleepEnd:Boolean,remaining:Int,secondsLeft:Double)=kind in setOf("music","local")&&playing&&repeat=="off"&&!sleepEnd&&remaining in 0..1&&secondsLeft.isFinite()&&secondsLeft>0&&(remaining==1||secondsLeft<=60)
 fun select(candidates:List<QueueCandidate>,excluded:Set<Pair<String,String>>,hidden:Set<Pair<String,String>>,hiddenArtists:Set<String>,lastArtist:String,count:Int=10):List<QueueCandidate>{
  fun artist(value:String)=value.trim().lowercase(Locale.ROOT)
  val rows=candidates.distinctBy{it.identity}.filter{it.identity !in excluded&&it.identity !in hidden&&artist(it.artist) !in hiddenArtists}.sortedWith(compareByDescending<QueueCandidate>{it.score}.thenBy{it.account}.thenBy{it.id}).toMutableList()
  val result=mutableListOf<QueueCandidate>();var previous=artist(lastArtist)
  while(rows.isNotEmpty()&&result.size<count){var at=rows.indexOfFirst{previous.isBlank()||artist(it.artist)!=previous};if(at<0)at=0;val next=rows.removeAt(at);result.add(next);previous=artist(next.artist)}
  return result
 }
}
