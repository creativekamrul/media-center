package local.mediacenter.library
import android.content.Context
import android.provider.DocumentsContract as Documents
import org.json.*
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.ScheduledExecutorService

/** Real resolver/MPV failure, generated cached original, no user servers or service shortcuts. */
internal object SourceFallbackChecks {
 fun run(c:Context,phase:(String)->Unit){
  check(c.packageName=="local.mediacenter.library.test")
  val prefs=c.getSharedPreferences("media_library",Context.MODE_PRIVATE);val cache=c.getSharedPreferences("media_downloads",Context.MODE_PRIVATE)
  for(id in listOf("failed-source","cached-source"))EncryptedAccounts.write(c,id,JSONObject().put("id",id).put("type","navidrome").put("name","Fictional source").put("url","http://127.0.0.1:1").put("username","fixture").put("password","fictional").put("allowHttp",true))
  val tree=Documents.buildTreeDocumentUri(TransferTestProvider.AUTHORITY,"root");val root=Documents.buildDocumentUriUsingTree(tree,"root");val uri=Documents.createDocument(c.contentResolver,root,"audio/wav","Generated fallback.wav")!!
  val rate=44100;val count=rate*30;val wave=ByteBuffer.allocate(44+count*2).order(ByteOrder.LITTLE_ENDIAN);wave.put("RIFF".toByteArray()).putInt(36+count*2).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(rate).putInt(rate*2).putShort(2).putShort(16).put("data".toByteArray()).putInt(count*2);c.contentResolver.openOutputStream(uri)!!.use{it.write(wave.array())}
  val row=JSONObject().put("key","cached-source:saved-tone").put("account","cached-source").put("id","saved-tone").put("kind","music").put("title","Generated fallback").put("artist","Generated artist").put("album","Generated album").put("duration",30).put("uri",uri.toString()).put("tree",tree.toString()).put("name","Generated fallback.wav").put("path","Music/Generated fallback.wav")
  check(cache.edit().putString("items",JSONArray().put(row).toString()).commit());val pending=Playable("failed-source","missing-tone","Generated fallback","Generated artist","Generated album","","",30.0)
  phase("fallback is off by default");check(prefs.edit().putString("ui","{}").commit());check(runCatching{NativeTrackResolver.resolve(c,pending)}.isFailure)
  phase("failed resolution uses the exact saved cached source");check(prefs.edit().putString("ui","{\"musicSourceFallback\":true}").commit());val result=NativeTrackResolver.resolve(c,pending);check(result.account=="cached-source"&&result.id=="saved-tone"&&result.fallbackFrom=="failed-source"&&result.descriptor!=null);result.descriptor!!.close()
  phase("downloads, spoken media and mismatched versions keep their source");check(runCatching{NativeTrackResolver.resolve(c,pending,false)}.isFailure);check(MusicFallback.find(c,pending.copy(kind="book"))==null);check(MusicFallback.find(c,pending.copy(duration=60.0))==null)
  phase("opened native MPV stream failure recovers to the saved original");val handle=NativeMpv.create(c);check(handle!=0L);check(NativeMpv.command(handle,arrayOf("set","volume","0"))>=0)
  val worker=Playback.javaClass.getDeclaredField("worker").apply{isAccessible=true}.get(Playback) as ScheduledExecutorService
  fun field(name:String,value:Any){Playback.javaClass.getDeclaredField(name).apply{isAccessible=true}.set(Playback,value)}
  try{
   worker.submit{field("context",c);field("handle",handle);field("queue",listOf(pending.copy(url="http://127.0.0.1:1/unavailable.wav")));field("index",0);field("paused",false);field("loaded",false);field("ended",false);field("resolving",false);Playback.requestFocus={true};Playback.resolve={NativeTrackResolver.resolve(c,it)};check(NativeMpv.load(handle,"http://127.0.0.1:1/unavailable.wav",false,"")>=0)}.get()
   val deadline=System.currentTimeMillis()+15000;while(true){val state=JSONObject(Playback.state());if(state.optBoolean("loaded")&&state.optJSONObject("track")?.optString("account")=="cached-source"){check(state.getJSONObject("track").getString("fallbackFrom")=="failed-source");check(state.getJSONObject("track").getString("id")=="saved-tone");break};check(System.currentTimeMillis()<deadline){"Opened-stream fallback did not load: "+state.optString("error")};Thread.sleep(50)}
   val before=NativeMpv.property(handle,"time-pos")?.toDoubleOrNull()?:0.0;val playingDeadline=System.currentTimeMillis()+5000;while((NativeMpv.property(handle,"time-pos")?.toDoubleOrNull()?:0.0)<=before){check(System.currentTimeMillis()<playingDeadline){"Recovered source stayed paused"};Thread.sleep(50)}
  }finally{Playback.control("stop");Playback.idleProgressEdit{field("handle",0L);NativeMpv.destroy(handle);Playback.requestFocus=null};Documents.deleteDocument(c.contentResolver,uri);cache.edit().remove("items").commit();prefs.edit().clear().commit()}
 }
}
