package local.mediacenter.library
import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract as Documents
import org.json.*
import java.net.*
import java.security.MessageDigest
import java.util.concurrent.Executors

/** Writes original audio to a user-selected document tree, never private cache folders. */
object OfflineStore {
 private val worker=Executors.newSingleThreadExecutor()
 private val listeners=java.util.concurrent.CopyOnWriteArrayList<()->Unit>()
 internal fun statusChanged()=changed()
 fun addListener(listener:()->Unit){listeners.addIfAbsent(listener)}
 fun removeListener(listener:()->Unit){listeners.remove(listener)}
 private fun changed(){listeners.forEach{runCatching{it()}}}
 @Volatile private var busy=false
 @Volatile private var checking=false
 @Volatile private var recovering=false
 @Volatile private var progress=""
 @Volatile private var active=""
 @Volatile private var activeStatus=""
 private var bytesSnapshot:String?=null
 private var bytesTotal=0L
 private var resolver:((Playable)->Playable)?=null
 private val lock=Any()
 private class Paused:Exception()
 private fun jobs(c:Context)=JSONArray(prefs(c).getString("jobs","[]"))
 private fun saveJobs(c:Context,rows:JSONArray){check(prefs(c).edit().putString("jobs",rows.toString()).commit());changed()}
 private fun change(c:Context,id:String,update:(JSONObject)->Unit)=synchronized(lock){val rows=jobs(c);for(i in 0 until rows.length()){val row=rows.getJSONObject(i);if(row.getString("id")==id){update(row);if(id==active)activeStatus=row.optString("status")}};saveJobs(c,rows)}
 private var lastPolicyCheck=0L
 private fun checkpoint(c:Context){if(android.os.SystemClock.elapsedRealtime()-lastPolicyCheck>1000){lastPolicyCheck=android.os.SystemClock.elapsedRealtime();checkPolicy(c)};if(activeStatus!="downloading")throw Paused()}
 fun policy(c:Context)=CachePolicy.parse(prefs(c).getString("policy","{}")!!)
 fun setPolicy(c:Context,raw:String){val p=CachePolicy.parse(raw);check(prefs(c).edit().putString("policy",p.json().toString()).commit())}
 private fun storedBytes(c:Context):Long=synchronized(lock){
  val raw=prefs(c).getString("items","[]")?:"[]"
  if(raw!=bytesSnapshot){val rows=JSONArray(raw);bytesTotal=(0 until rows.length()).map{rows.getJSONObject(it)}.distinctBy{it.optString("uri")}.sumOf{it.optLong("bytes",0).coerceAtLeast(0)};bytesSnapshot=raw}
  bytesTotal
 }
 private fun checkPolicy(c:Context,incoming:Long=0){
  val manager=c.getSystemService(android.net.ConnectivityManager::class.java)
  val battery=c.getSystemService(android.os.BatteryManager::class.java)
  val reason=policy(c).reason(manager.isActiveNetworkMetered,battery.isCharging,storedBytes(c),incoming)
  if(reason!=null){change(c,active){it.put("status","paused").put("error",reason)};throw Paused()}
 }
 // Initialization is once per native process, not once per React module instance.
 internal fun <T> maintenance(block:()->T):T=synchronized(lock){require(!busy&&!checking&&!recovering&&scheduledLease==null&&!serviceStarting){"Pause transfers and wait for verification before using migration backups"};block()}
 private var initialized=false
 private var serviceRunning=false
 private var serviceStarting=false
 private fun initialize(c:Context,systemRestart:Boolean)=synchronized(lock){
  if(initialized)return@synchronized
  val rows=jobs(c)
  for(i in 0 until rows.length()){val row=rows.getJSONObject(i);row.put("status",CacheJobState.restore(row.optString("status"),systemRestart))}
  saveJobs(c,rows);initialized=true
  if(prefs(c).contains("pendingFile")){recovering=true;worker.execute{try{TransferJournal.recover(c)}catch(_:Exception){progress="An interrupted transfer needs folder access before recovery. Resume it from Cache."}finally{synchronized(lock){recovering=false;pump(c)};changed()}}}
 }
 // Regular WorkManager jobs own only their explicitly tagged transfers; no background FGS launch.
 @Volatile private var scheduledLease:String?=null
 fun beginScheduled(c:Context,owner:String):Boolean=synchronized(lock){
  initialize(c,false);if(busy||checking||recovering||serviceRunning||serviceStarting||scheduledLease!=null)return@synchronized false
  scheduledLease=owner;resolver={NativeTrackResolver.resolve(c,it,false)};true
 }
 fun scheduledPending(c:Context,owner:String):Boolean=synchronized(lock){val rows=jobs(c);(0 until rows.length()).any{val r=rows.getJSONObject(it);ScheduledTransfers.pending(r,owner)}}
 fun endScheduled(c:Context,owner:String){synchronized(lock){if(scheduledLease!=owner)return@synchronized;val rows=jobs(c);for(i in 0 until rows.length()){val row=rows.getJSONObject(i);ScheduledTransfers.pause(row,owner)};saveJobs(c,rows);if(active.isNotEmpty()&&(0 until rows.length()).any{itRow->rows.getJSONObject(itRow).optString("id")==active&&rows.getJSONObject(itRow).optString("scheduledOwner")==owner})activeStatus="paused";scheduledLease=null;runCatching{pump(c)}}}
 fun attach(c:Context,resolve:(Playable)->Playable){synchronized(lock){resolver=resolve;initialize(c,false)}}
 fun serviceReady(c:Context,systemRestart:Boolean){
  val app=c.applicationContext
  synchronized(lock){
   initialize(app,systemRestart)
   resolver={NativeTrackResolver.resolve(app,it,false)}
   Downtify.attach(app)
   SpokenCache.persistAccount={a->EncryptedAccounts.write(app,a.getString("id"),a)}
   Audiobookshelf.reload={id->EncryptedAccounts.read(app,id)}
   serviceStarting=false;serviceRunning=true;pump(app)
  }
 }
 fun serviceStopped(c:Context){synchronized(lock){serviceStarting=false;serviceRunning=false}}
 // Android's data-sync time limit must stop IO before the foreground service is stopped.
 fun serviceTimeout(c:Context){synchronized(lock){val rows=jobs(c);for(i in 0 until rows.length()){val row=rows.getJSONObject(i);if(row.optString("status") in setOf("downloading","queued"))row.put("status","paused").put("error","Android stopped the background transfer. Open Cache and resume when ready.")};saveJobs(c,rows);activeStatus="paused";serviceStarting=false;serviceRunning=false}}
 fun control(c:Context,id:String,action:String){require(action in setOf("pause","resume","cancel"));change(c,id){row->row.put("status",CacheJobState.control(row.optString("status"),action))};if(action=="resume")pump(c)}
 private fun pump(c:Context):Unit=synchronized(lock){
  if(busy||checking||recovering||serviceStarting)return@synchronized
  val rows=jobs(c)
  val next=(0 until rows.length()).map{rows.getJSONObject(it)}.firstOrNull{ScheduledTransfers.selectable(it,scheduledLease)}
  if(next==null){if(serviceRunning){c.stopService(android.content.Intent(c,DownloadService::class.java));serviceRunning=false};return@synchronized}
  if(!serviceRunning&&scheduledLease==null){
   serviceStarting=true
   try{c.startForegroundService(android.content.Intent(c,DownloadService::class.java))}
   catch(e:Exception){serviceStarting=false;change(c,next.getString("id")){it.put("status","paused").put("error","Open the app to resume this transfer.")};throw e}
   return@synchronized
  }
  busy=true;active=next.getString("id")
  change(c,active){it.put("status","downloading").remove("error")}
  worker.execute{
   try{
    checkPolicy(c)
    val ids=next.getJSONArray("tracks")
    val tracks=(0 until ids.length()).map{Playable(next.getString("account"),ids.getString(it),"","","","","",0.0)}
    runJob(c,tracks,next.getString("title"),requireNotNull(resolver))
    change(c,active){if(it.optString("status")=="downloading")it.put("status","complete")}
   }catch(_:Paused){}
   catch(e:Exception){change(c,active){it.put("status",CacheJobState.failed(it.optString("status"))).put("error",if(e is UnexpectedMediaResponse)e.message else "Could not finish. Check the connection and folder, then retry.")}}
   finally{synchronized(lock){busy=false;active="";pump(c)}}
  }
 }

