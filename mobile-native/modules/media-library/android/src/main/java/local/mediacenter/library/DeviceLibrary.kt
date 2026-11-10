package local.mediacenter.library
import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract as Documents
import android.media.MediaMetadataRetriever
import org.json.*
import java.net.URI
import java.security.MessageDigest
object DeviceLibrary {
 private fun prefs(c:Context)=c.getSharedPreferences("device_library",Context.MODE_PRIVATE)
 private fun hash(s:String)=MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString(""){"%02x".format(it)}
 fun scan(c:Context,tree:Uri):Int {
  require(tree.scheme=="content");val rows=JSONArray();val seen=mutableSetOf<String>()
  fun visit(id:String,depth:Int){require(depth<=25&&seen.size<20000){"Folder is too large. Choose a smaller audio folder."};if(!seen.add(id))return
   val children=Documents.buildChildDocumentsUriUsingTree(tree,id)
   c.contentResolver.query(children,arrayOf(Documents.Document.COLUMN_DOCUMENT_ID,Documents.Document.COLUMN_DISPLAY_NAME,Documents.Document.COLUMN_MIME_TYPE),null,null,null)?.use{cursor->while(cursor.moveToNext()){
    val child=cursor.getString(0);val name=cursor.getString(1);val mime=cursor.getString(2)?:""
    if(mime==Documents.Document.MIME_TYPE_DIR)visit(child,depth+1)
    else if(mime.startsWith("audio/")||name.substringAfterLast('.').lowercase() in setOf("flac","mp3","m4a","m4b","opus","ogg","wav","aac","aiff","ape","alac","dsf","dff")){require(rows.length()<10000){"Choose a folder with fewer than 10,000 audio files."};val uri=Documents.buildDocumentUriUsingTree(tree,child).toString();rows.put(JSONObject().put("id",hash(uri)).put("title",name.substringBeforeLast('.')).put("artist","Local audio").put("uri",uri).put("tree",tree.toString()))}
   }}
  }
  visit(Documents.getTreeDocumentId(tree),0)
  val old=JSONArray(prefs(c).getString("files","[]"));val combined=JSONArray();for(i in 0 until old.length()){val row=old.getJSONObject(i);if(row.optString("tree")!=tree.toString())combined.put(row)};for(i in 0 until rows.length())combined.put(rows.get(i));check(prefs(c).edit().putString("files",combined.toString()).commit());return rows.length()
 }
 fun list(c:Context):JSONObject{fun safe(key:String):JSONArray{val raw=JSONArray(prefs(c).getString(key,"[]"));return JSONArray((0 until raw.length()).map{val r=raw.getJSONObject(it);JSONObject().put("id",r.getString("id")).put("title",r.getString("title")).put("artist",r.optString("artist"))})};return JSONObject().put("files",safe("files")).put("stations",safe("stations"))}
 fun radio(c:Context,title:String,url:String,http:Boolean){require(title.length in 1..200);val u=URI(url.trim());require(u.scheme=="https"||(http&&u.scheme=="http")){"Use HTTPS or explicitly enable HTTP"};require(!u.host.isNullOrBlank()&&u.userInfo==null&&u.fragment==null);val rows=JSONArray(prefs(c).getString("stations","[]"));rows.put(JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("title",title).put("url",u.toString()));check(prefs(c).edit().putString("stations",rows.toString()).commit())}
 fun remove(c:Context,id:String,station:Boolean){val key=if(station)"stations" else "files";val rows=JSONArray(prefs(c).getString(key,"[]"));check(prefs(c).edit().putString(key,JSONArray((0 until rows.length()).map{rows.getJSONObject(it)}.filter{it.getString("id")!=id}).toString()).commit())}
 fun play(c:Context,id:String,station:Boolean):Playable{val rows=JSONArray(prefs(c).getString(if(station)"stations" else "files","[]"));val row=(0 until rows.length()).map{rows.getJSONObject(it)}.firstOrNull{it.getString("id")==id}?:throw IllegalArgumentException("Item unavailable")
  if(station)return Playable("radio",id,row.getString("title"),"Internet radio","","",row.getString("url"),0.0,kind="radio")
  val uri=Uri.parse(row.getString("uri"));require(uri.scheme=="content");val fd=requireNotNull(c.contentResolver.openFileDescriptor(uri,"r"));var title=row.getString("title");var artist="Local audio";var album="";var duration=0.0
  try{val meta=MediaMetadataRetriever();try{meta.setDataSource(c,uri);title=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)?:title;artist=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)?:artist;album=meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)?:album;duration=(meta.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toDoubleOrNull()?:0.0)/1000}finally{meta.release()}}catch(_:Exception){}
  return Playable("device",id,title,artist,album,"","fd://"+fd.fd,duration,descriptor=fd,kind="local")
 }
}
