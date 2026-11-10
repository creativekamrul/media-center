package local.mediacenter.library
import android.content.Context
import org.json.*

/** Opt-in next-queue caching, not a library crawl or a server download request. */
internal object PredictiveCache {
 private val attempted=mutableSetOf<String>();private var queued=0
 @Synchronized fun check(c:Context):Int {
  val preferences=c.getSharedPreferences("media_library",Context.MODE_PRIVATE);val ahead=JSONObject(preferences.getString("ui","{}")?:"{}").optInt("cacheAhead",0);require(ahead in setOf(0,1,3,5))
  if(ahead==0||queued>=50||OfflineStore.folder(c)==null)return 0
  val policy=OfflineStore.policy(c);if(!policy.unmetered||policy.budget<=0)return 0
  val manager=c.getSystemService(android.net.ConnectivityManager::class.java);val caps=manager.getNetworkCapabilities(manager.activeNetwork);if(manager.isActiveNetworkMetered||caps?.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)!=true)return 0
  val state=JSONObject(OfflineStore.state(c));val jobs=state.getJSONArray("jobs");if(state.optBoolean("busy")||(0 until jobs.length()).any{jobs.getJSONObject(it).optString("status") in setOf("queued","downloading","paused")})return 0
  if(policy.reason(false,c.getSystemService(android.os.BatteryManager::class.java).isCharging,state.optLong("storedBytes"))!=null)return 0
  val snapshot=JSONObject(Playback.clientState(-1));val cached=OfflineStore.recordIndex(c).values.map{PredictiveCachePlan.key(it.getString("account"),it.getString("id"))}.toSet()
  val candidates=PredictiveCachePlan.select(snapshot,ahead,attempted+cached,50-queued).filter{(account,id)->try{val a=EncryptedAccounts.read(c,account);when(a.optString("type")){"navidrome","jellyfin"->true;"downtify"->Downtify.isSavedTrack(account,id);else->false}}catch(_:Exception){false}}
  var count=0
  for((account,tracks) in candidates.groupBy{it.first}){
   val currentAhead=JSONObject(preferences.getString("ui","{}")?:"{}").optInt("cacheAhead",0);if(currentAhead!=ahead||!PredictiveCachePlan.sameQueue(snapshot,JSONObject(Playback.state())))break
   val entries=tracks.map{TrackMetadata.pending(account,it.second)};val a=EncryptedAccounts.read(c,account);if(a.optString("type")=="downtify")Downtify.retain(a,entries.map{it.id})
   OfflineStore.start(c,entries,"Queue ahead"){NativeTrackResolver.resolve(c,it,false)}
   tracks.forEach{attempted.add(PredictiveCachePlan.key(it.first,it.second))};queued+=tracks.size;count+=tracks.size
  }
  return count
 }
}