 private fun prefs(c:Context)=c.getSharedPreferences("media_downloads",Context.MODE_PRIVATE)
 fun folder(c:Context)=prefs(c).getString("tree",null)
 fun setFolder(c:Context,uri:Uri){require(!busy&&!checking&&!recovering){"Pause transfers and wait for file verification before changing folders"};require(uri.scheme=="content");require(prefs(c).edit().putString("tree",uri.toString()).commit())}
 fun recordIndex(c:Context):Map<String,JSONObject>{val rows=JSONArray(prefs(c).getString("items","[]"));return (0 until rows.length()).associate{val row=rows.getJSONObject(it);row.getString("key") to row}}
 fun record(c:Context,key:String):JSONObject?{val rows=JSONArray(prefs(c).getString("items","[]"));return (0 until rows.length()).map{rows.getJSONObject(it)}.lastOrNull{it.optString("key")==key}}
 private fun visibleItems(c:Context):JSONArray{val rows=JSONArray(prefs(c).getString("items","[]"));val all=(0 until rows.length()).map{rows.getJSONObject(it)};val index=all.associateBy{it.getString("key")};return JSONArray(all.filter{!it.optString("id").startsWith("spoken-file:")&&!it.optString("id").startsWith("video-file:")}+SpokenCache.items(c,index)+VideoCache.items(c,index))}
 fun state(c:Context):String=JSONObject().put("folder",folder(c)).put("busy",busy).put("message",progress).put("policy",policy(c).json()).put("storedBytes",storedBytes(c)).put("template",prefs(c).getString("template","flat")).put("jobs",synchronized(lock){jobs(c)}).put("items",visibleItems(c)).put("ruleStatus",OfflineRules.status(c)).toString()
 fun remove(c:Context,key:String){synchronized(lock){
  require(!busy&&!checking&&!recovering){"Pause transfers before removing cached files"}
  val keys=(SpokenCache.recordKeys(c,key)?:VideoCache.recordKeys(c,key))?.toSet()?:setOf(key)
  val rows=JSONArray(prefs(c).getString("items","[]"));val all=(0 until rows.length()).map{rows.getJSONObject(it)}
  val keep=all.filter{it.getString("key") !in keys};val shared=keep.map{it.getString("uri")}.toSet();val removed=all.filter{it.getString("key") in keys}
  // Update only playlists created and tracked by this app, before deleting referenced audio.
  val exports=JSONArray(prefs(c).getString("playlists","[]"));val records=keep.associateBy{it.getString("tree")+"|"+it.getString("key")};val before=all.associateBy{it.getString("tree")+"|"+it.getString("key")}
  for(i in 0 until exports.length()){
   val export=exports.getJSONObject(i);val members=export.getJSONArray("keys")
   if((0 until members.length()).none{members.getString(it) in keys})continue
   val remaining=(0 until members.length()).map{members.getString(it)}.filter{it !in keys}
   val paths=remaining.mapNotNull{records[export.getString("tree")+"|"+it]?.let{r->"../"+r.optString("path","Music/"+r.getString("name"))}}
   val oldPaths=(0 until members.length()).map{members.getString(it)}.map{key->val r=requireNotNull(before[export.getString("tree")+"|"+key]){"Playlist references an unavailable cached item"};"../"+r.optString("path","Music/"+r.getString("name"))}
   ManagedPlaylists.rewrite(c,export,oldPaths,paths,remaining)
   check(prefs(c).edit().putString("playlists",exports.toString()).commit())
  }
  check(prefs(c).edit().putString("playlists",exports.toString()).commit())
  for(uri in removed.map{it.getString("uri")}.distinct().filter{it !in shared})require(Documents.deleteDocument(c.contentResolver,Uri.parse(uri))){"Could not remove cached file. Check folder access."}
  check(prefs(c).edit().putString("items",JSONArray(keep).toString()).commit());SpokenCache.forget(c,key);VideoCache.forget(c,key);RetainedArtwork.refresh(c);changed()
 }}

