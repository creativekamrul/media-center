package local.mediacenter.library
import android.content.Context
import org.json.*
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/** Foreground checks collect identities. The existing native cache service owns media transfers. */
internal object PodcastInbox {
 private var database:PodcastInboxStore?=null
 private val worker=Executors.newSingleThreadExecutor()
 private val busy=AtomicBoolean(false);private val stop=AtomicBoolean(false);private val revision=AtomicLong(0)
 @Volatile private var error=""
 @Synchronized private fun db(c:Context)=database?:PodcastInboxStore(c.applicationContext).also{database=it}
 private fun account(c:Context,id:String)=EncryptedAccounts.read(c,id).also{require(it.optString("type")=="audiobookshelf"){"Reconnect the Audiobookshelf account for this show"}}
 fun cancel(){stop.set(true)}
 fun snapshot(c:Context,raw:JSONObject,metadataOnly:Boolean=false):JSONObject {val db=db(c);val out=if(metadataOnly)JSONObject() else db.entries(raw.optInt("offset",0),raw.optBoolean("unreviewed",true),raw.optString("query").take(200));return out.put("rules",JSONArray(db.rules())).put("busy",busy.get()).put("stopping",busy.get()&&stop.get()).put("revision",revision.get()).put("error",error)}
 fun action(c:Context,action:String,raw:JSONObject):JSONObject {
  val database=db(c)
  when(action){
   "list"->return snapshot(c,raw)
   "status"->return snapshot(c,raw,true)
   "save-rule"->{val rule=PodcastInboxRule.parse(raw);account(c,rule.account);database.save(rule);revision.incrementAndGet()}
   "remove-rule","reset-rule"->{val rule=PodcastInboxRule.parse(raw);if(action=="remove-rule")database.removeRule(rule) else database.reset(rule);revision.incrementAndGet();if(action=="reset-rule")begin(c,true,rule.key)}
   "review","remove","cache"->{val key=raw.getString("key");require(key.length in 1..1700);when(action){"review"->database.review(key,raw.getBoolean("reviewed"));"remove"->database.remove(key);else->database.cache(key)};revision.incrementAndGet();if(action=="cache")begin(c,false,null)}
   "clear-reviewed"->{database.clearReviewed();revision.incrementAndGet()}
   "check"->begin(c,raw.optBoolean("force",false),raw.optString("rule").takeIf{it.isNotBlank()})
   "stop"->cancel()
   else->throw IllegalArgumentException("Unsupported podcast inbox action")
  };return snapshot(c,JSONObject(),true)
 }
 private fun begin(c:Context,force:Boolean,one:String?){if(!busy.compareAndSet(false,true))return;stop.set(false);error="";val context=c.applicationContext
  worker.execute{try{val database=db(context);val rules=database.rules().map{PodcastInboxRule.parse(it) to it.optLong("lastChecked")}.filter{(rule,last)->(if(one!=null)rule.key==one else rule.enabled)&&(force||System.currentTimeMillis()-last>=3600000)}.take(4);val users=mutableMapOf<String,JSONObject>()
   for((rule,_) in rules){if(stop.get())break;try{val a=account(context,rule.account);val persist:(JSONObject)->Unit={EncryptedAccounts.write(context,rule.account,it)};val raw=Audiobookshelf.json(a,"api/items/${ProviderHttp.segment(rule.show)}?expanded=1",persist);require(raw.getString("mediaType")=="podcast"){"This item is not a podcast show"};val user=users.getOrPut(rule.account){PodcastInboxPlan.progressSnapshot(Audiobookshelf.json(a,"api/me",persist))};val episodes=PodcastInboxPlan.episodes(rule.account,rule.show,raw,user);if(stop.get())break;database.ingest(rule,episodes);database.checked(rule,"");revision.incrementAndGet()}catch(e:Exception){if(!stop.get()){database.checked(rule,e.message?:"The show could not be checked");revision.incrementAndGet()}}}
   var cacheAttempts=0;for(entry in database.pending()){if(stop.get())break;val key=entry.getString("key");val rule=database.rules().map{PodcastInboxRule.parse(it)}.firstOrNull{it.account==entry.getString("account")&&it.show==entry.getString("show")};val mode=database.cacheMode(key);if(mode=="auto"&&(rule==null||!rule.autoCache))continue
    try{if(OfflineStore.folder(context)==null){database.cacheState(key,"pending","Choose a Cache folder before saving original episodes");continue};if(mode=="auto"&&rule?.unmetered==true){val manager=context.getSystemService(android.net.ConnectivityManager::class.java);val caps=manager.getNetworkCapabilities(manager.activeNetwork);if(manager.isActiveNetworkMetered||caps?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)!=true){database.cacheState(key,"pending","Waiting for an unmetered connection");continue}}
     if(cacheAttempts>=3)break;cacheAttempts++;val a=account(context,entry.getString("account"));val target=SpokenTarget.Episode(entry.getString("show"),entry.getString("episode"));val tracks=SpokenCache.prepare(context,a,target){EncryptedAccounts.write(context,a.getString("id"),it)};if(stop.get()||database.entry(key)?.optString("cacheState")!="pending")continue;val first=SpokenCache.resolveFile(context,a,tracks.first().id);if(stop.get())break;if(database.entry(key)?.optString("cacheState")!="pending"||database.cacheMode(key)!=mode)continue;if(mode=="auto"&&database.rules().none{it.getString("account")==entry.getString("account")&&it.getString("show")==entry.getString("show")&&it.optBoolean("autoCache")})continue;account(context,entry.getString("account"));OfflineStore.start(context,tracks,first.album+" - "+entry.getString("title")){NativeTrackResolver.resolve(context,it,false)};database.cacheState(key,"queued","");revision.incrementAndGet()
    }catch(e:Exception){database.cacheState(key,"pending",e.message?:"Could not queue this episode");revision.incrementAndGet()}
   }
  }catch(e:Exception){error=e.message?.take(300)?:"Podcast inbox check failed"}finally{busy.set(false);revision.incrementAndGet()}}
 }
}
