package local.mediacenter.library
import org.json.JSONObject
import org.json.JSONArray
import java.security.MessageDigest

internal data class OfflineCollectionRule(val id:String,val account:String,val kind:String,val item:String,val title:String,val enabled:Boolean,val unmetered:Boolean,val limit:Int,val legacyLast:Long=0){
 fun fingerprint():String=MessageDigest.getInstance("SHA-256").digest(JSONArray(listOf(account,kind,item,enabled,unmetered,limit)).toString().toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
}
/** Definitions are user preferences; runtime checkpoints live separately so UI saves cannot overwrite them. */
internal object OfflineRulesPlan {
 fun definitions(ui:JSONObject):List<OfflineCollectionRule> {
  val raw=ui.opt("offlineRules");if(raw==null||raw==JSONObject.NULL)return emptyList()
  require(raw is JSONArray&&raw.length()<=100){"Use up to 100 offline rules"}
  val rows=(0 until raw.length()).map{parse(raw.getJSONObject(it))}
  require(rows.map{it.id}.distinct().size==rows.size){"Offline rule identities must be unique"};return rows
 }
 fun parse(row:JSONObject):OfflineCollectionRule {
  val id=row.getString("id");val account=row.getString("account");val kind=row.getString("kind");val item=row.optString("item");val limit=row.getInt("limit")
  require(id.length in 1..150&&account.length in 1..512&&kind in setOf("album","playlist","favorites")&&item.length<=1000&&limit in 1..500)
  require(kind=="favorites"||item.isNotBlank());require(row.opt("enabled") is Boolean&&row.opt("unmetered") is Boolean)
  return OfflineCollectionRule(id,account,kind,item,row.getString("title").take(250),row.getBoolean("enabled"),row.getBoolean("unmetered"),limit,row.optLong("lastRun",0).coerceAtLeast(0))
 }
 fun due(rule:OfflineCollectionRule,status:JSONObject?,now:Long):Boolean {if(!rule.enabled)return false;val same=status?.optString("fingerprint")==rule.fingerprint();val last=if(same)status!!.optLong("lastChecked",0) else if(status==null)rule.legacyLast else 0L;return last<=0||now<last||now-last>=3600000}
 fun ids(raw:JSONObject,rule:OfflineCollectionRule,savedOnly:Boolean):List<String> {
  val rows=when(rule.kind){"album"->raw.getJSONObject("album").getJSONArray("song");"playlist"->raw.getJSONObject("playlist").getJSONArray("entry");else->raw.getJSONObject("starred2").optJSONArray("song")?:JSONArray()};val out=linkedSetOf<String>()
  for(i in 0 until rows.length()){val row=rows.getJSONObject(i);if(savedOnly&&!row.optBoolean("saved"))continue;val id=row.optString("id");require(id.isNotBlank()&&id.length<=1000){"The collection returned an invalid track identity"};out.add(id);if(out.size>=rule.limit)break};return out.toList()
 }
 fun method(rule:OfflineCollectionRule)=when(rule.kind){"album"->"getAlbum";"playlist"->"getPlaylist";else->"getStarred2"}
}
