package local.mediacenter.library
import android.content.Context
import android.net.Uri
import org.json.*
import java.security.MessageDigest
/** Manifests contain identities and file offsets, never bearer tokens or authenticated URLs. */
object SpokenCache {
 private fun prefs(c:Context)=c.getSharedPreferences("spoken_cache",Context.MODE_PRIVATE)
 private fun hash(value:String)=MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString(""){"%02x".format(it)}
 private fun key(account:String,target:SpokenTarget)="spoken:"+hash(target.key(account))
 fun prepare(c:Context,a:JSONObject,target:SpokenTarget,persist:(JSONObject)->Unit):List<Playable>{
  val raw=Audiobookshelf.json(a,"api/items/${ProviderHttp.segment(target.itemId)}?expanded=1",persist)
  val files=SpokenDownloadPlan.files(raw,target);val detail=Audiobookshelf.detail(a,target.itemId,persist)
  val metadata=if(target is SpokenTarget.Episode){val rows=detail.getJSONArray("items");(0 until rows.length()).map{rows.getJSONObject(it)}.first{it.getString("id")==target.episodeId}}else detail
  val account=a.getString("id");val id=key(account,target)
  val manifest=JSONObject().put("key",id).put("account",account).put("item",target.itemId).put("episode",if(target is SpokenTarget.Episode)target.episodeId else "").put("kind",if(target is SpokenTarget.Book)"book" else "podcast").put("title",metadata.getString("title")).put("artist",detail.optString("artist")).put("detail",detail).put("duration",files.last().start+files.last().duration)
  manifest.put("files",JSONArray(files.mapIndexed{i,f->JSONObject().put("id","spoken-file:"+hash(id+":"+f.ino)).put("ino",f.ino).put("start",f.start).put("duration",f.duration).put("number",i+1)}))
  check(prefs(c).edit().putString(id,manifest.toString()).commit())
  val rows=manifest.getJSONArray("files")
  return (0 until rows.length()).map{Playable(account,rows.getJSONObject(it).getString("id"),"","","","","",0.0)}
 }
 fun resolveFile(c:Context,a:JSONObject,id:String):Playable {
  val manifest=prefs(c).all.values.asSequence().mapNotNull{(it as? String)?.let{v->JSONObject(v)}}.firstOrNull{m->m.getString("account")==a.getString("id")&&(0 until m.getJSONArray("files").length()).any{m.getJSONArray("files").getJSONObject(it).getString("id")==id}}?:throw IllegalStateException("Cache manifest unavailable")
  val rows=manifest.getJSONArray("files");val file=(0 until rows.length()).map{rows.getJSONObject(it)}.first{it.getString("id")==id}
  // Refresh authorization without creating a listening session.
  Audiobookshelf.test(a){updated->persistAccount?.invoke(updated)}
  val url=ProviderHttp.sameOrigin(a,"api/items/${ProviderHttp.segment(manifest.getString("item"))}/file/${ProviderHttp.segment(file.getString("ino"))}/download")
  return Playable(a.getString("id"),id,manifest.getString("title")+" - "+file.getInt("number"),manifest.optString("artist"),manifest.getString("title"),manifest.getString("item"),url,file.getDouble("duration"),"Authorization: Bearer "+a.getString("accessToken"))
 }
 var persistAccount:((JSONObject)->Unit)?=null
 fun detail(c:Context,account:String,item:String):JSONObject?=prefs(c).all.values.asSequence().mapNotNull{(it as? String)?.let{v->JSONObject(v)}}.firstOrNull{it.getString("account")==account&&it.getString("item")==item}?.optJSONObject("detail")
 fun cached(c:Context,account:String,target:SpokenTarget):Playable?=open(c,key(account,target))
 fun open(c:Context,key:String):Playable? {
  val text=prefs(c).getString(key,null)?:return null;val m=JSONObject(text);val descriptors=mutableListOf<android.os.ParcelFileDescriptor>()
  return try{val rows=m.getJSONArray("files");val parts=(0 until rows.length()).map{i->val f=rows.getJSONObject(i);val record=OfflineStore.record(c,m.getString("account")+":"+f.getString("id"))?:throw IllegalStateException();val fd=c.contentResolver.openFileDescriptor(Uri.parse(record.getString("uri")),"r")?:throw IllegalStateException();descriptors.add(fd);require(fd.statSize!=0L);AudioPart("fd://"+fd.fd,f.getDouble("start"),f.getDouble("duration"))}
   val account=m.getString("account");val target=SpokenResumeRef.parse(JSONObject().put("account",account).put("kind",when(m.getString("kind")){"book"->"book";"podcast"->"episode";else->throw IllegalArgumentException("Unknown cached spoken kind")}).put("item",m.getString("item")).put("episode",m.optString("episode"))).target;val checkpoint=LocalPosition.read(c,target.key(account))
   Playable(account,target.key(account),m.getString("title"),m.optString("artist"),m.getString("title"),m.getString("item"),parts.first().url,m.getDouble("duration"),kind=m.getString("kind"),parts=parts,startPosition=checkpoint,descriptors=descriptors,localProgressKey=target.key(account),spokenTarget=target)
  }catch(_:Exception){descriptors.forEach{it.close()};null}
 }
 fun progressManifest(c:Context,key:String):JSONObject {require(key.startsWith("spoken:")&&key.length<=160);val raw=prefs(c).getString(key,null)?:throw IllegalArgumentException("Cached spoken item unavailable");return JSONObject(raw)}
 fun recordKeys(c:Context,key:String):List<String>?{val text=prefs(c).getString(key,null)?:return null;val m=JSONObject(text);val files=m.getJSONArray("files");return (0 until files.length()).map{m.getString("account")+":"+files.getJSONObject(it).getString("id")}}
 fun forget(c:Context,key:String){check(prefs(c).edit().remove(key).commit())}
 fun items(c:Context,index:Map<String,JSONObject> = OfflineStore.recordIndex(c)):List<JSONObject> {return prefs(c).all.values.mapNotNull{value->try{val m=JSONObject(value as String);val rows=m.getJSONArray("files");val records=(0 until rows.length()).map{index[m.getString("account")+":"+rows.getJSONObject(it).getString("id")]?:return@mapNotNull null};JSONObject().put("key",m.getString("key")).put("title",m.getString("title")).put("artist",m.optString("artist")).put("kind",m.getString("kind")).put("account",m.getString("account")).put("bytes",records.sumOf{it.optLong("bytes")})}catch(_:Exception){null}}}
}
