package local.mediacenter.library
import org.json.*
import java.security.MessageDigest

/** Downtify 3.9 manual playlists support membership edits, not arbitrary reordering. */
internal object DowntifyPlaylistPlan {
 fun name(value:String):String {val n=value.trim();require(n.isNotEmpty()&&n.length<=120&&!n.any{it.code<32||it in "/\\:*?\"<>|"}){"Use a playlist name of 1–120 characters without filename punctuation"};return n}
 fun writable(row:JSONObject)=row.opt("manual")==true&&(!row.has("liked")||row.opt("liked")==false)&&(row.opt("mine")==true||row.opt("can_edit_tracks")==true)
 fun renameable(row:JSONObject)=writable(row)&&row.opt("mine")==true
 fun revision(account:JSONObject,row:JSONObject):String {val data=JSONArray();for(k in listOf("id","url","username","cookie"))data.put(account.opt(k));for(k in listOf("name","manual","mine","can_edit_tracks","liked","owner_id","visibility","editors","shared_with","files"))data.put(row.opt(k));return MessageDigest.getInstance("SHA-256").digest(data.toString().toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}}
 data class Membership(val add:List<String>,val remove:List<String>)
 fun membership(current:List<String>,desired:List<String>):Membership {
  require(desired.size<=500){"Downtify manual playlists support at most 500 tracks"}
  require(current.distinct().size==current.size&&desired.distinct().size==desired.size){"Use an app playlist to preserve repeated tracks"}
  val old=current.toSet();val wanted=desired.toSet();val kept=current.filter{it in wanted};val added=desired.filter{it !in old}
  require(desired==kept+added){"Downtify 3.9 can remove songs and append new songs, but cannot reorder existing songs. Use an app playlist for a custom order."}
  return Membership(added,current.filter{it !in wanted})
 }
}
