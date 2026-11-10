package local.mediacenter.library

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract as Documents
import org.json.*
import java.util.UUID

/** Ownership is native and explicit. Names alone never authorize rewriting shared playlists. */
internal object ManagedPlaylists {
 private fun prefs(c:Context)=c.getSharedPreferences("media_downloads",Context.MODE_PRIVATE)
 private fun read(c:Context,uri:Uri):ByteArray=requireNotNull(c.contentResolver.openInputStream(uri)).use{input->val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192);while(true){val n=input.read(buffer);if(n<0)break;require(out.size()+n<=2*1024*1024){"Playlist exceeds 2 MiB"};out.write(buffer,0,n)};out.toByteArray()}
 private fun hash(bytes:ByteArray)=BackupArchive.digest(bytes)
 private fun exports(c:Context):List<JSONObject>{val rows=JSONArray(prefs(c).getString("playlists","[]"));return (0 until rows.length()).map{rows.getJSONObject(it)}}
 private fun save(c:Context,entry:JSONObject){check(prefs(c).edit().putString("playlists",JSONArray(exports(c).filterNot{it.optString("uri")==entry.getString("uri")}+entry).toString()).commit())}
 private fun write(c:Context,uri:Uri,bytes:ByteArray){requireNotNull(c.contentResolver.openOutputStream(uri,"wt")).use{it.write(bytes)};require(read(c,uri).contentEquals(bytes)){"Folder could not confirm the playlist write"}}
 fun export(c:Context,tree:Uri,parent:Uri,title:String,account:String,baseName:String,keys:List<String>,paths:List<String>){
  val bytes=PortablePlaylist.render(paths).toByteArray(Charsets.UTF_8)
  val prior=exports(c).lastOrNull{it.optString("tree")==tree.toString()&&it.optString("title")==title&&it.optString("account")==account&&it.has("sha256")}
  val reusable=prior?.takeIf{runCatching{hash(read(c,Uri.parse(it.getString("uri"))))==it.getString("sha256")}.getOrDefault(false)}
  val uri=if(reusable!=null)Uri.parse(reusable.getString("uri"))else requireNotNull(Documents.createDocument(c.contentResolver,parent,"audio/x-mpegurl",baseName+" - "+UUID.randomUUID()+".m3u8"))
  write(c,uri,bytes);save(c,JSONObject().put("uri",uri.toString()).put("tree",tree.toString()).put("title",title).put("account",account).put("keys",JSONArray(keys)).put("sha256",hash(bytes)))
 }
 fun rewrite(c:Context,entry:JSONObject,oldPaths:List<String>,newPaths:List<String>,remaining:List<String>){
  val uri=Uri.parse(entry.getString("uri"));val bytes=read(c,uri)
  val expected=entry.optString("sha256").ifBlank{hash(PortablePlaylist.render(oldPaths).toByteArray(Charsets.UTF_8))}
  require(hash(bytes)==expected){"A linked playlist changed outside the app. Link it again before removing its cached files."}
  val next=PortablePlaylist.render(newPaths).toByteArray(Charsets.UTF_8);write(c,uri,next);entry.put("keys",JSONArray(remaining)).put("sha256",hash(next))
 }
 private data class Preview(val token:String,val uri:Uri,val tree:String,val bytesHash:String,val index:String,val keys:List<String>,val name:String,val expires:Long)
 private var preview:Preview?=null
 fun preview(c:Context,selected:Uri):String=OfflineStore.maintenance{synchronized(this){
  preview=null;val tree=Uri.parse(requireNotNull(OfflineStore.folder(c)){"Choose a cache folder first"});require(selected.scheme=="content"&&selected.authority==tree.authority){"Choose a playlist inside this Cache folder's Playlists directory"}
  val root=Documents.buildDocumentUriUsingTree(tree,Documents.getTreeDocumentId(tree));var directory:Uri?=null
  c.contentResolver.query(Documents.buildChildDocumentsUriUsingTree(root,Documents.getDocumentId(root)),arrayOf(Documents.Document.COLUMN_DOCUMENT_ID,Documents.Document.COLUMN_DISPLAY_NAME),null,null,null)?.use{rows->while(rows.moveToNext())if(rows.getString(1)=="Playlists")directory=Documents.buildDocumentUriUsingTree(root,rows.getString(0))}
  val parent=requireNotNull(directory){"No Playlists directory exists in this Cache folder"};var name=""
  c.contentResolver.query(Documents.buildChildDocumentsUriUsingTree(parent,Documents.getDocumentId(parent)),arrayOf(Documents.Document.COLUMN_DOCUMENT_ID,Documents.Document.COLUMN_DISPLAY_NAME),null,null,null)?.use{rows->while(rows.moveToNext())if(Documents.buildDocumentUriUsingTree(parent,rows.getString(0)).let{it.authority==selected.authority&&Documents.getDocumentId(it)==Documents.getDocumentId(selected)})name=rows.getString(1)}
  require(name.endsWith(".m3u8",true)||name.endsWith(".m3u",true)){"Choose an M3U8 or UTF-8 M3U file in this Cache folder's Playlists directory"}
  val uri=Documents.buildDocumentUriUsingTree(parent,Documents.getDocumentId(selected));val bytes=read(c,uri);val index=prefs(c).getString("items","[]")!!;val rows=JSONArray(index)
  val byPath=(0 until rows.length()).map{rows.getJSONObject(it)}.filter{it.optString("tree")==tree.toString()}.groupBy{"../"+it.optString("path","Music/"+it.getString("name"))}.mapValues{(_,rs)->rs.map{it.getString("key")}}
  val keys=LegacyPlaylistPlan.keys(LegacyPlaylistPlan.paths(bytes),byPath);val token=UUID.randomUUID().toString();preview=Preview(token,uri,tree.toString(),hash(bytes),hash(index.toByteArray()),keys,name,android.os.SystemClock.elapsedRealtime()+5*60000)
  JSONObject().put("token",token).put("name",name).put("tracks",keys.size).toString()
 }}
 fun apply(c:Context,token:String):Boolean=OfflineStore.maintenance{synchronized(this){
  val p=requireNotNull(preview){"Choose the playlist again"};require(token==p.token&&android.os.SystemClock.elapsedRealtime()<=p.expires&&OfflineStore.folder(c)==p.tree){"Playlist preview expired. Choose it again."}
  require(hash(read(c,p.uri))==p.bytesHash&&hash(prefs(c).getString("items","[]")!!.toByteArray())==p.index){"Playlist or cached library changed. Choose the file again."}
  save(c,JSONObject().put("uri",p.uri.toString()).put("tree",p.tree).put("keys",JSONArray(p.keys)).put("sha256",p.bytesHash));preview=null;true
 }}
}
