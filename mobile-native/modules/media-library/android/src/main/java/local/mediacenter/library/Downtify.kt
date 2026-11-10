package local.mediacenter.library
import org.json.*
import java.net.*
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap

/** Version 3.9 adapter. Network credentials and file paths remain native. */
object Downtify {
 private var storage:android.content.SharedPreferences?=null
 fun attach(c:android.content.Context){storage=c.getSharedPreferences("downtify_pending",android.content.Context.MODE_PRIVATE)}
 fun retain(a:JSONObject,ids:List<String>){val edit=storage?.edit()?:return;for(id in ids){val row=records[a.getString("id")+":"+id]?:continue;val safe=JSONObject();for(field in listOf("file","name","title","artists","artist","album_name","album","song_id","youtube_id","video_id","duration","cover_url","url"))if(row.has(field))safe.put(field,row.get(field));edit.putString(a.getString("id")+":"+id,safe.toString())};check(edit.commit())}

 private val records=ConcurrentHashMap<String,JSONObject>()
 fun isSavedTrack(account:String,id:String):Boolean=(records[account+":"+id]?:storage?.getString(account+":"+id,null)?.let{JSONObject(it)})?.optString("file")?.isNotBlank()==true
 private fun enc(s:String)=URLEncoder.encode(s,"UTF-8").replace("+","%20")
 private fun hash(s:String)=MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString(""){"%02x".format(it)}
 private fun request(a:JSONObject,path:String,body:JSONObject?=null):Pair<ByteArray,String>{
  require(!path.startsWith('/')&&!path.substringBefore('?').contains(".."))
  val base=URI(a.getString("url"));val url=URI(a.getString("url").trimEnd('/')+"/"+path)
  require(url.scheme==base.scheme&&url.authority==base.authority)
  val c=url.toURL().openConnection() as HttpURLConnection
  try{c.instanceFollowRedirects=false;c.connectTimeout=15000;c.readTimeout=25000;c.setRequestProperty("Cookie",a.optString("cookie"));c.setRequestProperty("Origin",base.scheme+"://"+base.authority)
   if(body!=null){c.requestMethod="POST";c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
   require(c.responseCode in 200..299){if(c.responseCode==401||c.responseCode==403)"Downtify sign-in expired or was rejected. Edit the connection to sign in again." else "Downtify returned HTTP ${c.responseCode}"}
   c.headerFields.entries.firstOrNull{it.key?.equals("Set-Cookie",true)==true}?.value?.firstOrNull{it.startsWith("downtify_session=")}?.let{a.put("cookie",it.substringBefore(';'))}
   val bytes=c.inputStream.use{input->val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(16384);while(true){val n=input.read(buffer);if(n<0)break;require(out.size()+n<=16*1024*1024){"Downtify response exceeds the safe limit"};out.write(buffer,0,n)};out.toByteArray()}
   return bytes to (c.contentType?.substringBefore(';')?:"application/octet-stream")
  }finally{c.disconnect()}
 }
 private fun json(a:JSONObject,path:String,body:JSONObject?=null)=JSONTokener(String(request(a,path,body).first,Charsets.UTF_8)).nextValue()
 fun login(a:JSONObject){val status=json(a,"api/auth/status") as JSONObject
  if(!status.optBoolean("auth_disabled")){json(a,"api/auth/login",JSONObject().put("username",a.getString("username")).put("password",a.getString("password")));require(a.optString("cookie").isNotBlank()){ "Downtify did not return a session. Use password sign-in." }}
  a.put("version",test(a))
 }
 fun test(a:JSONObject):String {val s=json(a,"api/auth/status") as JSONObject;require(s.optBoolean("auth_disabled")||s.optBoolean("signed_in")){"Downtify session expired. Edit the connection to reconnect."};val v=json(a,"api/version");return if(v is JSONObject)v.optString("version",v.optString("current_version","Connected")) else v.toString()}
 private fun normalize(a:JSONObject,row:JSONObject):JSONObject {
  val file=row.optString("file");val title=row.optString("name",row.optString("title"));require(title.isNotBlank()){"Downtify returned an untitled track"}
  val artists=row.optJSONArray("artists");val artist=if(artists!=null)(0 until artists.length()).joinToString(", "){artists.optString(it)} else row.optString("artist")
  val album=row.optString("album_name",row.optString("album"));val id=hash(file.ifBlank{row.optString("song_id").ifBlank{"$artist\n$title\n$album"}})
  records[a.getString("id")+":"+id]=row
  return JSONObject().put("id",id).put("title",title).put("artist",artist).put("album",album).put("duration",row.optDouble("duration",0.0)).put("coverArt",id).put("saved",file.isNotBlank()).also{TrackMetadata.remember(a.getString("id"),it)}
 }
 private val trackCache=mutableMapOf<String,Pair<Long,List<JSONObject>>>()
 @Synchronized fun clearCache(){trackCache.clear()}
 @Synchronized private fun tracks(a:JSONObject,path:String="tracks"):List<JSONObject>{val key=a.getString("id")+":"+path;val now=System.currentTimeMillis();trackCache[key]?.let{if(now-it.first<30000)return it.second};val d=json(a,path);val rows=if(d is JSONArray)d else (d as JSONObject).optJSONArray("tracks")?:d.optJSONArray("songs")?:JSONArray();return (0 until rows.length()).map{normalize(a,rows.getJSONObject(it))}.also{if(trackCache.size>=8)trackCache.remove(trackCache.keys.first());trackCache[key]=now to it}}
 internal fun fileId(file:String)=hash(file)
 internal fun playlistRows(a:JSONObject)=json(a,"playlists") as JSONArray
 internal fun playlistTracks(a:JSONObject,name:String)=tracks(a,"tracks?playlist="+enc(name))
 internal fun playlistWrite(a:JSONObject,path:String,body:JSONObject)=json(a,path,body) as JSONObject
 internal fun savedFiles(a:JSONObject,ids:List<String>):List<String> = ids.map{id->
  val record=records[a.getString("id")+":"+id]?:throw IllegalArgumentException("Find this saved song again before adding it")
  val file=record.optString("file");require(file.isNotBlank()&&hash(file)==id){"Only saved library songs can be added to server playlists"};file
 }
 fun browse(a:JSONObject,method:String,p:Map<String,String>):JSONObject {
  val id=p["id"]?:"";val offset=p["offset"]?.toIntOrNull()?:p["songOffset"]?.toIntOrNull()?:0
  require(offset>=0)
  return when(method){
   "getFavoriteTracks"->{val ids=JSONArray(p["ids"]?:"[]");val wanted=(0 until ids.length()).map{ids.getString(it)}.toSet();JSONObject().put("starred2",JSONObject().put("song",JSONArray(tracks(a).filter{it.getString("id") in wanted})))}
   "getMusicFolders"->JSONObject().put("musicFolders",JSONObject().put("musicFolder",JSONArray()))
   "getPlaylists"->{val d=json(a,"playlists") as JSONArray;val items=JSONArray();for(i in 0 until d.length()){val row=d.get(i);val name=if(row is String)row else (row as JSONObject).getString("name");items.put(JSONObject().put("id",name).put("name",name))};JSONObject().put("playlists",JSONObject().put("playlist",items))}
   "getPlaylist"->JSONObject().put("playlist",JSONObject().put("entry",JSONArray(tracks(a,"tracks?playlist="+enc(id)))))
   "search3"->{val rows=tracks(a,"tracks?q="+enc(p["query"]?:"")).drop(offset).take(40);JSONObject().put("searchResult3",JSONObject().put("song",JSONArray(rows)))}
   "discover"->{val query=p["query"]?:"";val rows=tracks(a,if(query.isBlank())"api/discover/chart?limit=50" else "api/songs/search?query="+enc(query));JSONObject().put("searchResult3",JSONObject().put("song",JSONArray(rows)))}
   "getAlbum"->{val rows=tracks(a).filter{hash(it.getString("artist")+"\n"+it.getString("album"))==id};JSONObject().put("album",JSONObject().put("song",JSONArray(rows)))}
   "getArtists"->{val rows=tracks(a).groupBy{it.getString("artist")}.map{(name,rows)->JSONObject().put("id",hash(name)).put("name",name).put("coverArt",rows.first().getString("id"))};JSONObject().put("artists",JSONObject().put("index",JSONArray().put(JSONObject().put("artist",JSONArray(rows)))))}
   "getAlbumList2","getArtist"->{val rows=tracks(a).filter{method!="getArtist"||hash(it.getString("artist"))==id}.groupBy{it.getString("artist")+"\n"+it.getString("album")}.map{(key,rows)->JSONObject().put("id",hash(key)).put("name",rows.first().getString("album").ifBlank{"Singles"}).put("artist",rows.first().getString("artist")).put("songCount",rows.size).put("coverArt",rows.first().getString("id"))}.sortedBy{it.getString("name")};JSONObject().put(if(method=="getArtist")"artist" else "albumList2",JSONObject().put("album",JSONArray(if(method=="getArtist")rows else rows.drop(offset).take(40))))}
   else->throw IllegalArgumentException("Unsupported Downtify library operation")
  }
 }
 fun save(a:JSONObject,ids:List<String>):Int {
  require(ids.size in 1..5000)
  val songs=JSONArray()
  // Resolve all identities before submitting; never report partial validation as success.
  for(id in ids.distinct()){
   val row=records[a.getString("id")+":"+id]?:throw IllegalStateException("Refresh the discoveries before saving this track")
   if(row.optString("file").isNotBlank())continue
   val t=normalize(a,row)
   songs.put(JSONObject().put("name",t.getString("title")).put("artists",row.optJSONArray("artists")?:JSONArray().put(t.getString("artist"))).put("song_id",row.optString("song_id",id)).put("album_name",t.getString("album")).put("duration",t.optDouble("duration")).put("url",row.optString("url")).put("youtube_id",row.optString("youtube_id",row.optString("video_id"))).put("cover_url",row.optString("cover_url")))
  }
  if(songs.length()>0)json(a,"api/download/batch",JSONObject().put("songs",songs).put("generate_m3u",false))
  return songs.length()
 }
 fun resolve(a:JSONObject,id:String):Playable {
  var row=records[a.getString("id")+":"+id]?:storage?.getString(a.getString("id")+":"+id,null)?.let{JSONObject(it)};if(row==null){tracks(a);row=records[a.getString("id")+":"+id]};requireNotNull(row){"Track is no longer available. Refresh this library."}
  val normalized=normalize(a,row);val file=row.optString("file")
  val path=if(file.isNotBlank()){require(!file.startsWith('/')&&!file.contains('\\')&&!file.contains(':')&&file.split('/').none{it==".."}){"Invalid saved file path"};"media/"+file.split('/').joinToString("/"){enc(it)}} else {
   var video=row.optString("youtube_id",row.optString("video_id",row.optString("song_id")))
   if(!video.matches(Regex("[A-Za-z0-9_-]{11}"))){val matches=tracks(a,"api/songs/search?query="+enc(normalized.getString("artist")+" "+normalized.getString("title")));video=matches.asSequence().mapNotNull{records[a.getString("id")+":"+it.getString("id")]}.map{it.optString("youtube_id",it.optString("video_id",it.optString("song_id")))}.firstOrNull{it.matches(Regex("[A-Za-z0-9_-]{11}"))}?:throw IllegalStateException("Downtify could not find a stream for this track")}
   "api/stream/file?video_id="+enc(video)+"&duration="+normalized.optDouble("duration",0.0)
  }
  return Playable(a.getString("id"),id,normalized.getString("title"),normalized.getString("artist"),normalized.getString("album"),id,a.getString("url")+"/"+path,normalized.optDouble("duration",0.0),"Cookie: "+a.optString("cookie"))
 }
 /** Downtify 3.9.0 /api/url/resolve: metadata only; never starts a download. */
 fun resolveLink(a:JSONObject,url:String):JSONObject {
  val safe=SharedContentData.link(url);val raw=json(a,"api/url/resolve?url="+enc(safe)) as JSONObject
  val kind=raw.optString("kind");require(kind in setOf("track","album","playlist","artist")){"Downtify returned an unsupported link type"}
  fun art(row:JSONObject,key:String):String {if(row.optString("cover_url").isBlank())return "";val id="shared-art-"+hash(key);records[a.getString("id")+":"+id]=row;return id}
  val out=JSONObject().put("kind",kind).put("title",raw.optString("name")).put("subtitle",raw.optString("subtitle")).put("coverArt",art(raw,safe));val tracks=JSONArray();var source=raw.optJSONArray("tracks")?:JSONArray()
  if(kind=="artist")try{source=(json(a,"api/artists/top_songs/url?url="+enc(safe)) as JSONObject).optJSONArray("songs")?:source}catch(_:Exception){out.put("warning","Popular tracks unavailable. Releases remain available.")}
  for(n in 0 until minOf(source.length(),5000)){val row=source.optJSONObject(n)?:continue;tracks.put(normalize(a,row))}
  if(source.length()>5000)out.put("warning","Showing the first 5,000 tracks returned by Downtify.")
  val albums=JSONArray();val releases=raw.optJSONArray("albums")?:JSONArray()
  for(n in 0 until minOf(releases.length(),2000)){val row=releases.optJSONObject(n)?:continue;val target=row.optString("url",row.optString("album_url"));try{SharedContentData.link(target)}catch(_:Exception){continue};albums.put(JSONObject().put("url",target).put("title",row.optString("name",row.optString("title"))).put("coverArt",art(row,target)).put("year",row.optString("year")))}
  return out.put("tracks",tracks).put("albums",albums)
 }
 fun discover(a:JSONObject,mode:String,query:String,id:String):JSONObject {
  require(mode in setOf("discover","artist","album","similar"));require(query.length<=300);if(mode in setOf("artist","album"))require(id.matches(Regex("[0-9]{1,30}")))
  fun shelves(rows:JSONArray?,kind:String):JSONArray {val out=JSONArray();if(rows==null)return out;for(i in 0 until rows.length()){val r=rows.optJSONObject(i)?:continue;val key=r.optString(kind+"_id",r.optString("deezer_id"));if(!key.matches(Regex("[0-9]{1,30}")))continue;val cover=kind+"-"+key;records[a.getString("id")+":"+cover]=r;out.put(JSONObject().put("id",key).put("kind",kind).put("title",r.optString("name",r.optString("title"))).put("artist",r.optString("artist")).put("coverArt",cover).put("year",r.optString("year",r.optString("release_date"))).put("releaseType",r.optString("release_type",r.optString("record_type"))))};return out}
  fun songs(rows:JSONArray?):JSONArray {val out=JSONArray();if(rows!=null)for(i in 0 until rows.length())out.put(normalize(a,rows.getJSONObject(i)));return out}
  val path=when(mode){"similar"->{val row=records[a.getString("id")+":"+id]?:throw IllegalStateException("Refresh this track before finding similar music");val t=normalize(a,row);"api/similar/tracks?artist="+enc(t.getString("artist"))+"&track="+enc(t.getString("title"))+"&limit=30"};"artist"->"api/finder/artist?artist_id="+enc(id);"album"->"api/finder/album?album_id="+enc(id);else->if(query.isBlank())"api/discover/chart?limit=30" else "api/finder/search?query="+enc(query)+"&limit=30"}
  val raw=json(a,path);val data=if(raw is JSONArray)JSONObject().put("tracks",raw) else raw as JSONObject
  val result=JSONObject().put("tracks",songs(data.optJSONArray("songs")?:data.optJSONArray("tracks")?:data.optJSONArray("top_songs"))).put("artists",shelves(if(mode=="artist")JSONArray().put(data) else data.optJSONArray("artists"),"artist")).put("albums",shelves(data.optJSONArray("albums"),"album"))
  if(mode=="artist"){try{val albums=json(a,"api/finder/artist/albums?artist_id="+enc(id));result.put("albums",shelves(if(albums is JSONArray)albums else (albums as JSONObject).optJSONArray("albums"),"album"))}catch(_:Exception){result.put("warning","Discography could not be loaded. Try again.")}}
  if(mode=="discover"&&query.isBlank())try{val library=tracks(a).groupBy{it.getString("artist")}.entries.take(100).map{JSONObject().put("name",it.key).put("tracks",it.value.size).put("liked",0)};if(library.isNotEmpty()){val suggested=json(a,"api/discover",JSONObject().put("library",JSONArray(library))) as JSONObject;val artists=shelves(suggested.optJSONArray("artists"),"artist");if(artists.length()>0)result.put("artists",artists)}}catch(_:Exception){result.put("warning","Personal suggestions unavailable; showing trending music.")}
  return result
 }
 fun cover(a:JSONObject,id:String):Pair<ByteArray,String>{
  var row=records[a.getString("id")+":"+id]?:storage?.getString(a.getString("id")+":"+id,null)?.let{JSONObject(it)};if(row==null){tracks(a);row=records[a.getString("id")+":"+id]};requireNotNull(row){"Artwork unavailable"}
  val file=row.optString("file");if(file.isNotBlank())return request(a,"cover?file="+enc(file))
  val raw=row.optString("cover_url",row.optString("picture_url"));require(raw.isNotBlank()){"Artwork unavailable"}
  val base=URI(a.getString("url")+"/");val uri=base.resolve(raw);require(uri.scheme in setOf("https","http")&&uri.userInfo==null)
  if(uri.authority==base.authority&&uri.scheme==base.scheme)return request(a,uri.rawPath.removePrefix(base.rawPath).trimStart('/')+(uri.rawQuery?.let{"?"+it}?:""))
  val connection=uri.toURL().openConnection() as HttpURLConnection
  try{connection.instanceFollowRedirects=false;connection.connectTimeout=10000;connection.readTimeout=15000;require(connection.responseCode==200);val mime=connection.contentType?.substringBefore(';')?:"";require(mime.startsWith("image/"));val bytes=connection.inputStream.use{input->val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192);while(true){val n=input.read(buffer);if(n<0)break;require(out.size()+n<=8*1024*1024);out.write(buffer,0,n)};out.toByteArray()};return bytes to mime}finally{connection.disconnect()}
 }
}
