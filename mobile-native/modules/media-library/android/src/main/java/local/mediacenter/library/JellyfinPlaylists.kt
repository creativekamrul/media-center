package local.mediacenter.library
import org.json.*

internal object JellyfinPlaylists {
 private data class Draft(val view:JSONObject,val ids:List<String>)
 private fun draft(a:JSONObject,identity:String):Draft {
  val id=JellyfinPlaylistPlan.id(identity);val user=JellyfinPlaylistPlan.id(a.getString("userId"));val meta=Jellyfin.get(a,"Users/$user/Items/$id")
  require(meta.getString("Type")=="Playlist"&&JellyfinPlaylistPlan.id(meta.getString("Id"))==id){"Choose a Jellyfin music playlist"}
  val permission=Jellyfin.get(a,"Playlists/$id/Users/$user");JellyfinPlaylistPlan.permission(permission,user)
  val management=Jellyfin.get(a,"Playlists/$id");val desired=JellyfinPlaylistPlan.ids(management.getJSONArray("ItemIds"));val rows=JSONArray();var offset=0
  while(offset<desired.size){val response=Jellyfin.get(a,"Playlists/$id/Items?UserId=$user&StartIndex=$offset&Limit=200&Fields=Genres&EnableUserData=false");val page=response.getJSONArray("Items");require(page.length()>0&&offset+page.length()<=10000){"Some playlist entries are unavailable. Edit this playlist on Jellyfin."};for(i in 0 until page.length()){val row=page.getJSONObject(i);require(row.getString("Type")=="Audio"){"This editor supports music playlists only"};rows.put(Jellyfin.item(row).put("id",JellyfinPlaylistPlan.id(row.getString("Id"))))};offset+=page.length()}
  require((0 until rows.length()).map{rows.getJSONObject(it).getString("id")}==desired){"Playlist entries changed or are unavailable. Reload before editing."}
  return Draft(JSONObject().put("id",id).put("name",meta.getString("Name")).put("entry",rows).put("revision",JellyfinPlaylistPlan.revision(a,meta,management,permission)).put("provider","jellyfin"),desired)
 }
 fun read(a:JSONObject,id:String):JSONObject=draft(a,id).view
 private fun validateTracks(a:JSONObject,ids:List<String>){val user=JellyfinPlaylistPlan.id(a.getString("userId"));for(batch in ids.distinct().chunked(100)){val rows=Jellyfin.get(a,"Items?UserId=$user&Ids=${batch.joinToString(",")}&IncludeItemTypes=Audio&Recursive=true&Limit=100").getJSONArray("Items");val found=(0 until rows.length()).map{val row=rows.getJSONObject(it);require(row.getString("Type")=="Audio");JellyfinPlaylistPlan.id(row.getString("Id"))}.toSet();require(found==batch.toSet()){"A selected track is unavailable or belongs to another media type"}}}
 fun save(a:JSONObject,edit:PlaylistEdit):JSONObject {
  val current=if(edit.id.isNotEmpty())draft(a,edit.id)else null
  if(current!=null)require(current.view.getString("revision")==edit.revision){"This playlist changed on Jellyfin. Reload it before saving."}
  val body=JellyfinPlaylistPlan.payload(edit,current?.ids)
  if(body.has("Ids"))validateTracks(a,edit.ids.map{JellyfinPlaylistPlan.id(it)})
  if(current!=null){val latest=draft(a,edit.id);require(latest.view.getString("revision")==edit.revision){"This playlist changed during validation. Reload it before saving."}}
  val id=if(current==null){body.put("MediaType","Audio").put("IsPublic",false);JellyfinPlaylistPlan.id(ProviderHttp.json(a,"Playlists",Jellyfin.headers(a),body).getString("Id"))}else{val id=JellyfinPlaylistPlan.id(edit.id);ProviderHttp.bytes(a,"Playlists/$id",Jellyfin.headers(a),body);id}
  val confirmed=draft(a,id);require(confirmed.view.getString("name")==edit.name&&confirmed.ids==edit.ids.map{JellyfinPlaylistPlan.id(it)}){"Jellyfin did not confirm the requested order. Reload before trying again."};return confirmed.view
 }
}
