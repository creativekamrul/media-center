package local.mediacenter.library
import android.content.Context
import java.net.*
import java.io.File
import org.json.*
internal object NativeLyrics {
 private fun cache(c:Context,id:String)=File(File(c.filesDir,"lyrics-cache").apply{mkdirs()},CustomizationData.key("lyrics",id)+".json")
 private fun track()=JSONObject(Playback.state()).optJSONObject("track")?:error("Choose a music track first")
 fun validate(identity:String){CustomizationData.lyricsIdentity(track(),identity)}
 fun save(c:Context,identity:String,text:String){validate(identity);require(text.length<=100000&&!text.contains('\u0000'));val edit=c.getSharedPreferences("custom_lyrics",Context.MODE_PRIVATE).edit();if(text.isBlank())edit.remove(identity) else edit.putString(identity,text);check(edit.commit())}
 private fun request(path:String):String {
  val connection=URI("https://lrclib.net/api/$path").toURL().openConnection() as HttpURLConnection
  try{connection.instanceFollowRedirects=false;connection.connectTimeout=10000;connection.readTimeout=15000;connection.setRequestProperty("User-Agent","MediaCenterMobile/1.0 (https://github.com/creativekamrul/media-center)");if(connection.responseCode==404)return "{}";require(connection.responseCode==200){"Lyrics service unavailable. Saved lyrics are kept."};return connection.inputStream.use{input->val output=java.io.ByteArrayOutputStream();val block=ByteArray(8192);while(true){val n=input.read(block);if(n<0)break;require(output.size()+n<=1024*1024){"Lyrics response too large"};output.write(block,0,n)};String(output.toByteArray(),Charsets.UTF_8)}}finally{connection.disconnect()}
 }
 private fun normalized(d:JSONObject)=CustomizationData.lyricsFields(d)
 fun get(c:Context):String {
  val t=track();val identity=t.getString("account")+":"+t.getString("id");CustomizationData.lyricsIdentity(t,identity)
  c.getSharedPreferences("custom_lyrics",Context.MODE_PRIVATE).getString(identity,null)?.let{return JSONObject().put(if(CustomizationData.synced(it))"synced" else "plain",it).put("custom",true).toString()}
  val saved=cache(c,identity);if(saved.isFile){saved.setLastModified(System.currentTimeMillis());return saved.readText(Charsets.UTF_8)}
  val fields=mapOf("track_name" to t.getString("title"),"artist_name" to t.optString("artist"),"album_name" to t.optString("album"),"duration" to t.optDouble("duration",0.0).toInt().toString());val query=fields.entries.joinToString("&"){ProviderHttp.segment(it.key)+"="+ProviderHttp.segment(it.value)}
  val data=normalized(JSONObject(request("get?$query")));val value=data.toString()
  if(data.optString("synced").isNotBlank()||data.optString("plain").isNotBlank()||data.optBoolean("instrumental")){
   val temp=File(saved.parentFile,saved.name+"."+java.util.UUID.randomUUID()+".partial");try{temp.writeText(value,Charsets.UTF_8);check(temp.renameTo(saved))}finally{temp.delete()}
   val files=saved.parentFile?.listFiles()?.filter{it.extension=="json"}?.sortedBy{it.lastModified()}?:emptyList();var bytes=files.sumOf{it.length()};for(file in files){if(bytes<=8*1024*1024)break;if(file!=saved){val length=file.length();if(file.delete())bytes-=length}}
  }
  return value
 }
 fun search(identity:String,query:String):String {validate(identity);require(query.trim().length in 2..200);val raw=request("search?q="+ProviderHttp.segment(query.trim()));val rows=if(raw=="{}")JSONArray() else JSONArray(raw);return JSONArray((0 until minOf(20,rows.length())).map{i->val row=rows.getJSONObject(i);normalized(row).put("id",row.getLong("id")).put("title",row.optString("trackName")).put("artist",row.optString("artistName")).put("album",row.optString("albumName")).put("duration",row.optDouble("duration"))}).toString()}
}