 private fun clean(s:String)=PortableName.stem(s)
 private fun child(c:Context,parent:Uri,name:String,mime:String):Uri {
  val children=Documents.buildChildDocumentsUriUsingTree(parent,Documents.getDocumentId(parent))
  c.contentResolver.query(children,arrayOf(Documents.Document.COLUMN_DOCUMENT_ID,Documents.Document.COLUMN_DISPLAY_NAME),null,null,null)?.use{cursor->while(cursor.moveToNext())if(cursor.getString(1)==name)return Documents.buildDocumentUriUsingTree(parent,cursor.getString(0))}
  return requireNotNull(Documents.createDocument(c.contentResolver,parent,mime,name)){"Folder does not allow creating files"}
 }
 fun start(c:Context,tracks:List<Playable>,playlist:String,scheduledOwner:String?=null,resolve:(Playable)->Playable){require(tracks.isNotEmpty());requireNotNull(folder(c)){"Choose a cache folder first"};resolver=resolve
  synchronized(lock){val rows=jobs(c);val ids=JSONArray(tracks.map{it.id});val duplicate=(0 until rows.length()).map{rows.getJSONObject(it)}.any{it.optString("account")==tracks.first().account&&it.optString("title")==playlist&&it.optString("status") in setOf("queued","downloading","paused")&&it.getJSONArray("tracks").toString()==ids.toString()};if(!duplicate){rows.put(JSONObject().put("id",java.util.UUID.randomUUID().toString()).put("account",tracks.first().account).put("title",playlist).put("scheduledOwner",scheduledOwner).put("tracks",ids).put("status","queued").put("completed",0).put("total",tracks.size));saveJobs(c,rows)}};pump(c)
 }
 fun setTemplate(c:Context,value:String){require(value in setOf("flat","artist-album"));check(prefs(c).edit().putString("template",value).commit())}
 fun verify(c:Context):String {val rows=synchronized(lock){require(!busy&&!checking&&!recovering){"Pause transfers before checking files"};val snapshot=JSONArray(prefs(c).getString("items","[]"));checking=true;snapshot};try{var ok=0;var missing=0;var damaged=0;val checked=mutableMapOf<String,String>()
  for(i in 0 until rows.length()){val r=rows.getJSONObject(i);val uri=r.getString("uri");val status=checked.getOrPut(uri){try{val digest=MessageDigest.getInstance("SHA-256");var count=0L;requireNotNull(c.contentResolver.openInputStream(Uri.parse(uri))).use{input->val block=ByteArray(65536);while(true){val n=input.read(block);if(n<0)break;digest.update(block,0,n);count+=n}};if(count==r.optLong("bytes")&&digest.digest().joinToString(""){"%02x".format(it)}==r.optString("sha256"))"verified" else "damaged"}catch(_:Exception){"unavailable"}};r.put("integrity",status).put("checkedAt",System.currentTimeMillis());when(status){"verified"->ok++;"damaged"->damaged++;else->missing++}}
  check(prefs(c).edit().putString("items",rows.toString()).commit());return "$ok verified · $damaged changed · $missing unavailable. No files were deleted."
 }finally{synchronized(lock){checking=false;pump(c)}}
 }
 private fun runJob(c:Context,tracks:List<Playable>,playlist:String,resolve:(Playable)->Playable){TransferJournal.recover(c);val tree=Uri.parse(requireNotNull(folder(c)))
   val root=Documents.buildDocumentUriUsingTree(tree,Documents.getTreeDocumentId(tree));val audio=child(c,root,"Music",Documents.Document.MIME_TYPE_DIR);val lists=child(c,root,"Playlists",Documents.Document.MIME_TYPE_DIR)
   val entries=JSONArray(prefs(c).getString("items","[]"));val paths=mutableListOf<String>()
   for((index,pending) in tracks.withIndex()){
    checkpoint(c);change(c,active){it.put("completed",index).put("current","Preparing file ${index+1}")};val key=pending.account+":"+pending.id
    val existing=(0 until entries.length()).map{entries.getJSONObject(it)}.lastOrNull{it.optString("key")==key&&it.optString("tree")==tree.toString()}
    if(existing!=null){val exists=try{c.contentResolver.query(Uri.parse(existing.getString("uri")),arrayOf(Documents.Document.COLUMN_DOCUMENT_ID),null,null,null)?.use{it.count>0}?:false}catch(_:Exception){false};if(exists){paths.add("../"+existing.optString("path","Music/"+existing.getString("name")));continue}}
    val t=if(pending.url.isEmpty())resolve(pending) else pending
    change(c,active){it.put("current",t.title)}
    val video=t.kind in setOf("movie","videoEpisode");val relative=if(video)"Videos" else if(prefs(c).getString("template","flat")=="artist-album")"Music/"+clean(t.artist)+"/"+clean(t.album) else "Music"
    val destination=if(video)child(c,root,"Videos",Documents.Document.MIME_TYPE_DIR) else if(relative=="Music")audio else child(c,child(c,audio,clean(t.artist),Documents.Document.MIME_TYPE_DIR),clean(t.album),Documents.Document.MIME_TYPE_DIR)
    val uri=URI(t.url);require(uri.scheme in setOf("http","https")){"This source cannot be downloaded"}
    progress="Downloading ${index+1} of ${tracks.size}"
    val connection=uri.toURL().openConnection() as HttpURLConnection
    try{connection.instanceFollowRedirects=false;connection.connectTimeout=15000;connection.readTimeout=30000
     if(t.headers.startsWith("X-Emby-Token: "))connection.setRequestProperty("X-Emby-Token",t.headers.removePrefix("X-Emby-Token: "))
     if(t.headers.startsWith("Authorization: "))connection.setRequestProperty("Authorization",t.headers.removePrefix("Authorization: "))
     if(t.headers.startsWith("Cookie: "))connection.setRequestProperty("Cookie",t.headers.removePrefix("Cookie: "))
     require(connection.responseCode==200){"Download server returned HTTP ${connection.responseCode}"}
     checkPolicy(c,connection.contentLengthLong.coerceAtLeast(0))
     val mime=DownloadMediaType.original(connection.contentType)
     val suffix=if(video)VideoCachePlan.suffix(mime,t.suffix) else when(mime){"audio/flac","audio/x-flac"->"flac";"audio/mpeg"->"mp3";"audio/wav","audio/x-wav"->"wav";"audio/ogg","application/ogg"->"ogg";"audio/mp4","video/mp4"->"m4a";else->t.suffix.takeIf{it.matches(Regex("[A-Za-z0-9]{2,5}"))}?:"audio"}
     val short=MessageDigest.getInstance("SHA-256").digest(key.toByteArray()).take(6).joinToString(""){"%02x".format(it)}
     val baseName=if(video)clean(t.title)+" - "+short else clean(t.artist)+" - "+clean(t.title)+" - "+short
     val (temp,name)=TransferJournal.begin(c,tree,destination,baseName,suffix,mime)
     var complete=false
     try{var count=0L;val budget=policy(c).budget;val stored=storedBytes(c);val digest=MessageDigest.getInstance("SHA-256")
      connection.inputStream.use{input->requireNotNull(c.contentResolver.openOutputStream(temp,"w")).use{output->val buffer=ByteArray(65536);while(true){checkpoint(c);val n=input.read(buffer);if(n<0)break;if(budget>0&&count+n>budget-stored)checkPolicy(c,count+n);output.write(buffer,0,n);digest.update(buffer,0,n);count+=n}}}
      require(count>0&&(connection.contentLengthLong<0||count==connection.contentLengthLong)){"Download was interrupted"}
      val hash=digest.digest().joinToString(""){"%02x".format(it)}
      val duplicate=(0 until entries.length()).map{entries.getJSONObject(it)}.firstOrNull{it.optString("tree")==tree.toString()&&it.optString("sha256")==hash&&try{c.contentResolver.openFileDescriptor(Uri.parse(it.getString("uri")),"r")?.use{fd->fd.statSize==count}?:false}catch(_:Exception){false}}
      val path=duplicate?.optString("path","Music/"+duplicate.getString("name"))?:"$relative/$name"
      val record=JSONObject().put("key",key).put("tree",tree.toString()).put("account",t.account).put("id",t.id).put("kind",t.kind).put("album",t.album).put("coverArt",t.cover).put("title",t.title).put("artist",t.artist).put("duration",t.duration).put("name",name).put("bytes",count).put("sha256",hash).put("path",path)
      val saved=if(duplicate!=null){require(Documents.deleteDocument(c.contentResolver,temp));Uri.parse(duplicate.getString("uri"))}else{TransferJournal.prepare(c,record);Documents.renameDocument(c.contentResolver,temp,name)?:throw IllegalStateException("Folder cannot finalize the download")}
      record.put("uri",saved.toString());TransferJournal.finish(c,record)
      entries.put(record);complete=true;paths.add("../$path");RetainedArtwork.refresh(c)
     }finally{if(!complete)runCatching{TransferJournal.recover(c)}}
    }finally{connection.disconnect()}
   }
   checkpoint(c);ManagedPlaylists.export(c,tree,lists,playlist,tracks.first().account,clean(playlist),tracks.map{it.account+":"+it.id},paths)
   change(c,active){it.put("completed",tracks.size).put("current","")};progress="Saved ${paths.size} original ${if(paths.size==1)"file" else "files"} and a portable playlist"
 }
 // Resolve before contacting the server. Missing files or revoked SAF access fall back online.
 fun cached(c:Context,pending:Playable):Playable? {
  if(pending.kind!="music") return null
  return try {
   val rows=JSONArray(prefs(c).getString("items","[]"))
   val row=(0 until rows.length()).map{rows.getJSONObject(it)}.lastOrNull{it.optString("key")==pending.account+":"+pending.id}?:return null
   if(!CachedMediaKind.music(row))return null;val uri=Uri.parse(row.getString("uri"));if(uri.scheme!="content")return null
   val descriptor=c.contentResolver.openFileDescriptor(uri,"r")?:return null
   if(descriptor.statSize==0L){descriptor.close();return null}
   pending.copy(title=row.optString("title"),artist=row.optString("artist"),album=row.optString("album"),cover=row.optString("coverArt"),url="fd://"+descriptor.fd,duration=row.optDouble("duration",0.0),descriptor=descriptor)
  }catch(_:Exception){null}
 }
 fun playable(c:Context,key:String):Playable {val rows=JSONArray(prefs(c).getString("items","[]"));val row=(0 until rows.length()).map{rows.getJSONObject(it)}.lastOrNull{it.getString("key")==key}?:throw IllegalArgumentException("Download is unavailable")
  require(CachedMediaKind.music(row)){"Choose the cached book, episode or video playback action"};val uri=Uri.parse(row.getString("uri"));require(uri.scheme=="content");val descriptor=requireNotNull(c.contentResolver.openFileDescriptor(uri,"r"));
  return Playable("offline",key,row.getString("title"),row.getString("artist"),"Downloads","","fd://"+descriptor.fd,row.optDouble("duration",0.0),descriptor=descriptor)
 }
}
