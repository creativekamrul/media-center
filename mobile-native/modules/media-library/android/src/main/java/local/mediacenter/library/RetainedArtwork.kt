package local.mediacenter.library
import android.content.Context
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.*

/** Explicit pins and cached files retain a small cover outside the disposable thumbnail LRU. */
internal object RetainedArtwork {
 private val worker=ThreadPoolExecutor(1,1,0L,TimeUnit.MILLISECONDS,ArrayBlockingQueue<Runnable>(1),ThreadPoolExecutor.DiscardOldestPolicy())
 private val failedAt=mutableMapOf<String,Long>() // Accessed only by the retention worker.
 private fun directory(c:Context)=File(c.filesDir,"retained-artwork").apply{mkdirs()}
 fun bytes(c:Context,account:String,id:String):ByteArray?=File(directory(c),CustomizationData.key(account,id)+".image").takeIf{it.isFile&&it.length() in 1..2_097_152}?.readBytes()
 fun pins(c:Context,raw:String){val refs=ArtworkReferences.parse(raw);val safe=JSONArray(refs.map{JSONObject().put("account",it.first).put("id",it.second)}).toString();check(c.getSharedPreferences("artwork_retention",Context.MODE_PRIVATE).edit().putString("pins",safe).commit());refresh(c)}
 fun refresh(c:Context){val app=c.applicationContext;worker.execute{try{sync(app)}catch(_:Exception){/* Artwork failure must never fail a completed audio transfer. */}}}
 private fun sync(c:Context){
  if(NativeBackup.restoring)return
  val pins=ArtworkReferences.parse(c.getSharedPreferences("artwork_retention",Context.MODE_PRIVATE).getString("pins","[]")?:"[]")
  val cached=OfflineStore.recordIndex(c).values.mapNotNull{row->val a=row.optString("account");val id=row.optString("coverArt").ifBlank{row.optString("id")};if(a.isNotBlank()&&id.isNotBlank())a to id else null}
  val refs=(pins+cached).toSet();val wanted=refs.map{CustomizationData.key(it.first,it.second)+".image"}.toSet();val dir=directory(c)
  failedAt.keys.retainAll(wanted);val deadline=android.os.SystemClock.elapsedRealtime()+30000
  dir.listFiles()?.filter{it.name.endsWith(".image")&&it.name !in wanted}?.forEach{it.delete()}
  for((account,id) in refs){
   if(android.os.SystemClock.elapsedRealtime()>=deadline)break
   val target=File(dir,CustomizationData.key(account,id)+".image")
   if(target.isFile||CustomArtwork.version(c,account,id)!=null)continue
   if(android.os.SystemClock.elapsedRealtime()-(failedAt[target.name]?:-900000L)<900000L)continue
   try{
    val uri=Uri.parse(NativeArtwork.read(c,account,id,384));val data=c.contentResolver.openInputStream(uri)?.use{it.readBytes()}?:continue
    require(data.size in 1..2_097_152);val temporary=File(dir,UUID.randomUUID().toString()+".partial")
    try{temporary.writeBytes(data);check(temporary.renameTo(target));failedAt.remove(target.name)}finally{temporary.delete()}
   }catch(_:Exception){failedAt[target.name]=android.os.SystemClock.elapsedRealtime()}
  }
 }
}
