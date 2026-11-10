package local.mediacenter.library
import android.content.Context
import org.json.JSONObject

internal object JellyfinOfflineProgress {
 private fun prefs(c:Context)=c.getSharedPreferences("jellyfin_checkpoints",Context.MODE_PRIVATE)
 private fun checkpoint(c:Context,m:JSONObject):String=prefs(c).getString(m.getString("account")+":"+m.getString("id"),null)?:throw IllegalStateException("Play the cached video first to create a local resume point")
 private fun remote(a:JSONObject,m:JSONObject)=JellyfinOfflineProgressPlan.remote(Jellyfin.get(a,"Users/${JellyfinPlaylistPlan.id(a.getString("userId"))}/Items/${JellyfinPlaylistPlan.id(m.getString("id"))}?Fields=MediaSources"),m)
 fun review(c:Context,key:String,read:(String)->JSONObject):JSONObject {
  val m=VideoCache.progressManifest(c,key);val a=read(m.getString("account"));require(a.optString("type")=="jellyfin");val text=checkpoint(c,m);val local=JSONObject(text);require(local.optBoolean("offline")){"This video has no pending offline checkpoint"};val duration=m.getJSONObject("item").getDouble("duration");val at=JellyfinOfflineProgressPlan.checkpoint(local,m);val server=remote(a,m)
  return JSONObject().put("provider","jellyfin").put("key",key).put("title",m.getJSONObject("item").getString("title")).put("duration",duration).put("local",at).put("server",server.getDouble("currentTime")).put("finished",server.getBoolean("isFinished")).put("updatedAt",local.optLong("updatedAt")).put("revision",JellyfinOfflineProgressPlan.revision(a,m,text,server))
 }
 fun apply(c:Context,key:String,revision:String,choice:String,read:(String)->JSONObject):String {
  require(revision.matches(Regex("[0-9a-f]{64}"))&&choice in setOf("local","server"))
  return Playback.idleProgressEdit {
   val m=VideoCache.progressManifest(c,key);val a=read(m.getString("account"));require(a.optString("type")=="jellyfin");val text=checkpoint(c,m);val local=JSONObject(text);require(local.optBoolean("offline")){"This checkpoint was already reviewed"};val at=JellyfinOfflineProgressPlan.checkpoint(local,m);val server=remote(a,m);OfflineProgressPlan.unchanged(revision,JellyfinOfflineProgressPlan.revision(a,m,text,server));var selected=server.getDouble("currentTime")
   if(choice=="local"){
    selected=at
    try{ProviderHttp.bytes(a,"Sessions/Playing/Stopped",Jellyfin.headers(a),JellyfinOfflineProgressPlan.payload(m,selected))}catch(_:Exception){throw IllegalStateException("The Jellyfin update could not be confirmed. Your offline checkpoint is kept. Refresh the preview before retrying.")}
    val confirmed=remote(a,m);check(kotlin.math.abs(confirmed.getDouble("currentTime")-selected)<1){"Jellyfin applied a different resume position, possibly its watched/resume policy. Your checkpoint is kept. Refresh the preview to review the server result."}
   }
   check(checkpoint(c,m)==text){"The local position changed. Refresh the preview."};check(prefs(c).edit().putString(m.getString("account")+":"+m.getString("id"),JSONObject(text).put("position",selected).put("offline",false).put("updatedAt",System.currentTimeMillis()).toString()).commit())
   "Video resume position updated. No playback-start session or listening-time delta was uploaded."
  }
 }
}
