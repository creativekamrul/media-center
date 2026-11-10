package local.mediacenter.library
import android.content.Context
import android.net.Uri
import org.json.*

internal object VideoCache {
 private fun prefs(c:Context)=c.getSharedPreferences("video_cache",Context.MODE_PRIVATE)
 private fun rows(c:Context)=prefs(c).all.values.mapNotNull{runCatching{JSONObject(it as String).also{row->require(row.optString("key").startsWith("video:")&&row.optString("file").startsWith("video-file:")&&row.optString("account").isNotBlank()&&row.optString("id").isNotBlank()&&row.optJSONObject("item")?.optString("kind") in setOf("movie","videoEpisode"))}}.getOrNull()}
 fun prepare(c:Context,a:JSONObject,id:String):List<Playable> {
  requireNotNull(OfflineStore.folder(c)){"Choose a Cache folder first"};val media=Jellyfin.prepare(a,id);val manifest=VideoCachePlan.manifest(a.getString("id"),id,media.source,media.item,media.container).put("cachedAt",System.currentTimeMillis());require(rows(c).size<1000||prefs(c).contains(manifest.getString("key"))){"Remove an old video copy before caching more (1,000 version limit)"}
  require(prefs(c).edit().putString(manifest.getString("key"),manifest.toString()).commit())
  return listOf(Playable(a.getString("id"),manifest.getString("file"),media.item.getString("title"),media.item.optString("artist"),media.item.getString("title"),id,"",media.item.getDouble("duration"),suffix=manifest.getString("container"),kind=media.item.getString("kind")))
 }
 fun resolveFile(c:Context,a:JSONObject,id:String):Playable {
  val manifest=rows(c).firstOrNull{it.getString("account")==a.getString("id")&&it.getString("file")==id}?:throw IllegalStateException("Cached video manifest unavailable")
  val media=Jellyfin.prepare(a,manifest.getString("id"));require(media.source==manifest.getString("source")&&media.item.getString("kind")==manifest.getJSONObject("item").getString("kind")){"The original video changed. Cache the new version from its page."}
  return Playable(a.getString("id"),id,media.item.getString("title"),media.item.optString("artist"),media.item.getString("title"),media.id,media.url,media.item.getDouble("duration"),media.headers,suffix=manifest.getString("container"),kind=media.item.getString("kind"))
 }
 fun detail(c:Context,account:String,id:String):JSONObject?=rows(c).filter{it.getString("account")==account&&it.getString("id")==id}.maxByOrNull{it.optLong("cachedAt")}?.let{JSONObject(it.getJSONObject("item").toString())}
 fun cached(c:Context,account:String,id:String):JellyfinMedia? {for(manifest in rows(c).sortedByDescending{it.optLong("cachedAt")}.filter{it.getString("account")==account&&it.getString("id")==id})open(c,manifest.getString("key"))?.let{return it};return null}
 fun open(c:Context,key:String):JellyfinMedia? {
  val raw=prefs(c).getString(key,null)?:return null;val manifest=JSONObject(raw);val record=OfflineStore.record(c,manifest.getString("account")+":"+manifest.getString("file"))?:return null
  val descriptor=try{c.contentResolver.openFileDescriptor(Uri.parse(record.getString("uri")),"r")}catch(_:Exception){null}?:return null
  return try{require(descriptor.statSize!=0L);val item=JSONObject(manifest.getJSONObject("item").toString());val checkpoint=runCatching{JSONObject(c.getSharedPreferences("jellyfin_checkpoints",Context.MODE_PRIVATE).getString(manifest.getString("account")+":"+manifest.getString("id"),"{}")?:"{}").optDouble("position",Double.NaN)}.getOrDefault(Double.NaN);item.put("resume",VideoCachePlan.resume(checkpoint,item.optDouble("resume"),item.getDouble("duration")))
   JellyfinMedia(JSONObject().put("id",manifest.getString("account")),manifest.getString("id"),item,"fd://"+descriptor.fd,manifest.getString("source"),"","",manifest.getString("container"),descriptor,true)
  }catch(_:Exception){descriptor.close();null}
 }
 fun progressManifest(c:Context,key:String):JSONObject {
  require(key.startsWith("video:")&&key.length<=200);val raw=prefs(c).getString(key,null)?:throw IllegalStateException("The cached video is unavailable");val m=JSONObject(raw);require(m.getString("key")==key&&m.getJSONObject("item").getString("kind") in setOf("movie","videoEpisode"));val playable=open(c,key)?:throw IllegalStateException("The cached video file is unavailable. Reconnect its folder first.");playable.descriptor?.close();return m
 }
 fun recordKeys(c:Context,key:String):List<String>? {val raw=prefs(c).getString(key,null)?:return null;val row=JSONObject(raw);return listOf(row.getString("account")+":"+row.getString("file"))}
 fun forget(c:Context,key:String){require(prefs(c).edit().remove(key).commit())}
 fun items(c:Context,records:Map<String,JSONObject> = OfflineStore.recordIndex(c)):List<JSONObject>{return rows(c).mapNotNull{row->val record=records[row.getString("account")+":"+row.getString("file")]?:return@mapNotNull null;JSONObject().put("key",row.getString("key")).put("account",row.getString("account")).put("id",row.getString("id")).put("kind",row.getJSONObject("item").getString("kind")).put("title",row.getJSONObject("item").getString("title")).put("artist",row.getJSONObject("item").optString("artist")).put("bytes",record.getLong("bytes"))}}
}
