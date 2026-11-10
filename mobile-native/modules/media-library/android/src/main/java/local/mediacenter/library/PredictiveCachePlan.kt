package local.mediacenter.library
import org.json.*

internal object PredictiveCachePlan {
 fun key(account:String,id:String)=JSONArray(listOf(account,id)).toString()
 fun select(snapshot:JSONObject,ahead:Int,excluded:Set<String>,remaining:Int):List<Pair<String,String>> {
  require(ahead in setOf(0,1,3,5)&&remaining in 0..50)
  if(ahead==0||remaining==0||!snapshot.optBoolean("loaded")||!snapshot.optBoolean("playing")||snapshot.optJSONObject("track")?.optString("kind")!="music")return emptyList()
  val rows=snapshot.getJSONArray("queue");require(rows.length()<=5000);val at=snapshot.getInt("index");if(at !in 0 until rows.length())return emptyList()
  val seen=excluded.toMutableSet();val current=rows.getJSONObject(at);seen.add(key(current.getString("account"),current.getString("id")));val result=mutableListOf<Pair<String,String>>()
  for(i in at+1 until minOf(rows.length(),at+1+ahead)){val row=rows.getJSONObject(i);if(row.optString("kind")!="music")continue;val account=row.getString("account");val id=row.getString("id");require(account.length in 1..512&&id.length in 1..512);if(seen.add(key(account,id)))result.add(account to id);if(result.size>=remaining)break}
  return result
 }
 fun sameQueue(before:JSONObject,after:JSONObject)=after.optBoolean("loaded")&&after.optBoolean("playing")&&before.optLong("queueVersion",-1)==after.optLong("queueVersion",-2)&&before.optInt("index",-1)==after.optInt("index",-2)
}
