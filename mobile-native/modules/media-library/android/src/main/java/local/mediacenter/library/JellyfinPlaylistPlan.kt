package local.mediacenter.library
import org.json.*
import java.security.MessageDigest

/** Jellyfin 10.11.11 playlist DTOs. Sharing fields are intentionally omitted from update payloads. */
internal object JellyfinPlaylistPlan {
 fun id(value:String):String {val normalized=value.replace("-","").lowercase();require(normalized.matches(Regex("[0-9a-f]{32}"))){"Invalid Jellyfin identity"};return normalized}
 fun permission(raw:JSONObject,user:String){require(id(raw.getString("UserId"))==id(user)&&raw.opt("CanEdit") is Boolean&&raw.getBoolean("CanEdit")){"This Jellyfin playlist is read-only for this account"}}
 fun ids(raw:JSONArray):List<String>{require(raw.length()<=10000);return (0 until raw.length()).map{id(raw.getString(it))}}
 fun revision(a:JSONObject,meta:JSONObject,management:JSONObject,permission:JSONObject):String {
  val data=JSONArray().put(a.getString("id")).put(a.getString("url")).put(a.getString("userId")).put(a.getString("accessToken")).put(id(meta.getString("Id"))).put(meta.getString("Name")).put(meta.optString("DateLastSaved")).put(meta.optString("DateModified")).put(JSONArray(ids(management.getJSONArray("ItemIds")))).put(management.optBoolean("OpenAccess")).put(management.optJSONArray("Shares")?:JSONArray()).put(permission.getBoolean("CanEdit"))
  return MessageDigest.getInstance("SHA-256").digest(data.toString().toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
 }
 fun payload(edit:PlaylistEdit,current:List<String>?):JSONObject {
  val desired=edit.ids.map{ id(it) };val result=JSONObject().put("Name",edit.name)
  if(current!=null&&desired==current)return result // Rename-only must preserve any legacy duplicate occurrences.
  require(desired.distinct().size==desired.size){"Jellyfin removes duplicate tracks. Use an app playlist to keep repeated tracks."}
  return result.put("Ids",JSONArray(desired))
 }
}
