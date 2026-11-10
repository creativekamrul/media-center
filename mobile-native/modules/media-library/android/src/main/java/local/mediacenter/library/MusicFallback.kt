package local.mediacenter.library
import android.content.Context
import org.json.*
/** Explicitly enabled, conservative saved-music fallback. Never used for transfers or spoken targets. */
internal object MusicFallback {
 fun find(c:Context,pending:Playable):Playable? {
  if(pending.kind !in setOf("music","local")||pending.account=="device")return null
  val prefs=c.getSharedPreferences("media_library",Context.MODE_PRIVATE);val ui=JSONObject(prefs.getString("ui","{}")?:"{}")
  if(!ui.optBoolean("musicSourceFallback"))return null
  val original=EncryptedAccounts.read(c,pending.account);if(original.optString("type","navidrome") !in setOf("navidrome","downtify","jellyfin"))return null
  val wanted=MusicIdentity(pending.account,pending.id,pending.title,pending.artist,pending.album,pending.duration,pending.kind)
  if(wanted.title.isBlank()||wanted.artist.isBlank()||!wanted.duration.isFinite()||wanted.duration<=0)return null
  val preferred=ui.optString("preferredSource")
  val accounts=prefs.all.keys.filter{it.startsWith("account.")}.sorted().mapNotNull{try{EncryptedAccounts.read(c,it.removePrefix("account."))}catch(_:Exception){null}}.filter{it.optString("type","navidrome") in setOf("navidrome","downtify","jellyfin")&&it.getString("id")!=pending.account}.sortedBy{if(it.getString("id")==preferred)0 else 1}.take(3)
  val connected=accounts.map{it.getString("id")}.toSet()
  fun candidate(account:String,row:JSONObject)=Playable(account,row.optString("id"),row.optString("title"),row.optString("artist"),row.optString("album"),row.optString("coverArt"),"",row.optDouble("duration",0.0))
  fun matches(t:Playable)=MusicMatch.same(wanted,MusicIdentity(t.account,t.id,t.title,t.artist,t.album,t.duration,t.kind))
  val cached=OfflineStore.recordIndex(c).values.asSequence().filter{it.optString("account") in connected&&CachedMediaKind.music(it)}.take(5000).map{candidate(it.getString("account"),it)}.filter(::matches).sortedBy{if(it.account==preferred)0 else 1}
  for(t in cached)try{OfflineStore.cached(c,t)?.let{return it.copy(fallbackFrom=pending.account)}}catch(_:Exception){}
  val deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(25)
  for(a in accounts){if(System.nanoTime()>=deadline)break;try{
   val rows=when(a.optString("type","navidrome")){
    "downtify"->Downtify.browse(a,"search3",mapOf("query" to pending.title)).optJSONObject("searchResult3")?.optJSONArray("song")?:JSONArray()
    "jellyfin"->Jellyfin.browse(a,"search",pending.title,0).optJSONArray("items")?:JSONArray()
    else->NativeSubsonic.jsonRequest(a,"search3",mapOf("query" to pending.title.take(200),"songCount" to "40","albumCount" to "0","artistCount" to "0")).optJSONObject("searchResult3")?.optJSONArray("song")?:JSONArray()
   }
   for(i in 0 until minOf(40,rows.length())){val row=rows.getJSONObject(i);if(row.optBoolean("isVideo")||(a.optString("type")=="jellyfin"&&row.optString("kind")!="track"))continue;val t=candidate(a.getString("id"),row);if(matches(t))try{return NativeTrackResolver.resolve(c,t,true,false).copy(fallbackFrom=pending.account)}catch(_:Exception){}}
  }catch(_:Exception){}}
  return null
 }
}
