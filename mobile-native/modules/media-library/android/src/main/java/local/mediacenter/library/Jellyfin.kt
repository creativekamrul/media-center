package local.mediacenter.library

import org.json.*

/** Jellyfin 10.11.11: native authentication, explicit media types, original streams only. */
object Jellyfin {
 fun headers(a:JSONObject)=mapOf("Authorization" to ("MediaBrowser Client=\"Media Center Android\", Device=\"Android\", DeviceId=\"${a.getString("id")}\", Version=\"0.3.1\""+a.optString("accessToken").takeIf{it.isNotBlank()}?.let{", Token=\"$it\""}.orEmpty()))
 fun login(a:JSONObject){val r=ProviderHttp.json(a,"Users/AuthenticateByName",headers(a),JSONObject().put("Username",a.getString("username")).put("Pw",a.getString("password")));a.put("accessToken",r.getString("AccessToken")).put("userId",r.getJSONObject("User").getString("Id"));a.put("version",test(a))}
 fun test(a:JSONObject):String {ProviderHttp.json(a,"Users/Me",headers(a));return ProviderHttp.json(a,"System/Info/Public").optString("Version","Jellyfin")}
 fun get(a:JSONObject,path:String)=ProviderHttp.json(a,path,headers(a))
 fun item(row:JSONObject):JSONObject {
  val type=row.getString("Type")
  val kind=when(type){"Audio"->"track";"Movie"->"movie";"Episode"->"videoEpisode";"Series"->"series";"Season"->"season";"MusicAlbum"->"album";"MusicArtist"->"artist";"Playlist"->"playlist";"CollectionFolder","Folder","BoxSet"->"folder";else->"unsupported"}
  val artists=row.optJSONArray("Artists")?:JSONArray()
  return JSONObject().put("id",row.getString("Id")).put("kind",kind).put("title",row.optString("Name")).put("artist",if(artists.length()>0)artists.optString(0) else row.optString("SeriesName")).put("album",if(type=="Audio")row.optString("Album") else "").put("coverArt",row.getString("Id")).put("duration",row.optDouble("RunTimeTicks",0.0)/10000000).put("overview",row.optString("Overview")).put("year",row.optInt("ProductionYear",0)).put("resume",(row.optJSONObject("UserData")?.optDouble("PlaybackPositionTicks",0.0)?:0.0)/10000000).put("genres",row.optJSONArray("Genres")?:JSONArray()).put("played",row.optJSONObject("UserData")?.optBoolean("Played",false)?:false)
 }
 private fun normalize(r:JSONObject):JSONObject {val rows=r.optJSONArray("Items")?:JSONArray();return JSONObject().put("items",JSONArray((0 until rows.length()).map{item(rows.getJSONObject(it))})).put("total",r.optInt("TotalRecordCount",rows.length()))}
 internal fun requireMusicSeed(row:JSONObject){require(row.optString("Type")=="Audio"){"Choose a music track for radio"}}
 internal fun musicSimilarResponse(raw:JSONObject):JSONObject {val rows=raw.optJSONArray("Items")?:JSONArray();val tracks=JSONArray();for(i in 0 until rows.length()){val row=rows.optJSONObject(i)?:continue;if(row.optString("Type")=="Audio"&&tracks.length()<60)tracks.put(item(row))};return JSONObject().put("items",tracks).put("total",tracks.length())}
 fun browse(a:JSONObject,mode:String,id:String,offset:Int):JSONObject {
  require(offset in 0..1000000&&id.length<=512)
  val user=ProviderHttp.segment(a.getString("userId"));val common="UserId=$user&Fields=Overview,Genres,MediaSources&EnableUserData=true"
  return when(mode){
   "music-similar"->{requireMusicSeed(get(a,"Users/$user/Items/${ProviderHttp.segment(id)}"));musicSimilarResponse(get(a,"Items/${ProviderHttp.segment(id)}/Similar?$common&Limit=60"))}
   "artist-albums"->normalize(get(a,"Items?$common&Recursive=true&IncludeItemTypes=MusicAlbum&ArtistIds=${ProviderHttp.segment(id)}&StartIndex=$offset&Limit=40&SortBy=SortName&SortOrder=Ascending"))
   "music"->normalize(get(a,"Items?$common&Recursive=true&IncludeItemTypes=Audio&StartIndex=$offset&Limit=40&SortBy=SortName&SortOrder=Ascending"))
   "libraries"->normalize(get(a,"Users/$user/Views"))
   "items"->normalize(get(a,"Items?$common&ParentId=${ProviderHttp.segment(id)}&StartIndex=$offset&Limit=40&SortBy=SortName&SortOrder=Ascending"))
   "search"->normalize(get(a,"Items?$common&Recursive=true&SearchTerm=${ProviderHttp.segment(id)}&Limit=60&IncludeItemTypes=Audio,MusicAlbum,MusicArtist,Movie,Series,Episode"))
   "resume"->normalize(get(a,"Users/$user/Items/Resume?Limit=16&MediaTypes=Video&EnableUserData=true"))
   "suggested"->normalize(get(a,"Items?$common&Recursive=true&Limit=24&IncludeItemTypes=Movie,Series,MusicAlbum&IsPlayed=false&SortBy=Random"))
   "detail"->item(get(a,"Users/$user/Items/${ProviderHttp.segment(id)}"))
   else->throw IllegalArgumentException("Unsupported Jellyfin view")
  }
 }
 fun prepare(a:JSONObject,id:String):JellyfinMedia {
  require(id.length in 1..512);val user=ProviderHttp.segment(a.getString("userId"));val safe=ProviderHttp.segment(id)
  val row=get(a,"Users/$user/Items/$safe");require(row.getString("Id")==id){"The server returned another item"};val type=row.getString("Type");require(type in setOf("Audio","Movie","Episode")){"Choose a track, movie or episode"}
  val info=get(a,"Items/$safe/PlaybackInfo?UserId=$user");val sources=info.getJSONArray("MediaSources");require(sources.length()>0){"No media source is available"}
  val source=(0 until sources.length()).map{sources.getJSONObject(it)}.firstOrNull{it.optString("Protocol")=="File"&&!it.optBoolean("IsInfiniteStream")&&!it.optBoolean("RequiresOpening")}?:throw IllegalArgumentException("This item does not expose a supported original file")
  val sourceId=source.getString("Id");val path=if(type=="Audio")"Audio/$safe/stream" else "Videos/$safe/stream"
  val url=ProviderHttp.sameOrigin(a,"$path?Static=true&MediaSourceId=${ProviderHttp.segment(sourceId)}")
  return JellyfinMedia(a,id,item(row),url,sourceId,info.optString("PlaySessionId"),"X-Emby-Token: "+a.getString("accessToken"),source.optString("Container"))
 }
 internal fun reportPayload(m:JellyfinMedia,event:String,position:Double,paused:Boolean,failed:Boolean=false):JSONObject {
  require(event in setOf("Playing","Progress","Stopped"));require(position.isFinite()&&position>=0);require(!failed||event=="Stopped")
  val body=JSONObject().put("ItemId",m.id).put("MediaSourceId",m.source).put("PlaySessionId",m.session).put("PositionTicks",(position*10000000).toLong()).put("IsPaused",paused).put("CanSeek",true).put("PlayMethod","DirectPlay")
  if(failed)body.put("Failed",true);return body
 }
 fun report(m:JellyfinMedia,event:String,position:Double,paused:Boolean,failed:Boolean=false){if(m.offline)return;val body=reportPayload(m,event,position,paused,failed);val path=if(event=="Playing")"Sessions/Playing" else "Sessions/Playing/$event";ProviderHttp.bytes(m.account,path,headers(m.account),body)}
}
data class JellyfinMedia(val account:JSONObject,val id:String,val item:JSONObject,val url:String,val source:String,val session:String,val headers:String,val container:String="",val descriptor:android.os.ParcelFileDescriptor?=null,val offline:Boolean=false)
