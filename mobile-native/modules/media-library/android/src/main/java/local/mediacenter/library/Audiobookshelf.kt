package local.mediacenter.library

import org.json.*

/** Audiobookshelf 2.35.1. All tokens and audio URLs stay in native code. */
object Audiobookshelf {
 @Volatile var reload:((String)->JSONObject)?=null
 private fun headers(a:JSONObject)=mapOf("Authorization" to "Bearer "+a.getString("accessToken"))
 private fun tokens(a:JSONObject,response:JSONObject){
  val user=response.getJSONObject("user")
  val access=user.optString("accessToken").ifBlank{user.optString("token")}
  require(access.isNotBlank()){ "Audiobookshelf did not return an access token" }
  a.put("accessToken",access)
  user.optString("refreshToken").takeIf{it.isNotBlank()}?.let{a.put("refreshToken",it)}
 }
 fun login(a:JSONObject){
  tokens(a,ProviderHttp.json(a,"login",mapOf("x-return-tokens" to "true"),JSONObject().put("username",a.getString("username")).put("password",a.getString("password"))))
  a.put("version","Audiobookshelf")
 }
 fun request(a:JSONObject,path:String,persist:(JSONObject)->Unit,body:JSONObject?=null,method:String=if(body==null)"GET" else "POST"):Pair<ByteArray,String> = AccountRequestLocks.withAccount(a.getString("id")){requestLocked(a,path,persist,body,method)}
 private fun requestLocked(a:JSONObject,path:String,persist:(JSONObject)->Unit,body:JSONObject?,method:String):Pair<ByteArray,String>{
  val stored=reload?.invoke(a.getString("id"))
  if(stored!=null){
   require(stored.optString("url")==a.optString("url")&&stored.optString("username")==a.optString("username")){"Connection changed. Start playback again."}
   a.put("accessToken",stored.getString("accessToken"));a.put("refreshToken",stored.optString("refreshToken"))
  }
  try{return ProviderHttp.bytes(a,path,headers(a),body,method)}catch(e:ProviderStatus){
   if(e.status!=401||a.optString("refreshToken").isBlank())throw e
   // Only rejected authorization is retried; uncertain progress writes are not.
   tokens(a,ProviderHttp.json(a,"auth/refresh",mapOf("x-refresh-token" to a.getString("refreshToken")),JSONObject()))
   val updated=stored?:a
   updated.put("accessToken",a.getString("accessToken")).put("refreshToken",a.optString("refreshToken"))
   persist(updated)
   return ProviderHttp.bytes(a,path,headers(a),body,method)
  }
 }
 fun json(a:JSONObject,path:String,persist:(JSONObject)->Unit,body:JSONObject?=null)=JSONObject(String(request(a,path,persist,body).first,Charsets.UTF_8))
 fun test(a:JSONObject,persist:(JSONObject)->Unit):String {json(a,"api/me",persist);return "Connected"}
 private fun mediaType(item:JSONObject):String {val kind=item.getString("mediaType");require(kind=="book"||kind=="podcast"){"Unsupported Audiobookshelf media type"};return kind}
 private fun item(row:JSONObject):JSONObject {
  val kind=mediaType(row);val media=row.getJSONObject("media");val metadata=media.getJSONObject("metadata")
  return JSONObject().put("id",row.getString("id")).put("kind",if(kind=="book")"book" else "show").put("title",metadata.optString("title")).put("artist",metadata.optString("authorName",metadata.optString("author"))).put("duration",media.optDouble("duration",0.0)).put("coverArt",row.getString("id"))
 }
 fun libraries(a:JSONObject,persist:(JSONObject)->Unit):JSONObject {
  val rows=json(a,"api/libraries",persist).getJSONArray("libraries");val out=JSONArray()
  for(i in 0 until rows.length()){val row=rows.getJSONObject(i);out.put(JSONObject().put("id",row.getString("id")).put("kind","library").put("mediaType",mediaType(row)).put("title",row.getString("name")))}
  return JSONObject().put("items",out)
 }
 fun items(a:JSONObject,id:String,offset:Int,persist:(JSONObject)->Unit):JSONObject {
  require(offset>=0&&offset%40==0)
  val result=json(a,"api/libraries/${ProviderHttp.segment(id)}/items?limit=40&page=${offset/40}&minified=1",persist)
  val rows=result.getJSONArray("results");val out=JSONArray();for(i in 0 until rows.length())out.put(item(rows.getJSONObject(i)))
  return JSONObject().put("items",out).put("total",result.getInt("total"))
 }
 fun detail(a:JSONObject,id:String,persist:(JSONObject)->Unit):JSONObject {
  // Expanded shows include episodes even when minified list responses do not.
  val row=json(a,"api/items/${ProviderHttp.segment(id)}?expanded=1&include=progress",persist);val kind=mediaType(row);val result=item(row);val media=row.getJSONObject("media")
  if(kind=="podcast"){
   val episodes=media.optJSONArray("episodes")?:JSONArray();val out=JSONArray()
   for(i in 0 until episodes.length()){val e=episodes.getJSONObject(i);out.put(JSONObject().put("id",e.getString("id")).put("showId",id).put("addedAt",e.optLong("addedAt",0)).put("year",e.optString("pubDate").take(4).toIntOrNull()).put("kind","episode").put("title",e.optString("title")).put("duration",e.optJSONObject("audioFile")?.optDouble("duration",0.0)?:0.0).put("coverArt",id))}
   result.put("items",out)
  }else{
   val chapters=media.optJSONArray("chapters")?:JSONArray();val out=JSONArray()
   for(i in 0 until chapters.length()){val chapter=chapters.getJSONObject(i);out.put(JSONObject().put("title",chapter.optString("title")).put("start",chapter.getDouble("start")).put("end",chapter.getDouble("end")))}
   result.put("chapters",out).put("series",BookSeriesPlan.memberships(row))
  }
  return result
 }
 fun series(a:JSONObject,bookId:String,seriesId:String,offset:Int,persist:(JSONObject)->Unit):JSONObject {
  require(bookId.length in 1..512&&seriesId.length in 1..512&&offset in 0..100000&&offset%40==0)
  val book=json(a,"api/items/${ProviderHttp.segment(bookId)}?expanded=1",persist);require(book.getString("id")==bookId){"The server returned another book"};val library=BookSeriesPlan.anchor(book,seriesId)
  val info=json(a,"api/libraries/${ProviderHttp.segment(library)}/series/${ProviderHttp.segment(seriesId)}?include=progress",persist)
  val filter="series."+java.util.Base64.getEncoder().encodeToString(seriesId.toByteArray(Charsets.UTF_8))
  val page=json(a,"api/libraries/${ProviderHttp.segment(library)}/items?limit=40&page=${offset/40}&minified=0&sort=sequence&filter=${ProviderHttp.segment(filter)}",persist)
  return BookSeriesPlan.page(book,seriesId,info,page)
 }
 fun search(a:JSONObject,query:String,persist:(JSONObject)->Unit):JSONObject {
  require(query.length in 1..300)
  val libs=json(a,"api/libraries",persist).getJSONArray("libraries");val out=JSONArray()
  for(i in 0 until libs.length()){
   val lib=libs.getJSONObject(i);mediaType(lib)
   val result=json(a,"api/libraries/${ProviderHttp.segment(lib.getString("id"))}/search?q=${ProviderHttp.segment(query)}&limit=40",persist)
   for(kind in listOf("book","podcast")){val rows=result.optJSONArray(kind)?:JSONArray();for(j in 0 until rows.length())out.put(item(rows.getJSONObject(j).getJSONObject("libraryItem")))}
  }
  return JSONObject().put("items",out)
 }
 fun session(a:JSONObject,target:SpokenTarget,persist:(JSONObject)->Unit):JSONObject {
  val expanded=json(a,"api/items/${ProviderHttp.segment(target.itemId)}?expanded=1",persist)
  require(mediaType(expanded)==if(target is SpokenTarget.Book)"book" else "podcast"){"Playback target does not match server media type"}
  if(target is SpokenTarget.Episode){val episodes=expanded.getJSONObject("media").optJSONArray("episodes")?:JSONArray();require((0 until episodes.length()).any{episodes.getJSONObject(it).getString("id")==target.episodeId}){"Episode no longer exists in this show"}}
  val result=json(a,target.playPath(),persist,JSONObject().put("forceDirectPlay",true).put("mediaPlayer","mpv").put("deviceInfo",JSONObject().put("deviceId",a.getString("id")+"-android").put("clientName","Media Center Android").put("clientVersion","0.2.0")))
  require(result.getInt("playMethod")==0){"Server did not provide original audio"}
  val tracks=result.getJSONArray("audioTracks");require(tracks.length()>0){"No audio files in this session"}
  for(i in 0 until tracks.length()){val part=tracks.getJSONObject(i);part.put("contentUrl",ProviderHttp.sameOrigin(a,part.getString("contentUrl")));require(part.getDouble("duration")>0&&part.getDouble("startOffset")>=0)}
  return result
 }
}
