package local.mediacenter.library

import expo.modules.kotlin.modules.Module
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import expo.modules.kotlin.modules.ModuleDefinition
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.util.UUID
import org.json.JSONObject
import org.json.JSONArray

/** Account secrets and authenticated networking never leave this native module. */
class MediaLibraryModule : Module() {
 private val networkQueue=CoroutineScope(SupervisorJob()+Dispatchers.IO)
 private val startup=java.util.concurrent.CompletableFuture<Unit>()
 private val initializer=java.util.concurrent.Executors.newSingleThreadExecutor{r->Thread(r,"media-library-initialization").apply{isDaemon=true}}
 private fun ready(){try{startup.get(60,java.util.concurrent.TimeUnit.SECONDS)}catch(e:java.util.concurrent.ExecutionException){throw(e.cause?:e)}}
 private val context get() = requireNotNull(appContext.reactContext)
 private val prefs get() = context.getSharedPreferences("media_library", Context.MODE_PRIVATE)
 private fun savedMusic()=SavedMusicSources.visible(prefs.getString("musicSession","{}")?:"{}",prefs.all.keys.filter{it.startsWith("account.")}.map{it.removePrefix("account.")}.toSet())
 private var assetPromise:expo.modules.kotlin.Promise?=null
 private var assetPassword=CharArray(0)
 private var assetOperation="";private var assetAccount="";private var assetIdentity="";private var assetText=""
 private var sharedContent:String?=null
 private fun receiveShared(intent:android.content.Intent?):String? {if(intent?.action!=android.content.Intent.ACTION_SEND||intent.type!="text/plain")return null;return try{val value=intent.getCharSequenceExtra(android.content.Intent.EXTRA_TEXT)?.toString()?:return null;intent.removeExtra(android.content.Intent.EXTRA_TEXT);SharedContentData.parse(value).toString()}catch(_:Exception){JSONObject().put("error","Share a title or a public Spotify, YouTube Music, Deezer or SoundCloud link.").toString()}}
 private var localFolder=false
 private var folderPromise:expo.modules.kotlin.Promise?=null
 private var nativeContext:Context?=null
 private val cacheChanged:()->Unit={sendEvent("cacheChanged",emptyMap<String,Any>())}
 private val endpoints = setOf("getMusicFolders","getAlbumList2","getAlbum","getArtists","getArtist","getPlaylists","getPlaylist","search3","getStarred2","getSimilarSongs2")
 private fun openVideo(media:JellyfinMedia){val activity=appContext.currentActivity;if(activity==null){media.descriptor?.close();throw IllegalStateException("Open the app before playing video")};Playback.control("stop");val key=try{VideoActivity.stage(media)}catch(e:Exception){media.descriptor?.close();throw e};activity.runOnUiThread{try{activity.startActivity(android.content.Intent(activity,VideoActivity::class.java).putExtra("session",key))}catch(_:Exception){VideoActivity.discard(key);android.widget.Toast.makeText(activity,"Could not open the video player",android.widget.Toast.LENGTH_SHORT).show()}}}
 override fun definition() = ModuleDefinition {
  Name("MediaLibrary")
  Events("sharedContent","cacheChanged")
  OnNewIntent { intent -> val payload=receiveShared(intent);if(payload!=null){synchronized(this@MediaLibraryModule){sharedContent=payload};sendEvent("sharedContent",emptyMap<String,Any>())} }
  AsyncFunction("takeSharedContent") { synchronized(this@MediaLibraryModule){val result=sharedContent?:receiveShared(appContext.currentActivity?.intent);sharedContent=null;result?:"{}"} }
  View(LiquidGlassView::class) {
   Prop("opacity") { view:LiquidGlassView,value:Float -> view.tintAmount=value.coerceIn(.08f,.85f);view.invalidate() }
   Prop("refraction") { view:LiquidGlassView,value:Float -> view.refraction=value.coerceIn(0f,1f);view.invalidate() }
   Prop("targetTag") { view:LiquidGlassView,tag:Int -> view.targetTag=tag }
   Prop("tone") { view:LiquidGlassView,tone:String -> view.tone=android.graphics.Color.parseColor(tone);view.invalidate() }
   Prop("light") { view:LiquidGlassView,value:Float -> view.light=value.coerceIn(0f,1f);view.invalidate() }
  }
  AsyncFunction("resolveSharedLink") {account:String,url:String->val a=read(account);require(a.optString("type")=="downtify"){"Choose a Downtify connection"};Downtify.resolveLink(a,SharedContentData.link(url)).toString()}.runOnQueue(networkQueue)
  AsyncFunction("checkUpdate") { MobileUpdates.check(context) }.runOnQueue(networkQueue)
  AsyncFunction("installUpdate") { MobileUpdates.install(context) }.runOnQueue(networkQueue)
  OnCreate { OfflineStore.addListener(cacheChanged);val app=context.applicationContext;nativeContext=app;initializer.execute{try{NativeBackup.recoverOnLaunch(app);AppShortcuts.install(app);Downtify.attach(app);SpokenCache.persistAccount={a->EncryptedAccounts.write(app,a.getString("id"),a)};Audiobookshelf.reload={id->EncryptedAccounts.read(app,id)};OfflineStore.attach(app){pending->NativeTrackResolver.resolve(app,pending,false)};if(NativeBackup.recoveryError.isEmpty())OfflineRulesScheduler.configure(app);startup.complete(Unit)}catch(e:Exception){startup.completeExceptionally(e)}} }
  OnDestroy { OfflineStore.removeListener(cacheChanged);assetPromise?.reject("PICKER_CLOSED","The app was closed before choosing a file",null);assetPromise=null;assetText="";assetPassword.fill('\u0000');assetPassword=CharArray(0);NativeBackup.releasePreviewAsync();initializer.shutdown();PodcastInbox.cancel();networkQueue.cancel() }
  AsyncFunction("podcastInbox") {action:String,input:String->require(input.length<=10000);PodcastInbox.action(context,action,JSONObject(input)).toString()}.runOnQueue(networkQueue)
  AsyncFunction("probeAudio") {Playback.probeAudio()}.runOnQueue(networkQueue)
  AsyncFunction("retainArtwork") { raw:String -> RetainedArtwork.pins(context,raw);true }.runOnQueue(networkQueue)
  AsyncFunction("diagnostics") { val p=JSONObject(Playback.state());val report=JSONObject().put("version",context.packageManager.getPackageInfo(context.packageName,0).versionName).put("androidApi",android.os.Build.VERSION.SDK_INT).put("abis",JSONArray(android.os.Build.SUPPORTED_ABIS.toList())).put("engine","MPV / Android AudioTrack").put("usbExclusive",false).put("mediaSessionArtworkPixels",PlaybackService.artworkPixels);for(key in listOf("engineFailure","compatibilityOutput","loaded","playing","codec","sampleRate","outputRate","sourceFormat","channels","outputDriver","processing"))if(p.has(key))report.put(key,p.get(key));report.put("connections",prefs.all.keys.count{it.startsWith("account.")});report.toString(2) }
  AsyncFunction("getPlaybackPolicy") { prefs.getString("playbackPolicy","{}")?:"{}" }
  AsyncFunction("setPlaybackPolicy") { raw:String -> val p=PlaybackPolicy.parse(JSONObject(raw));check(prefs.edit().putString("playbackPolicy",p.json().toString()).commit());true }
  AsyncFunction("musicSession") { savedMusic() }
  AsyncFunction("spokenSession") {val saved=JSONObject(prefs.getString("lastSpoken","{}")?:"{}");if(saved.has("account")){val ref=SpokenResumeRef.parse(saved);saved.put("position",LocalPosition.read(context,ref.target.key(ref.account)))};saved.toString()}
  AsyncFunction("restoreMusicSession") { val saved=JSONObject(savedMusic());val refs=MusicQueuePlan.parse(saved.getJSONArray("queue").toString()){id->read(id).optString("type","navidrome")};val index=saved.getInt("index");require(index in refs.indices);val position=saved.getDouble("position");require(position.isFinite()&&position>=0);val rows=refs.mapIndexed{i,r->TrackMetadata.pending(r).copy(startPosition=if(i==index)position else 0.0)};Playback.resolve={resolveTrack(it)};Playback.play(context,rows,index);true }.runOnQueue(networkQueue)
  AsyncFunction("playlistDraft") {account:String,id:String->
   val a=read(account);if(a.optString("type")=="jellyfin")JellyfinPlaylists.read(a,id).toString()else if(a.optString("type")=="downtify")DowntifyPlaylists.read(a,id).toString()else{require(a.optString("type","navidrome")=="navidrome"){"Server playlist editing requires Navidrome or Jellyfin"};val p=jsonRequest(a,"getPlaylist",mapOf("id" to id)).getJSONObject("playlist");PlaylistEdit.requireWritable(p,a.getString("username"));p.put("revision",PlaylistEdit.revision(p)).toString()}
  }.runOnQueue(networkQueue)
  AsyncFunction("saveServerPlaylist") {account:String,raw:String->
   require(raw.length<=2000000);val a=read(account);val edit=PlaylistEdit.parse(JSONObject(raw));AccountRequestLocks.withAccount("playlist:"+account){
    if(a.optString("type")=="jellyfin")JellyfinPlaylists.save(a,edit).toString()else if(a.optString("type")=="downtify")DowntifyPlaylists.save(a,edit).toString()else{
     require(a.optString("type","navidrome")=="navidrome"){"Server playlist editing requires Navidrome or Jellyfin"}
     val current=if(edit.id.isNotEmpty())jsonRequest(a,"getPlaylist",mapOf("id" to edit.id)).getJSONObject("playlist")else null
     if(current!=null){PlaylistEdit.requireWritable(current,a.getString("username"));require(PlaylistEdit.revision(current)==edit.revision){"This playlist changed on the server. Reload it before saving."}}
     val response=jsonRequest(a,if(current==null)"createPlaylist"else "updatePlaylist",edit.fields(current));val id=if(current==null)response.getJSONObject("playlist").getString("id")else edit.id
     jsonRequest(a,"getPlaylist",mapOf("id" to id)).getJSONObject("playlist").toString()
    }
   }
  }.runOnQueue(networkQueue)
  AsyncFunction("getMusicTransitions") {MusicTransitions.parse(JSONObject(prefs.getString("musicTransitions","{}")?:"{}")).json().toString()}
  AsyncFunction("setMusicTransitions") {raw:String->val value=MusicTransitions.parse(JSONObject(raw));Playback.setTransitions(value);require(prefs.edit().putString("musicTransitions",value.json().toString()).commit());true}
  AsyncFunction("getAudioOptions") { prefs.getString("audio","{}")?:"{}" }
  AsyncFunction("setAudioOptions") { raw:String -> val options=AudioOptions.parse(JSONObject(raw));Playback.setAudio(options){check(prefs.edit().putString("audio",options.json().toString()).commit())};true }.runOnQueue(networkQueue)
  AsyncFunction("listeningHistory") { mode:String -> ListeningHistory.list(context,mode) }
  AsyncFunction("accounts") { ready();synchronized(this@MediaLibraryModule) {
   val result=JSONArray(); for(id in prefs.all.keys.filter{it.startsWith("account.")}) result.put(publicAccount(read(id.removePrefix("account."))))
   result.toString()
  } }
  AsyncFunction("saveAccount") { input:String -> synchronized(this@MediaLibraryModule) {
   val data=JSONObject(input); val id=data.optString("id").ifBlank{UUID.randomUUID().toString()}
   require(id.matches(Regex("[a-zA-Z0-9-]{1,80}"))) { "Invalid account identity" }
   val old=if(prefs.contains("account.$id")) read(id) else null
   val password=data.optString("password").ifBlank{old?.optString("password")?:""}
   val kind=data.optString("type",old?.optString("type","navidrome")?:"navidrome");require(kind in setOf("navidrome","downtify","audiobookshelf","jellyfin"));require(password.isNotEmpty()||kind=="downtify"||kind=="audiobookshelf") { "Enter a password" }
   val url=validateUrl(data.getString("url"),data.optBoolean("allowHttp"))
   val account=JSONObject().put("id",id).put("type",kind).put("name",data.optString("name").trim().ifBlank{"Navidrome"}).put("url",url).put("username",data.getString("username").trim()).put("password",password).put("allowHttp",data.optBoolean("allowHttp"))
   require(account.getString("username").isNotEmpty()||kind=="downtify"||kind=="audiobookshelf") { "Enter a username" }
   if(kind=="jellyfin")Jellyfin.login(account) else if(kind=="downtify")Downtify.login(account) else if(kind=="audiobookshelf"){
    val apiKey=data.optString("apiKey").trim().ifBlank{if(old?.optString("authMode")=="apiKey")old.optString("accessToken") else ""}
    if(apiKey.isNotBlank()){
     account.put("authMode","apiKey").put("accessToken",apiKey).put("version","Audiobookshelf")
     ProviderHttp.json(account,"api/me",mapOf("Authorization" to "Bearer $apiKey"))
    }else Audiobookshelf.login(account)
   } else {val response=jsonRequest(account,"ping",emptyMap());account.put("version",response.optString("serverVersion",response.optString("version")))}
   write(id,account)
   publicAccount(account).toString()
  } }.runOnQueue(networkQueue)
  AsyncFunction("testAccount") { id:String -> read(id).let{a->when(a.optString("type")){"jellyfin"->Jellyfin.test(a);"downtify"->Downtify.test(a);"audiobookshelf"->Audiobookshelf.test(a){write(id,it)};else->jsonRequest(a,"ping",emptyMap()).optString("serverVersion","Connected")}} }.runOnQueue(networkQueue)
  AsyncFunction("removeAccount") { id:String -> synchronized(this@MediaLibraryModule) { require(prefs.edit().remove("account.$id").commit()) { "Could not remove account" }; true } }
  AsyncFunction("browse") { id:String, method:String, input:String ->
   require(method in endpoints || (method=="getFavoriteTracks" && read(id).optString("type")=="downtify")) { "Unsupported library operation" }
   val raw=JSONObject(input); val params=mutableMapOf<String,String>()
   val allowed=setOf("ids","id","type","size","offset","musicFolderId","query","songCount","songOffset","albumCount","albumOffset","artistCount","artistOffset")
   for(k in raw.keys()) { require(k in allowed) { "Unsupported parameter" }; val v=raw.getString(k); require(v.length<=if(k=="ids"&&method=="getFavoriteTracks")400000 else 2000); params[k]=v }
   read(id).let{a->require(a.optString("type","navidrome") in setOf("navidrome","downtify")){"Use the spoken library operation for books and podcasts"};if(a.optString("type")=="downtify")Downtify.browse(a,method,params) else jsonRequest(a,method,params)}.also{TrackMetadata.remember(id,it)}.toString()
  }.runOnQueue(networkQueue)
  AsyncFunction("clearBrowseCache") { Downtify.clearCache();true }.runOnQueue(networkQueue)
  AsyncFunction("cover") { id:String, coverId:String, size:Int ->
   require(coverId.length in 1..512);require(size in setOf(96,192,384,768,1536))
   NativeArtwork.read(context,id,coverId,size)
  }.runOnQueue(networkQueue)
  AsyncFunction("play") { id:String, ids:String, start:Int ->
   val account=read(id);require(account.optString("type","navidrome") in setOf("navidrome","downtify","jellyfin")){"Books and episodes require an explicit spoken playback target"};val array=JSONArray(ids);require(array.length() in 1..5000);require(start in 0 until array.length())
   Playback.resolve={pending -> resolveTrack(pending)}
   val entries=(0 until array.length()).map{i->val songId=array.getString(i);require(songId.length in 1..512);TrackMetadata.pending(id,songId)}
   Playback.play(context,entries,start);true
  }.runOnQueue(networkQueue)
  AsyncFunction("playMixed") { input:String,start:Int ->
   val rows=MusicQueuePlan.parse(input){id->read(id).optString("type","navidrome")};require(start in rows.indices)
   val entries=rows.map{TrackMetadata.pending(it)}
   Playback.resolve={pending->resolveTrack(pending)};Playback.play(context,entries,start);true
  }.runOnQueue(networkQueue)
  AsyncFunction("favorite") { id:String, songId:String, value:Boolean ->
   require(songId.length in 1..512);require(read(id).optString("type","navidrome")=="navidrome"){"Server favorites are not supported by this connection"};jsonRequest(read(id),if(value) "star" else "unstar",mapOf("id" to songId));true
  }.runOnQueue(networkQueue)
  AsyncFunction("transcript") {identity:String->NativeTranscripts.read(context,identity)}.runOnQueue(networkQueue)
  AsyncFunction("seekTranscript") {identity:String,position:Double->require(position.isFinite()&&position>=0);NativeTranscripts.validate(identity);Playback.control("seek",position,identity);true}.runOnQueue(networkQueue)
  AsyncFunction("removeTranscript") {identity:String->NativeTranscripts.save(context,identity,"");true}.runOnQueue(networkQueue)
  AsyncFunction("customLyrics") { identity:String,text:String ->NativeLyrics.save(context,identity,text);true}.runOnQueue(networkQueue)
  AsyncFunction("lyrics") {NativeLyrics.get(context)}.runOnQueue(networkQueue)
  AsyncFunction("searchLyrics") {identity:String,query:String->NativeLyrics.search(identity,query)}.runOnQueue(networkQueue)
  AsyncFunction("removeCustomCover") {account:String,id:String->CustomArtwork.remove(context,account,id);true}.runOnQueue(networkQueue)
  AsyncFunction("backupState") {JSONObject().put("recoveryError",NativeBackup.recoveryError).toString()}
  AsyncFunction("retryBackupRecovery") {NativeBackup.retryRecovery(context.applicationContext)}.runOnQueue(networkQueue)
  AsyncFunction("applyBackup") {token:String->require(token.length<=80);try{NativeBackup.apply(context.applicationContext,token)}catch(e:Exception){throw IllegalStateException(NativeBackup.safeMessage(e))}}.runOnQueue(networkQueue)
  AsyncFunction("finishBackupRestore") {NativeBackup.finish(context.applicationContext);true}.runOnQueue(networkQueue)
  AsyncFunction("discardBackup") {NativeBackup.discard();true}
  AsyncFunction("migrationFile") {operation:String,password:String,promise:expo.modules.kotlin.Promise->
   require(operation in setOf("backup-export","backup-preview")&&password.length in 12..1024)
   if(assetPromise!=null||folderPromise!=null)promise.reject("PICKER_BUSY","Another picker is open",null)else{
    val activity=appContext.currentActivity
    if(activity==null)promise.reject("NO_ACTIVITY","Open the app first",null)else{
     val intent=android.content.Intent(if(operation=="backup-export")android.content.Intent.ACTION_CREATE_DOCUMENT else android.content.Intent.ACTION_OPEN_DOCUMENT).addCategory(android.content.Intent.CATEGORY_OPENABLE)
     intent.type=if(operation=="backup-export")"application/octet-stream" else "*/*"
     if(operation=="backup-export")intent.putExtra(android.content.Intent.EXTRA_TITLE,"Media-Center-"+System.currentTimeMillis()+".mcbackup")
     assetOperation=operation;assetPassword=password.toCharArray();assetPromise=promise
     activity.runOnUiThread{try{activity.startActivityForResult(intent,7140)}catch(_:Exception){assetPassword.fill('\u0000');assetPassword=CharArray(0);assetPromise=null;promise.reject("FILE_PICKER","No compatible file picker is available",null)}}
    }
   }
  }
  AsyncFunction("linkPlaylistExport") {token:String->require(token.length<=80);ManagedPlaylists.apply(context.applicationContext,token)}.runOnQueue(networkQueue)
  AsyncFunction("previewPlaylistFile") {promise:expo.modules.kotlin.Promise->
   if(assetPromise!=null||folderPromise!=null)promise.reject("PICKER_BUSY","Another picker is open",null)else{
    val activity=appContext.currentActivity
    if(activity==null)promise.reject("NO_ACTIVITY","Open the app first",null)else{
     val intent=android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT).addCategory(android.content.Intent.CATEGORY_OPENABLE).setType("*/*")
     assetOperation="link-playlist";assetPromise=promise
     activity.runOnUiThread{try{activity.startActivityForResult(intent,7140)}catch(_:Exception){assetPromise=null;promise.reject("FILE_PICKER","No compatible file picker is available",null)}}
    }
   }
  }
  AsyncFunction("customAsset") {operation:String,account:String,id:String,text:String,promise:expo.modules.kotlin.Promise->
   require(operation in setOf("cover","import-lyrics","export-lyrics","import-transcript"));require(text.length<=100000)
   if(operation=="cover"){require(id.length in 1..512);if(account!="device")read(account)}else if(operation=="import-transcript")NativeTranscripts.validate(id) else NativeLyrics.validate(id)
   if(assetPromise!=null||folderPromise!=null)promise.reject("PICKER_BUSY","Another file picker is already open",null) else {
    val activity=appContext.currentActivity
    if(activity==null)promise.reject("NO_ACTIVITY","Open the app before choosing a file",null) else {
     val intent=android.content.Intent(if(operation=="export-lyrics")android.content.Intent.ACTION_CREATE_DOCUMENT else android.content.Intent.ACTION_OPEN_DOCUMENT).addCategory(android.content.Intent.CATEGORY_OPENABLE)
     intent.type=if(operation=="cover")"image/*" else "text/*"
     if(operation in setOf("import-lyrics","import-transcript")){intent.type="*/*"} // Providers disagree on LRC MIME types; bounded strict UTF-8 validation follows selection.
     if(operation=="export-lyrics"){require(text.isNotBlank()){"No lyrics to export"};intent.type=if(CustomizationData.synced(text))"application/octet-stream" else "text/plain";val track=JSONObject(Playback.state()).getJSONObject("track");intent.putExtra(android.content.Intent.EXTRA_TITLE,CustomizationData.filename(track.optString("title"))+if(CustomizationData.synced(text))".lrc" else ".txt")}
     assetOperation=operation;assetAccount=account;assetIdentity=id;assetText=text;assetPromise=promise
     activity.runOnUiThread{try{activity.startActivityForResult(intent,7140)}catch(_:Exception){assetPromise=null;assetText="";promise.reject("FILE_PICKER","No compatible file picker is available",null)}}
    }
   }
  }
  AsyncFunction("deviceLibrary") { DeviceLibrary.list(context).toString() }.runOnQueue(networkQueue)
  AsyncFunction("saveRadio") { title:String,url:String,http:Boolean -> DeviceLibrary.radio(context,title,url,http);true }.runOnQueue(networkQueue)
  AsyncFunction("removeDeviceItem") { id:String,station:Boolean -> DeviceLibrary.remove(context,id,station);true }.runOnQueue(networkQueue)
  AsyncFunction("playDeviceItem") { id:String,station:Boolean -> Playback.play(context,listOf(DeviceLibrary.play(context,id,station)),0);true }.runOnQueue(networkQueue)
  AsyncFunction("chooseLocalFolder") { promise:expo.modules.kotlin.Promise ->
   if(folderPromise!=null||assetPromise!=null)promise.reject("PICKER_BUSY","A folder picker is already open",null) else {val activity=appContext.currentActivity;if(activity==null)promise.reject("NO_ACTIVITY","Open the app first",null) else {localFolder=true;folderPromise=promise;activity.runOnUiThread{activity.startActivityForResult(android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION),7138)}}}
  }
  AsyncFunction("chooseDownloadFolder") { promise:expo.modules.kotlin.Promise ->
   if(folderPromise!=null||assetPromise!=null)promise.reject("PICKER_BUSY","A folder picker is already open",null) else {
    val activity=appContext.currentActivity
    if(activity==null)promise.reject("NO_ACTIVITY","Open the app before selecting a folder",null) else {localFolder=false;folderPromise=promise;activity.runOnUiThread{activity.startActivityForResult(android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION or android.content.Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION),7138)}}
   }
  }
  OnActivityResult { _,result -> if(result.requestCode==7140){
   val pending=assetPromise;val operation=assetOperation;val account=assetAccount;val identity=assetIdentity;val text=assetText;val password=assetPassword;assetPassword=CharArray(0);assetPromise=null;assetText=""
   val uri=result.data?.data
   if(result.resultCode!=android.app.Activity.RESULT_OK||uri==null){password.fill('\u0000');pending?.resolve(if(operation.startsWith("backup-")||operation=="link-playlist")"{}" else false)} else {val c=context.applicationContext;Thread{try{
    require(uri.scheme=="content"){"Choose a file with the system picker"}
    if(operation=="link-playlist")pending?.resolve(ManagedPlaylists.preview(c,uri))else if(operation.startsWith("backup-")){val response=if(operation=="backup-export"){NativeBackup.export(c,uri,password);JSONObject().put("exported",true).toString()}else NativeBackup.preview(c,uri,password);pending?.resolve(response)}else{when(operation){
     "cover"->{if(account!="device")EncryptedAccounts.read(c,account);CustomArtwork.import(c,account,identity,uri)}
     "import-transcript"->{val bytes=requireNotNull(c.contentResolver.openInputStream(uri)).use{input->val out=java.io.ByteArrayOutputStream();val block=ByteArray(8192);while(true){val n=input.read(block);if(n<0)break;require(out.size()+n<=2_000_000){"Transcript file is too large"};out.write(block,0,n)};out.toByteArray()};NativeTranscripts.save(c,identity,NativeTranscripts.text(bytes))}
     "import-lyrics"->{val bytes=requireNotNull(c.contentResolver.openInputStream(uri)).use{input->val out=java.io.ByteArrayOutputStream();val block=ByteArray(8192);while(true){val n=input.read(block);if(n<0)break;require(out.size()+n<=400000){"Lyrics file is too large"};out.write(block,0,n)};out.toByteArray()};NativeLyrics.save(c,identity,CustomizationData.text(bytes))}
     "export-lyrics"->{NativeLyrics.validate(identity);requireNotNull(c.contentResolver.openOutputStream(uri,"wt")).use{it.write(text.toByteArray(Charsets.UTF_8))}}
     else->error("File operation expired")
    };pending?.resolve(true)}
   }catch(e:Exception){pending?.reject("CUSTOM_MEDIA",if(operation.startsWith("backup-"))NativeBackup.safeMessage(e) else e.message?:"Could not use this file",null)}finally{password.fill('\u0000')}}.start()}
  }else if(result.requestCode==7138){val pending=folderPromise;folderPromise=null
   val uri=result.data?.data
   if(result.resultCode!=android.app.Activity.RESULT_OK||uri==null)pending?.resolve(false) else try {
    if(localFolder){context.contentResolver.takePersistableUriPermission(uri,android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);val c=context;Thread{try{DeviceLibrary.scan(c,uri);pending?.resolve(true)}catch(_:Exception){pending?.reject("INDEX_FAILED","Could not index this folder. Choose a smaller accessible audio folder.",null)}}.start()}else{context.contentResolver.takePersistableUriPermission(uri,android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION or android.content.Intent.FLAG_GRANT_WRITE_URI_PERMISSION);OfflineStore.setFolder(context,uri);OfflineRulesScheduler.configure(context.applicationContext);pending?.resolve(true)}
   }catch(e:Exception){pending?.reject("FOLDER_PERMISSION","Could not retain access to this folder",null)}
  } }
  AsyncFunction("mixSnapshot") {action:String,raw:String->require(raw.length<=2000000);MixSnapshots.operation(context.applicationContext,action,JSONObject(raw)).toString()}.runOnQueue(networkQueue)
  AsyncFunction("checkOfflineRules") {force:Boolean->OfflineRules.check(context.applicationContext,force=force).toString()}.runOnQueue(networkQueue)
  AsyncFunction("predictiveCache") {PredictiveCache.check(context)}.runOnQueue(networkQueue)
  AsyncFunction("cacheNetwork") { val manager=context.getSystemService(android.net.ConnectivityManager::class.java);val caps=manager.getNetworkCapabilities(manager.activeNetwork);caps?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)==true&&!manager.isActiveNetworkMetered }
  AsyncFunction("cacheControl") { id:String,action:String -> require(id.length<=100);OfflineStore.control(context,id,action);true }
  AsyncFunction("removeCache") {key:String->require(key.length<=1600);OfflineStore.remove(context,key);true}.runOnQueue(networkQueue)
  AsyncFunction("verifyCache") { OfflineStore.verify(context) }.runOnQueue(networkQueue)
  AsyncFunction("setCacheTemplate") { value:String -> OfflineStore.setTemplate(context,value);true }
  AsyncFunction("setCachePolicy") { raw:String -> require(raw.length<1000);OfflineStore.setPolicy(context,raw);OfflineRulesScheduler.configure(context.applicationContext);true }
  AsyncFunction("reviewOfflineProgress") {key:String->(if(key.startsWith("video:"))JellyfinOfflineProgress.review(context,key,{read(it)})else OfflineProgress.review(context,key,{read(it)},{write(it.getString("id"),it)})).toString()}.runOnQueue(networkQueue)
  AsyncFunction("applyOfflineProgress") {key:String,revision:String,choice:String->if(key.startsWith("video:"))JellyfinOfflineProgress.apply(context,key,revision,choice,{read(it)})else OfflineProgress.apply(context,key,revision,choice,{read(it)},{write(it.getString("id"),it)})}.runOnQueue(networkQueue)
  AsyncFunction("downloads") { OfflineStore.state(context) }
  AsyncFunction("downtifySave") { id:String,ids:String -> val a=read(id);require(a.optString("type")=="downtify");val rows=JSONArray(ids);require(rows.length() in 1..5000);Downtify.save(a,(0 until rows.length()).map{rows.getString(it)}) }.runOnQueue(networkQueue)
  AsyncFunction("enqueue") { id:String,ids:String,next:Boolean ->
   require(read(id).optString("type","navidrome") in setOf("navidrome","downtify","jellyfin"));val rows=JSONArray(ids);require(rows.length() in 1..5000)
   Playback.resolve={pending->resolveTrack(pending)}
   val entries=(0 until rows.length()).map{val track=rows.getString(it);require(track.length in 1..512&&!track.startsWith("video-file:")&&!track.startsWith("spoken-file:"));TrackMetadata.pending(id,track)}
   Playback.enqueue(context,entries,next);true
  }.runOnQueue(networkQueue)
  AsyncFunction("downtifyDiscover") { id:String,mode:String,query:String,item:String -> val a=read(id);require(a.optString("type")=="downtify");Downtify.discover(a,mode,query,item).toString() }.runOnQueue(networkQueue)
  AsyncFunction("jellyfinBrowse") { id:String,mode:String,item:String,offset:Int -> val a=read(id);require(a.optString("type")=="jellyfin");(try{Jellyfin.browse(a,mode,item,offset)}catch(e:Exception){if(mode=="detail")VideoCache.detail(context,id,item)?:throw e else throw e}).toString() }.runOnQueue(networkQueue)
  AsyncFunction("playJellyfin") { id:String,item:String ->
   val a=read(id);require(a.optString("type")=="jellyfin");val media=VideoCache.cached(context,id,item)?:Jellyfin.prepare(a,item)
   if(media.item.getString("kind")=="track"){
    val track=Playable(id,item,media.item.getString("title"),media.item.optString("artist"),"",item,media.url,media.item.optDouble("duration"),media.headers,startPosition=media.item.optDouble("resume"),jellyfin=media)
    Playback.play(context,listOf(track),0)
   }else openVideo(media)
   media.item.getString("kind")
  }.runOnQueue(networkQueue)
  AsyncFunction("cacheJellyfinVideo") {id:String,item:String->val a=read(id);require(a.optString("type")=="jellyfin");val tracks=VideoCache.prepare(context,a,item);OfflineStore.start(context,tracks,tracks.first().title){NativeTrackResolver.resolve(context,it,false)};true}.runOnQueue(networkQueue)
  AsyncFunction("playCachedVideo") {key:String->require(key.startsWith("video:")&&key.length<=700);openVideo(requireNotNull(VideoCache.open(context,key)){"Cached video is unavailable. Check the Cache folder."});true}.runOnQueue(networkQueue)
  AsyncFunction("spokenSeries") {id:String,book:String,series:String,offset:Int->val a=read(id);require(a.optString("type")=="audiobookshelf");Audiobookshelf.series(a,book,series,offset){write(id,it)}.toString()}.runOnQueue(networkQueue)
  AsyncFunction("spokenBrowse") { id:String,mode:String,item:String,offset:Int ->
   val a=read(id);require(a.optString("type")=="audiobookshelf");require(item.length<=512)
   val persist:(JSONObject)->Unit={write(id,it)}
   when(mode){"search"->Audiobookshelf.search(a,item,persist);"libraries"->Audiobookshelf.libraries(a,persist);"items"->Audiobookshelf.items(a,item,offset,persist);"detail"->try{Audiobookshelf.detail(a,item,persist)}catch(e:Exception){SpokenCache.detail(context,id,item)?:throw e};else->throw IllegalArgumentException("Unsupported spoken library operation")}.toString()
  }.runOnQueue(networkQueue)
  AsyncFunction("playSpoken") {id:String,kind:String,item:String,episode:String,start:Double->
   require(start.isFinite()&&start>=-1);val entry=SpokenQueueEntry(SpokenResumeRef.parse(JSONObject().put("account",id).put("kind",kind).put("item",item).put("episode",episode)),"");require(read(id).optString("type")=="audiobookshelf");Playback.resolve={resolveTrack(it)};Playback.play(context,listOf(SpokenResolver.pending(entry,start)),0);true
  }.runOnQueue(networkQueue)
  AsyncFunction("playSpokenQueue") {raw:String,start:Int->
   require(raw.length<=1000000);val rows=SpokenQueuePlan.entries(JSONArray(raw));require(start in rows.indices);rows.forEach{require(read(it.ref.account).optString("type")=="audiobookshelf")};Playback.resolve={resolveTrack(it)};Playback.play(context,rows.map{SpokenResolver.pending(it)},start);true
  }.runOnQueue(networkQueue)
  AsyncFunction("enqueueSpoken") {id:String,kind:String,item:String,episode:String,title:String,next:Boolean->
   val entry=SpokenQueueEntry(SpokenResumeRef.parse(JSONObject().put("account",id).put("kind",kind).put("item",item).put("episode",episode)),title.take(500));require(read(id).optString("type")=="audiobookshelf");Playback.resolve={resolveTrack(it)};Playback.enqueueSpoken(context,listOf(SpokenResolver.pending(entry)),next);true
  }.runOnQueue(networkQueue)
  AsyncFunction("spokenQueueSession") {prefs.getString("spokenQueueSession","{}")?:"{}"}
  AsyncFunction("restoreSpokenQueueSession") {
   val saved=SpokenQueuePlan.read(JSONObject(prefs.getString("spokenQueueSession","{}")?:"{}"));saved.entries.forEach{require(read(it.ref.account).optString("type")=="audiobookshelf")};Playback.resolve={resolveTrack(it)};Playback.play(context,saved.entries.mapIndexed{i,entry->SpokenResolver.pending(entry,if(i==saved.index)saved.position else -1.0)},saved.index);true
  }.runOnQueue(networkQueue)
  AsyncFunction("downloadTracks") { id:String,ids:String,title:String ->
   require(read(id).optString("type","navidrome") in setOf("navidrome","downtify","jellyfin")){"Music caching requires a music library"};require(title.length in 1..200);val rows=JSONArray(ids);require(rows.length() in 1..5000);Playback.resolve={pending->resolveTrack(pending)}
   val entries=(0 until rows.length()).map{i->val track=rows.getString(i);require(track.length in 1..512&&!track.startsWith("video-file:")&&!track.startsWith("spoken-file:"));TrackMetadata.pending(id,track)}
   if(read(id).optString("type")=="downtify")Downtify.retain(read(id),entries.map{it.id})
   OfflineStore.start(context,entries,title){pending->resolveTrack(pending,false)};true
  }.runOnQueue(networkQueue)
  AsyncFunction("cacheSpoken") { id:String,kind:String,item:String,episode:String ->
   require(item.length in 1..512&&episode.length<=512);val a=read(id);require(a.optString("type")=="audiobookshelf");val target=when(kind){"book"->{require(episode.isEmpty());SpokenTarget.Book(item)};"episode"->{require(episode.isNotEmpty());SpokenTarget.Episode(item,episode)};else->throw IllegalArgumentException("Select a book or episode")}
   val tracks=SpokenCache.prepare(context,a,target){write(id,it)};val first=SpokenCache.resolveFile(context,a,tracks.first().id);OfflineStore.start(context,tracks,first.album){resolveTrack(it,false)};true
  }.runOnQueue(networkQueue)
  AsyncFunction("playDownload") { key:String -> require(key.length in 1..700);Playback.play(context,listOf(if(key.startsWith("spoken:"))requireNotNull(SpokenCache.open(context,key)){"Some cached files are missing. Cache this item again."} else OfflineStore.playable(context,key)),0);true }
  AsyncFunction("playbackState") { version:Double -> Playback.clientState(version.toLong()) }
  AsyncFunction("controlPlayback") { action:String,value:Double -> require(action in setOf("pause","resume","toggle","seek","skip","next","previous","volume","speed","repeat","shuffle","sleep","sleep-end","queue-index","remove","move-up","move-down","move-to","undo-remove","clear-upcoming","stop"));require(value.isFinite());Playback.control(action,value);true }
  AsyncFunction("getPreferences") { ready();prefs.getString("ui","{}")?:"{}" }
  AsyncFunction("setPreferences") { value:String -> require(value.length<4*1024*1024); val parsed=JSONObject(value);OfflineRulesPlan.definitions(parsed); require(prefs.edit().putString("ui",value).commit());Playback.setContinuation(parsed.optBoolean("automaticContinuation"));OfflineRulesScheduler.configure(context.applicationContext); true }
 }
 private fun resolveTrack(pending:Playable,preferOffline:Boolean=true)=NativeTrackResolver.resolve(nativeContext?:context.applicationContext,pending,preferOffline)
 private fun validateUrl(value:String,allowHttp:Boolean):String {
  val uri=try{URI(value.trim())}catch(e:Exception){throw IllegalArgumentException("Enter a valid server URL")}
  require(uri.scheme=="https"||(uri.scheme=="http"&&allowHttp)) { "Use HTTPS, or explicitly allow HTTP for this server" }
  require(!uri.host.isNullOrBlank()&&uri.userInfo==null&&uri.query==null&&uri.fragment==null) { "Use the server base URL without credentials, query or fragment" }
  return uri.toString().trimEnd('/')
 }
 private fun publicAccount(a:JSONObject)=JSONObject().put("authMode",a.optString("authMode","password")).put("type",a.optString("type","navidrome")).put("id",a.getString("id")).put("name",a.getString("name")).put("url",a.getString("url")).put("username",a.getString("username")).put("allowHttp",a.optBoolean("allowHttp")).put("version",a.optString("version"))
 private fun write(id:String,a:JSONObject)=EncryptedAccounts.write(context,id,a)
 private fun read(id:String)=EncryptedAccounts.read(context,id)
 private fun jsonRequest(a:JSONObject,method:String,params:Map<String,String>)=NativeSubsonic.jsonRequest(a,method,params)
 private fun jsonRequest(a:JSONObject,method:String,params:List<Pair<String,String>>)=NativeSubsonic.jsonRequest(a,method,params)
 private fun request(a:JSONObject,method:String,params:Map<String,String>)=NativeSubsonic.request(a,method,params)
}
