package local.mediacenter.library
import org.json.*
import java.security.MessageDigest

/** Jellyfin 10.11.11: an explicit stopped-position report, never a fictional playback-start session. */
internal object JellyfinOfflineProgressPlan {
 fun checkpoint(raw:JSONObject,manifest:JSONObject):Double {
  val item=manifest.getJSONObject("item");require(raw.optBoolean("offline")&&raw.optString("source")==manifest.getString("source")&&raw.optString("kind")==item.getString("kind")){"Play this cached video version first to create a pending offline position"}
  require(kotlin.math.abs(raw.getDouble("duration")-item.getDouble("duration"))<1){"The cached video version changed. Play it before reviewing progress."}
  return OfflineProgressPlan.position(raw.getDouble("position"),item.getDouble("duration"))
 }
 fun remote(raw:JSONObject,manifest:JSONObject):JSONObject {
  val item=manifest.getJSONObject("item");val expected=when(item.getString("kind")){"movie"->"Movie";"videoEpisode"->"Episode";else->throw IllegalArgumentException("Choose a cached movie or episode")}
  require(JellyfinPlaylistPlan.id(raw.getString("Id"))==JellyfinPlaylistPlan.id(manifest.getString("id"))&&raw.getString("Type")==expected){"The server returned another video"}
  val duration=raw.getDouble("RunTimeTicks")/10000000;require(kotlin.math.abs(duration-item.getDouble("duration"))<1){"The original video changed. Refresh its cache before syncing."}
  val sources=raw.getJSONArray("MediaSources");require((0 until sources.length()).any{sources.getJSONObject(it).getString("Id")==manifest.getString("source")}){"The cached video version is no longer available on the server"}
  val data=raw.getJSONObject("UserData");require(data.opt("Played") is Boolean){"Server completion state is unavailable"}
  val ticks=data.getDouble("PlaybackPositionTicks");require(ticks.isFinite()&&ticks%1==0.0)
  return JSONObject().put("currentTime",OfflineProgressPlan.position(ticks/10000000,duration)).put("isFinished",data.getBoolean("Played")).put("playCount",data.optInt("PlayCount")).put("lastPlayed",data.opt("LastPlayedDate")?:JSONObject.NULL)
 }
 fun revision(a:JSONObject,manifest:JSONObject,local:String,remote:JSONObject):String {
  val value=JSONArray().put(a.getString("id")).put(a.getString("url")).put(a.getString("userId")).put(a.getString("accessToken")).put(manifest.getString("key")).put(manifest.getString("source")).put(local)
  for(key in listOf("currentTime","isFinished","playCount","lastPlayed"))value.put(remote.get(key))
  return MessageDigest.getInstance("SHA-256").digest(value.toString().toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
 }
 fun payload(manifest:JSONObject,position:Double)=JSONObject().put("ItemId",JellyfinPlaylistPlan.id(manifest.getString("id"))).put("MediaSourceId",manifest.getString("source")).put("PositionTicks",(OfflineProgressPlan.position(position,manifest.getJSONObject("item").getDouble("duration"))*10000000).toLong()).put("Failed",false)
}
