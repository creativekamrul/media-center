package local.mediacenter.library
import android.content.Context
import android.util.AtomicFile
import org.json.*
import java.io.File

/** Bounded native snapshot files: source identities and display metadata, never authenticated media URLs. */
internal object MixSnapshots {
 private fun recipes(c:Context):List<JSONObject>{val ui=JSONObject(c.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("ui","{}")?:"{}");val a=ui.optJSONArray("mixRecipes")?:JSONArray();return (0 until minOf(100,a.length())).mapNotNull{a.optJSONObject(it)}.filter{runCatching{MixSnapshotPlan.definition(it)}.isSuccess}.distinctBy{it.getString("id")}}
 private fun directory(c:Context)=File(c.filesDir,"mix-snapshots").apply{check(isDirectory||mkdirs())}
 private fun file(c:Context,id:String):File {require(id.length in 1..120);val hash=java.security.MessageDigest.getInstance("SHA-256").digest(id.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)};return File(directory(c),hash+".json")}
 private fun read(c:Context,id:String):JSONObject?=runCatching{val f=file(c,id);require(f.length()<=2000000);JSONObject(AtomicFile(f).openRead().bufferedReader(Charsets.UTF_8).use{it.readText()})}.getOrNull()
 private fun write(c:Context,id:String,value:JSONObject){val raw=value.toString().toByteArray(Charsets.UTF_8);require(raw.size<=2000000);val f=file(c,id);val others=directory(c).listFiles()?.filter{it.isFile&&it!=f}?.sumOf{it.length()}?:0L;require(others+raw.size<=64L*1024*1024){"Saved mix storage is full. Remove unused mixes before saving another."};val atomic=AtomicFile(f);val out=atomic.startWrite();try{out.write(raw);atomic.finishWrite(out)}catch(e:Exception){atomic.failWrite(out);throw e}}
 @Synchronized fun operation(c:Context,action:String,input:JSONObject):JSONObject {
  if(action=="remove"){AtomicFile(file(c,input.getString("id"))).delete();return JSONObject().put("ok",true)}
  val definitions=recipes(c)
  if(action=="status"){val valid=definitions.map{file(c,it.getString("id")).name}.toSet();directory(c).listFiles()?.filter{it.name.endsWith(".json")&&it.name !in valid}?.forEach{AtomicFile(it).delete()};val now=System.currentTimeMillis();return JSONObject().put("items",JSONArray(definitions.map{raw->val d=MixSnapshotPlan.definition(raw);val saved=read(c,d.id);JSONObject().put("id",d.id).put("due",MixSnapshotPlan.due(saved,d,now)).put("updated",saved?.optLong("updated",0)?:0).put("error",saved?.optString("error","")?:"")}))}
  val id=input.getString("id");val raw=requireNotNull(definitions.firstOrNull{it.getString("id")==id}){"Save this mix's rules first"};val d=MixSnapshotPlan.definition(raw);val saved=read(c,id);val now=System.currentTimeMillis()
  if(action=="get"){val matching=saved?.optString("fingerprint")==d.fingerprint;return JSONObject().put("rows",if(matching)saved!!.optJSONArray("rows")?:JSONArray()else JSONArray()).put("updated",if(matching)saved!!.optLong("updated",0)else 0).put("stale",!MixSnapshotPlan.current(saved,d,now)).put("error",saved?.optString("error","")?:"")}
  require(action in setOf("commit","failure"));require(MixSnapshotPlan.definition(input.getJSONObject("recipe")).fingerprint==d.fingerprint){"Mix rules changed while generating. The previous mix is kept."}
  if(action=="failure"){val keep=saved?:JSONObject();keep.put("attemptFingerprint",d.fingerprint).put("retryAfter",now+15*60000).put("error","A source could not be read. The previous mix is kept; automatic refresh will retry later.");write(c,id,keep);return JSONObject().put("ok",true)}
  require(input.getLong("period")==d.period(now)){"The refresh period changed; generate this mix again"}
  val rows=MixSnapshotPlan.rows(input.getJSONArray("rows"),d)
  for(source in d.sources)if(source!="device")require(EncryptedAccounts.read(c,source).optString("type","navidrome") in setOf("navidrome","downtify","jellyfin")){"A selected music source is no longer connected"}
  write(c,id,JSONObject().put("fingerprint",d.fingerprint).put("attemptFingerprint",d.fingerprint).put("period",d.period(now)).put("updated",now).put("rows",rows).put("error","").put("retryAfter",0));return JSONObject().put("ok",true)
 }
}
