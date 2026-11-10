package local.mediacenter.library
import org.json.*
import java.security.MessageDigest

/** An original movie/episode version, distinct from every playable music or spoken target. */
internal object VideoCachePlan {
 fun manifest(account:String,id:String,source:String,item:JSONObject,container:String):JSONObject {
  require(account.length in 1..512&&id.length in 1..512&&source.length in 1..512)
  val kind=item.getString("kind");require(kind in setOf("movie","videoEpisode")){"Choose a movie or TV episode to cache"};require(item.getString("id")==id){"The server returned another video"}
  val duration=item.getDouble("duration");require(duration.isFinite()&&duration>0){"The original video has no valid duration"}
  val safe=JSONObject().put("id",id).put("kind",kind).put("title",item.getString("title").take(500)).put("artist",item.optString("artist").take(500)).put("coverArt",id).put("duration",duration).put("resume",resume(item.optDouble("resume",0.0),0.0,duration)).put("year",item.optInt("year")).put("overview",item.optString("overview").take(10000))
  val identity=JSONArray(listOf(account,kind,id,source)).toString();val hash=MessageDigest.getInstance("SHA-256").digest(identity.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
  return JSONObject().put("key","video:$hash").put("file","video-file:$hash").put("account",account).put("id",id).put("source",source).put("container",suffix("",container)).put("item",safe)
 }
 fun suffix(mime:String,container:String):String=when(mime.lowercase()){"video/mp4"->"mp4";"video/x-matroska"->"mkv";"video/webm"->"webm";"video/quicktime"->"mov";"video/mp2t"->"ts";else->container.lowercase().takeIf{it in setOf("mp4","mkv","webm","mov","avi","ts","m2ts","mpeg","mpg","ogv")}?:"video"}
 fun resume(stored:Double,fallback:Double,duration:Double):Double {val value=stored.takeIf{it.isFinite()&&it>=0}?:fallback.takeIf{it.isFinite()&&it>=0}?:0.0;return if(value>=duration-.25)0.0 else value.coerceAtMost(duration)}
}
