package local.mediacenter.library
import org.json.JSONObject
import java.security.MessageDigest

data class PlaylistEdit(val id:String,val name:String,val ids:List<String>,val revision:String){
 companion object {
  fun parse(r:JSONObject):PlaylistEdit {val name=r.getString("name").trim();require(name.isNotEmpty()&&name.length<=200);val entries=r.getJSONArray("ids");require(entries.length()<=10000);val ids=(0 until entries.length()).map{entries.getString(it)};require(ids.all{it.isNotEmpty()&&it.length<=512});val id=r.optString("id");require(id.length<=512);return PlaylistEdit(id,name,ids,r.optString("revision"))}
  fun requireWritable(p:JSONObject,user:String){require(!p.optBoolean("readonly")&&p.optString("owner")==user){"This playlist is read-only for this account"}}
  fun revision(p:JSONObject):String {val entries=p.optJSONArray("entry");val ids=(0 until (entries?.length()?:0)).map{entries!!.getJSONObject(it).getString("id")};val value=org.json.JSONArray(listOf(p.optString("id"),p.optString("name"),p.optString("changed"),p.optString("comment"),p.optBoolean("public"),org.json.JSONArray(ids))).toString();return MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}}
 }
 // One update request removes old occurrences, then inserts the desired ordered list.
 // No de-duplication: repeated tracks are distinct playlist occurrences.
 fun fields(current:JSONObject?):List<Pair<String,String>> {
  if(current==null)return listOf("name" to name)+ids.map{"songId" to it}
  require(current.getString("id")==id)
  val count=current.optJSONArray("entry")?.length()?:0
  return listOf("playlistId" to id,"name" to name)+(0 until count).map{"songIndexToRemove" to it.toString()}+ids.map{"songIdToAdd" to it}
 }
}
