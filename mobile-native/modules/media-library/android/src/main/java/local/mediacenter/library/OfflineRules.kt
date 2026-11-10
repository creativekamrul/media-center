package local.mediacenter.library
import android.content.Context
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.atomic.AtomicBoolean

/** Native foreground/system-scheduled collection checks. Original transfers stay in DownloadService. */
internal object OfflineRules {
 private val running=AtomicBoolean(false)
 private fun ui(c:Context)=JSONObject(c.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("ui","{}")?:"{}")
 private fun prefs(c:Context)=c.getSharedPreferences("offline_rule_checks",Context.MODE_PRIVATE)
 fun definitions(c:Context)=OfflineRulesPlan.definitions(ui(c))
 fun background(c:Context)=ui(c).optBoolean("backgroundOfflineRules",false)
 fun status(c:Context):JSONObject {val p=prefs(c);val rows=JSONArray();for(rule in definitions(c)){val saved=runCatching{JSONObject(p.getString("rule."+rule.id,"{}")?:"{}")}.getOrDefault(JSONObject());if(saved.optString("fingerprint")==rule.fingerprint())rows.put(saved.put("id",rule.id))};return JSONObject().put("busy",running.get()).put("checks",rows).put("message",p.getString("message","")).put("lastBackground",p.getLong("lastBackground",0))}
 private fun message(c:Context,value:String){prefs(c).edit().putString("message",value).apply();OfflineStore.statusChanged()}
 private fun foreground():Boolean {val state=android.app.ActivityManager.RunningAppProcessInfo();android.app.ActivityManager.getMyMemoryState(state);return state.importance==android.app.ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND}
 private fun same(c:Context,rule:OfflineCollectionRule)=definitions(c).any{it.id==rule.id&&it.fingerprint()==rule.fingerprint()&&it.enabled}
 private fun stopped(c:Context,rule:OfflineCollectionRule,background:Boolean,cancelled:()->Boolean)=cancelled()||!same(c,rule)||(if(background)!this.background(c) else !foreground())
 fun check(c:Context,force:Boolean=false,background:Boolean=false,scheduledOwner:String?=null,cancelled:()->Boolean={false}):JSONObject {
  if(!running.compareAndSet(false,true))return status(c)
  try{
   val preferences=prefs(c);val now=System.currentTimeMillis();val rules=definitions(c).filter{rule->rule.enabled&&(force||OfflineRulesPlan.due(rule,runCatching{preferences.getString("rule."+rule.id,null)?.let{JSONObject(it)}}.getOrNull(),now))}.sortedBy{preferences.getLong("order."+it.id,0)}.take(4)
   if(rules.isEmpty())return status(c).put("busy",false)
   if(cancelled()||(if(background)!this.background(c) else !foreground()))return status(c).put("busy",false)
   if(OfflineStore.folder(c)==null){message(c,"Choose a Cache folder before enabling offline checks.");return status(c).put("busy",false)}
   val policy=OfflineStore.policy(c);if(background&&(!policy.unmetered||policy.budget<=0)){message(c,"Background checks need unmetered transfers and a storage budget.");return status(c).put("busy",false)}
   val manager=c.getSystemService(android.net.ConnectivityManager::class.java);val metered=manager.isActiveNetworkMetered;val connected=manager.getNetworkCapabilities(manager.activeNetwork)!=null
   if(!connected){message(c,"Waiting for a network connection.");return status(c).put("busy",false)}
   val snapshot=JSONObject(OfflineStore.state(c));val jobs=snapshot.getJSONArray("jobs");val accounts=c.getSharedPreferences("media_library",Context.MODE_PRIVATE)
   if(snapshot.optBoolean("busy")||(0 until jobs.length()).any{val job=jobs.getJSONObject(it);accounts.contains("account."+job.optString("account"))&&job.optString("status") in setOf("queued","downloading","paused")}){message(c,"Existing or paused transfers take priority. Resume or cancel them in Cache.");return status(c).put("busy",false)}
   policy.reason(metered,c.getSystemService(android.os.BatteryManager::class.java).isCharging,snapshot.optLong("storedBytes"))?.let{message(c,it);return status(c).put("busy",false)}
   var checked=0;var queued=0
   for(rule in rules){
    if(stopped(c,rule,background,cancelled))continue;if(rule.unmetered&&metered)continue
    val currentJobs=JSONObject(OfflineStore.state(c)).getJSONArray("jobs")
    if((0 until currentJobs.length()).any{currentJobs.getJSONObject(it).optString("status")=="paused"&&accounts.contains("account."+currentJobs.getJSONObject(it).optString("account"))})break
    var error="";var count=0
    try{
     val account=EncryptedAccounts.read(c,rule.account);val type=account.optString("type","navidrome");require(type in setOf("navidrome","downtify")){"Unsupported automatic music source"};require(type!="downtify"||rule.kind!="favorites"){"Choose a saved Downtify album or playlist"}
     val method=OfflineRulesPlan.method(rule);val params=mapOf("id" to rule.item);val raw=if(type=="downtify"){Downtify.attach(c);Downtify.browse(account,method,params)}else NativeSubsonic.jsonRequest(account,method,params);val ids=OfflineRulesPlan.ids(raw,rule,type=="downtify")
     if(stopped(c,rule,background,cancelled))continue
     if(ids.isNotEmpty()){if(type=="downtify")Downtify.retain(account,ids);if(stopped(c,rule,background,cancelled))continue;OfflineStore.start(c,ids.map{TrackMetadata.pending(rule.account,it)},rule.title,scheduledOwner){NativeTrackResolver.resolve(c,it,false)};count=ids.size;queued+=count}
    }catch(_:Exception){error="Could not check this collection. Test its connection in Settings, then retry."}
    if(!stopped(c,rule,background,cancelled)){val result=JSONObject().put("fingerprint",rule.fingerprint()).put("lastChecked",now).put("queued",count).put("error",error);preferences.edit().putString("rule."+rule.id,result.toString()).putLong("order."+rule.id,now).apply();checked++}
   }
   if(background)preferences.edit().putLong("lastBackground",now).apply()
   message(c,if(checked==0)"No offline rules are due." else "Checked $checked collections; requested $queued tracks. Transfer status is shown in Cache.")
   return status(c).put("busy",false)
  }finally{running.set(false);OfflineStore.statusChanged()}
 }
}
