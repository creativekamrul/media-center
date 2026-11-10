package local.mediacenter.library
import android.content.Context
import org.json.JSONObject

/** Explicit review only. No automatic overwrite, session creation, listening-time replay or uncertain-write retry. */
internal object OfflineProgress {
 private fun local(c:Context,key:String)=c.getSharedPreferences("spoken_checkpoints",Context.MODE_PRIVATE).getString(key,null)?:throw IllegalStateException("Play the cached item first to create a local resume point")
 private fun target(manifest:JSONObject):SpokenTarget=when(manifest.getString("kind")){"book"->SpokenTarget.Book(manifest.getString("item"));"podcast"->SpokenTarget.Episode(manifest.getString("item"),manifest.getString("episode"));else->throw IllegalArgumentException("Choose a cached book or episode")}
 private fun remote(a:JSONObject,t:SpokenTarget,duration:Double,persist:(JSONObject)->Unit):JSONObject {
  // Establish the exact playable identity and current file timeline before treating progress 404 as new.
  val raw=Audiobookshelf.json(a,"api/items/${ProviderHttp.segment(t.itemId)}?expanded=1",persist);require(raw.getString("id")==t.itemId)
  val files=SpokenDownloadPlan.files(raw,t);val actual=files.last().start+files.last().duration;require(kotlin.math.abs(actual-duration)<1){"The original media changed; refresh its cache before syncing"}
  val progress=try{Audiobookshelf.json(a,OfflineProgressPlan.path(t),persist)}catch(e:ProviderStatus){if(e.status!=404)throw e;null}
  return OfflineProgressPlan.server(progress,t,duration)
 }
 fun review(c:Context,key:String,read:(String)->JSONObject,persist:(JSONObject)->Unit):JSONObject {
  val manifest=SpokenCache.progressManifest(c,key);val t=target(manifest);val a=read(manifest.getString("account"));require(a.optString("type")=="audiobookshelf");val duration=manifest.getDouble("duration");val text=local(c,t.key(a.getString("id")));val checkpoint=JSONObject(text);require(checkpoint.optBoolean("offline")){"This item has no pending offline checkpoint"};val at=OfflineProgressPlan.position(checkpoint.getDouble("currentTime"),duration);val server=remote(a,t,duration,persist)
  return JSONObject().put("key",key).put("title",manifest.getString("title")).put("duration",duration).put("local",at).put("server",server.getDouble("currentTime")).put("finished",server.getBoolean("isFinished")).put("updatedAt",checkpoint.optLong("updatedAt")).put("revision",OfflineProgressPlan.revision(a,t,text,server))
 }
 fun apply(c:Context,key:String,revision:String,choice:String,read:(String)->JSONObject,persist:(JSONObject)->Unit):String {
  require(revision.matches(Regex("[0-9a-f]{64}"))&&choice in setOf("local","server"))
  return Playback.idleProgressEdit {
   val manifest=SpokenCache.progressManifest(c,key);val t=target(manifest);val a=read(manifest.getString("account"));require(a.optString("type")=="audiobookshelf");val duration=manifest.getDouble("duration");val localKey=t.key(a.getString("id"));val text=local(c,localKey);val checkpoint=JSONObject(text);require(checkpoint.optBoolean("offline")){"This offline checkpoint was already reviewed"};val server=remote(a,t,duration,persist);OfflineProgressPlan.unchanged(revision,OfflineProgressPlan.revision(a,t,text,server))
   var selected=server.getDouble("currentTime")
   if(choice=="local"){
    selected=OfflineProgressPlan.position(checkpoint.getDouble("currentTime"),duration)
    try{Audiobookshelf.request(a,OfflineProgressPlan.path(t),persist,OfflineProgressPlan.payload(selected,duration,server),"PATCH")}catch(_:Exception){throw IllegalStateException("The server update could not be confirmed. Your offline checkpoint is kept. Refresh the preview before trying again.")}
    val confirmed=remote(a,t,duration,persist);check(kotlin.math.abs(confirmed.getDouble("currentTime")-selected)<1){"The server did not confirm this position. Your offline checkpoint is kept; refresh the preview."}
   }
   check(local(c,localKey)==text){"The local position changed. Refresh the preview."}
   val saved=JSONObject(text).put("currentTime",selected).put("duration",duration).put("offline",false).put("updatedAt",System.currentTimeMillis())
   check(c.getSharedPreferences("spoken_checkpoints",Context.MODE_PRIVATE).edit().putString(localKey,saved.toString()).commit()){ "Could not save the local resume point" }
   "Resume position updated. No listening time was uploaded."
  }
 }
}
