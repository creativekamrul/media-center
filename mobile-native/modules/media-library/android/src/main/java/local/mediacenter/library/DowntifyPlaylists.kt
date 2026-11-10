package local.mediacenter.library
import org.json.*

internal object DowntifyPlaylists {
 private fun row(a:JSONObject,id:String):JSONObject {
  require(id.isNotEmpty()&&id.length<=512)
  val rows=Downtify.playlistRows(a)
  return (0 until rows.length()).mapNotNull{rows.optJSONObject(it)}.singleOrNull{it.optString("name")==id}?:throw IllegalArgumentException("Playlist not found or no longer visible to this account")
 }
 private fun entries(a:JSONObject,r:JSONObject):List<JSONObject>{
  val files=r.getJSONArray("files");require(files.length()<=10000){"This playlist is too large to edit"}
  val tracks=Downtify.playlistTracks(a,r.getString("name"));val byId=tracks.associateBy{it.getString("id")}
  return (0 until files.length()).map{i->val id=Downtify.fileId(files.getString(i));byId[id]?:throw IllegalStateException("A playlist file is missing or hidden. Restore it in Downtify before editing.")}
 }
 fun read(a:JSONObject,id:String):JSONObject {Downtify.clearCache();val r=row(a,id);val rows=entries(a,r);return JSONObject().put("id",r.getString("name")).put("name",r.getString("name")).put("revision",DowntifyPlaylistPlan.revision(a,r)).put("entry",JSONArray(rows)).put("writable",DowntifyPlaylistPlan.writable(r)).put("renameable",DowntifyPlaylistPlan.renameable(r)).put("reorderable",false)}
 fun save(a:JSONObject,edit:PlaylistEdit):JSONObject {
  val name=DowntifyPlaylistPlan.name(edit.name)
  if(edit.id.isEmpty()){
   require(edit.ids.isEmpty()){"Create the empty playlist first, then add saved songs"}
   val result=Downtify.playlistWrite(a,"api/library/playlists",JSONObject().put("name",name));val id=result.getString("name")
   return read(a,id)
  }
  Downtify.clearCache();val current=row(a,edit.id);require(DowntifyPlaylistPlan.writable(current)){"Only manual playlists you own or may edit can be changed. Imported playlists and liked songs remain read-only."}
  require(edit.revision.isNotEmpty()&&edit.revision==DowntifyPlaylistPlan.revision(a,current)){"This playlist or its permissions changed. Reload it before saving."}
  val rows=entries(a,current);val ids=rows.map{it.getString("id")};val membership=DowntifyPlaylistPlan.membership(ids,edit.ids);val changed=membership.add.isNotEmpty()||membership.remove.isNotEmpty();val renamed=name!=edit.id
  require(!(changed&&renamed)){"Save track changes and renaming separately so an interrupted request cannot leave a partially applied edit"}
  val target=if(renamed){require(DowntifyPlaylistPlan.renameable(current)){"Only the owner can rename this playlist"};Downtify.playlistWrite(a,"api/library/playlists/rename",JSONObject().put("name",edit.id).put("new_name",name)).getString("name")}else{
   if(changed)Downtify.playlistWrite(a,"api/library/playlists/tracks",JSONObject().put("name",edit.id).put("add",JSONArray(Downtify.savedFiles(a,membership.add))).put("remove",JSONArray(Downtify.savedFiles(a,membership.remove))))
   edit.id
  }
  val result=read(a,target);val actual=result.getJSONArray("entry");require((0 until actual.length()).map{actual.getJSONObject(it).getString("id")}==edit.ids){"The server returned a different playlist. Reload before making another edit."};return result
 }
}
