package local.mediacenter.library
import android.content.Context
import org.json.*
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
internal object SmartQueue {
 private val sources=Executors.newFixedThreadPool(3)
 private fun array(rows:JSONArray?)=if(rows==null)emptyList() else (0 until rows.length()).map{rows.getJSONObject(it)}
 fun fetch(c:Context,current:Playable,excluded:Set<Pair<String,String>>):List<Playable>{
  val prefs=c.getSharedPreferences("media_library",Context.MODE_PRIVATE);val ui=JSONObject(prefs.getString("ui","{}")?:"{}")
  val accounts=prefs.all.keys.filter{it.startsWith("account.")}.sorted().mapNotNull{try{EncryptedAccounts.read(c,it.removePrefix("account."))}catch(_:Exception){null}}.filter{it.optString("type","navidrome") in setOf("navidrome","downtify","jellyfin")}.take(8)
  val jobs=accounts.map{a->sources.submit<List<Playable>>{
   try{
    val rows=when(a.optString("type","navidrome")){
     "downtify"->{val all=array(Downtify.browse(a,"search3",mapOf("query" to "")).optJSONObject("searchResult3")?.optJSONArray("song"));val artist=if(current.artist.isNotBlank())array(Downtify.browse(a,"search3",mapOf("query" to current.artist)).optJSONObject("searchResult3")?.optJSONArray("song")) else emptyList();all+artist}
     "jellyfin"->array(Jellyfin.browse(a,"music","",0).optJSONArray("items")).filter{it.optString("kind")=="track"}
     else->array(NativeSubsonic.jsonRequest(a,"getRandomSongs",mapOf("size" to "80")).optJSONObject("randomSongs")?.optJSONArray("song")).filter{!it.optBoolean("isVideo")}
    }
    rows.filter{it.optString("id").length in 1..512}.map{Playable(a.getString("id"),it.getString("id"),it.optString("title"),it.optString("artist"),it.optString("album"),it.optString("coverArt"),"",it.optDouble("duration",0.0))}
   }catch(_:Exception){emptyList()}
  }}
  val deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(30)
  val tracks=mutableListOf<Playable>()
  // Cached music remains eligible when a provider is offline; spoken physical files are excluded.
  val cached=OfflineStore.recordIndex(c).values.toList().asReversed().filter{CachedMediaKind.music(it)}.take(200)
  val activeAccounts=accounts.map{it.getString("id")}.toSet()
  tracks.addAll(cached.filter{it.optString("account") in activeAccounts}.map{Playable(it.getString("account"),it.getString("id"),it.optString("title"),it.optString("artist"),it.optString("album"),it.optString("coverArt"),"",it.optDouble("duration"))})
  for(job in jobs){try{val remaining=deadline-System.nanoTime();if(remaining>0)tracks.addAll(job.get(remaining,TimeUnit.NANOSECONDS))}catch(_:Exception){ }finally{if(!job.isDone)job.cancel(true)}}
  val feedback=ui.optJSONObject("recommendationFeedback")?:JSONObject();val hidden=mutableSetOf<Pair<String,String>>();val hiddenRaw=feedback.optJSONArray("tracks")?:JSONArray();for(i in 0 until hiddenRaw.length())try{val pair=JSONArray(hiddenRaw.getString(i));hidden.add(pair.getString(0) to pair.getString(1))}catch(_:Exception){}
  val artists=feedback.optJSONArray("artists")?:JSONArray();val hiddenArtists=(0 until artists.length()).map{artists.optString(it).trim().lowercase(Locale.ROOT)}.toSet()
  val likes=ui.optJSONArray("likes")?:JSONArray();val liked=(0 until likes.length()).map{likes.optString(it)}.toSet()
  val history=ListeningStore(c).use{JSONArray(it.list("recent",200))};val artistWeights=mutableMapOf<String,Double>();for(i in 0 until history.length()){val row=history.getJSONObject(i);if(row.optString("kind") in setOf("music","local")){val artist=row.optString("artist").trim().lowercase(Locale.ROOT);artistWeights[artist]=(artistWeights[artist]?:0.0)+1.0/(i+1)}}
  val day=System.currentTimeMillis()/86400000
  val candidates=tracks.map{t->val artist=t.artist.trim().lowercase(Locale.ROOT);val noise=((t.account+"\u0000"+t.id+day).hashCode().toLong() and 0xffffffffL)/4294967296.0;QueueCandidate(t.account,t.id,t.artist,noise+(if(artist.isNotBlank()&&artist==current.artist.trim().lowercase(Locale.ROOT))2.0 else 0.0)+(if(t.account+":"+t.id in liked)2.0 else 0.0)+(artistWeights[artist]?:0.0).coerceAtMost(2.0))}
  val selected=QueueRecommendations.select(candidates,excluded,hidden,hiddenArtists,current.artist)
  val byId=tracks.associateBy{it.account to it.id};return selected.mapNotNull{byId[it.identity]}
 }
}
