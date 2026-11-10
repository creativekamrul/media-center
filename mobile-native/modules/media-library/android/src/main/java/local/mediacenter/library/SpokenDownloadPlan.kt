package local.mediacenter.library
import org.json.*
data class SpokenFile(val ino:String,val start:Double,val duration:Double)
object SpokenDownloadPlan {
 fun files(raw:JSONObject,target:SpokenTarget):List<SpokenFile>{
  val media=raw.getJSONObject("media")
  val files=when(target){
   is SpokenTarget.Book->{require(raw.getString("mediaType")=="book");val tracks=media.getJSONArray("tracks");(0 until tracks.length()).map{tracks.getJSONObject(it)}}
   is SpokenTarget.Episode->{require(raw.getString("mediaType")=="podcast");val episodes=media.getJSONArray("episodes");val episode=(0 until episodes.length()).map{episodes.getJSONObject(it)}.firstOrNull{it.getString("id")==target.episodeId}?:throw IllegalArgumentException("Episode unavailable");listOf(episode.optJSONObject("audioFile")?:throw IllegalArgumentException("This episode has no downloaded audio on Audiobookshelf"))}
  }
  require(files.isNotEmpty());var offset=0.0
  val parts=files.map{f->val start=if(target is SpokenTarget.Episode)0.0 else f.optDouble("startOffset",offset);val duration=f.getDouble("duration");offset=start+duration;SpokenFile(f.get("ino").toString(),start,duration)}
  AudioTimeline.locate(parts.map{AudioPart(it.ino,it.start,it.duration)},0.0)
  return parts
 }
}
