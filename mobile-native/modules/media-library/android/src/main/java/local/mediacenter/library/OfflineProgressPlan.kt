package local.mediacenter.library
import org.json.JSONObject
import org.json.JSONArray
import java.security.MessageDigest

/** ABS 2.35.1 whole-book / individually identified episode progress, never listening-time deltas. */
internal object OfflineProgressPlan {
 fun path(target:SpokenTarget)="api/me/progress/"+ProviderHttp.segment(target.itemId)+(if(target is SpokenTarget.Episode)"/"+ProviderHttp.segment(target.episodeId) else "")
 fun position(value:Double,duration:Double):Double {require(duration.isFinite()&&duration>0&&value.isFinite()&&value>=0&&value<=duration+1){"Invalid progress position"};return value.coerceAtMost(duration)}
 fun server(raw:JSONObject?,target:SpokenTarget,duration:Double):JSONObject {
  if(raw==null)return JSONObject().put("currentTime",0.0).put("isFinished",false).put("exists",false)
  require(raw.optString("libraryItemId")==target.itemId){"The server returned progress for another item"}
  when(target){is SpokenTarget.Book->require(raw.isNull("episodeId")||raw.optString("episodeId").isBlank()){ "A book cannot use episode progress" };is SpokenTarget.Episode->require(raw.optString("episodeId")==target.episodeId){"The server returned progress for another episode"}}
  require(raw.opt("isFinished") is Boolean){"Server completion state is unavailable"}
  val result=JSONObject().put("currentTime",position(raw.getDouble("currentTime"),duration)).put("isFinished",raw.getBoolean("isFinished")).put("exists",true)
  for(key in listOf("lastUpdate","duration","hideFromContinueListening","progress","ebookProgress","ebookLocation","finishedAt"))if(raw.has(key))result.put(key,raw.get(key))
  return result
 }
 fun revision(account:JSONObject,target:SpokenTarget,local:String,remote:JSONObject):String {
  val stable=JSONArray().put(account.getString("id")).put(account.getString("url")).put(account.optString("username")).put(account.optString("authMode")).put(account.optString("accessToken")).put(target.key(account.getString("id"))).put(local)
  for(key in listOf("exists","currentTime","isFinished","lastUpdate","duration","hideFromContinueListening","progress","ebookProgress","ebookLocation","finishedAt"))stable.put(remote.opt(key)?:JSONObject.NULL)
  return MessageDigest.getInstance("SHA-256").digest(stable.toString().toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
 }
 fun payload(at:Double,duration:Double,remote:JSONObject):JSONObject=JSONObject().put("currentTime",position(at,duration)).put("duration",duration).apply {
  // Keep the server's explicit continue-listening preference. ABS derives completion from the new position.
  if(remote.has("hideFromContinueListening"))put("hideFromContinueListening",remote.getBoolean("hideFromContinueListening"))
 }
 fun unchanged(expected:String,actual:String){require(expected==actual){"Progress changed since the preview. Review the latest positions before choosing again."}}
}
