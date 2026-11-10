package local.mediacenter.library
import org.json.*
import java.net.URI

internal object BackupData {
 val preferences=setOf("media_library","custom_lyrics","custom_covers","artwork_retention","spoken_checkpoints","jellyfin_checkpoints","downtify_pending","media_downloads","device_library")
 data class Table(val database:String,val name:String,val columns:List<String>,val numbers:Set<String>,val limit:Int)
 val tables=listOf(
  Table("listening.db","history",listOf("identity","metadata","seconds","plays","last_played"),setOf("seconds","plays","last_played"),100000),
  Table("podcast-inbox.db","rules",listOf("identity","account","show_id","config","last_checked","error"),setOf("last_checked"),20),
  Table("podcast-inbox.db","seen",listOf("account","show_id","episode"),emptySet(),100000),
  Table("podcast-inbox.db","inbox",listOf("identity","account","show_id","episode","payload","search_text","published","reviewed","created","cache_mode","cache_state","cache_error","cache_checked"),setOf("published","reviewed","created","cache_checked"),3000)
 )
 fun validate(root:JSONObject){
  require(root.opt("formatVersion") is Number&&root.getDouble("formatVersion")==1.0){"Unsupported backup version"};require(root.toString().length<=16*1024*1024){"Backup metadata exceeds 16 MiB"}
  val accounts=root.getJSONArray("accounts");require(accounts.length()<=100);val identities=mutableSetOf<String>()
  for(i in 0 until accounts.length()){
   val a=accounts.getJSONObject(i);val id=a.getString("id");require(id.matches(Regex("[a-zA-Z0-9-]{1,80}"))&&identities.add(id));require(a.optString("type","navidrome") in setOf("navidrome","downtify","audiobookshelf","jellyfin"));require(a.opt("name") is String&&a.getString("name").length in 1..200&&a.opt("username") is String&&a.opt("password") is String);if(a.optString("type","navidrome")=="navidrome")require(a.getString("username").isNotBlank()&&a.getString("password").isNotEmpty());if(a.optString("type")=="jellyfin")require(a.optString("userId").isNotBlank()&&a.optString("accessToken").isNotBlank());if(a.optString("type")=="audiobookshelf")require(a.optString("accessToken").isNotBlank());val uri=URI(a.getString("url"));require(uri.scheme=="https"||(uri.scheme=="http"&&a.opt("allowHttp")==true));require(!uri.host.isNullOrBlank()&&uri.userInfo==null&&uri.query==null&&uri.fragment==null);for(k in a.keys()){val v=a.get(k);require(v is String||v is Boolean||v is Number);if(v is String)require(v.length<=16384&&!v.contains('\u0000'))};for(k in listOf("cookie","accessToken","refreshToken"))require(!a.optString(k).contains('\r')&&!a.optString(k).contains('\n'))
  }
  val prefs=root.getJSONObject("preferences");require(prefs.keys().asSequence().toSet()==preferences)
  for(p in prefs.keys()){val rows=prefs.getJSONObject(p);require(rows.length()<=50000);for(k in rows.keys()){require(k.length in 1..1700&&!k.contains('\u0000')&&!k.startsWith("account."));require(rows.get(k) is String&&rows.getString(k).length<=8*1024*1024)}
   if(p=="media_downloads")require(rows.keys().asSequence().all{it in setOf("policy","template")})
   if(p=="device_library")require(rows.keys().asSequence().all{it=="stations"})
  }
  val main=prefs.optJSONObject("media_library")?:JSONObject();for(k in listOf("ui","audio","playbackPolicy","musicTransitions","musicSession","spokenQueueSession","lastSpoken"))if(main.has(k))JSONObject(main.getString(k))
  val download=prefs.getJSONObject("media_downloads");if(download.has("policy"))CachePolicy.parse(download.getString("policy"));if(download.has("template"))require(download.getString("template") in setOf("flat","artist-album"));val stations=JSONArray(prefs.getJSONObject("device_library").optString("stations","[]"));require(stations.length()<=1000);for(i in 0 until stations.length()){val station=stations.getJSONObject(i);val uri=URI(station.getString("url"));require(uri.scheme in setOf("http","https")&&!uri.host.isNullOrBlank()&&uri.userInfo==null&&uri.fragment==null);require(station.getString("id").isNotBlank()&&station.getString("title").length in 1..200)}
  if(main.has("audio"))AudioOptions.parse(JSONObject(main.getString("audio")));if(main.has("playbackPolicy"))PlaybackPolicy.parse(JSONObject(main.getString("playbackPolicy")));if(main.has("musicTransitions"))MusicTransitions.parse(JSONObject(main.getString("musicTransitions")))
  val data=root.getJSONObject("tables");require(data.keys().asSequence().toSet()==tables.map{it.name}.toSet())
  for(t in tables){val rows=data.getJSONArray(t.name);require(rows.length()<=t.limit);val keys=mutableSetOf<String>();for(i in 0 until rows.length()){val row=rows.getJSONArray(i);require(row.length()==t.columns.size);for(j in t.columns.indices){val v=row.get(j);if(t.columns[j] in t.numbers){require(v is Number&&v.toDouble().isFinite()&&v.toDouble()>=0);if(t.columns[j]!="seconds")require(v.toDouble()%1==0.0&&v.toDouble()<=9_007_199_254_740_991.0);if(t.columns[j]=="reviewed")require(v.toInt() in 0..1)}else {require(v is String&&v.length<=2*1024*1024&&!v.contains('\u0000'));if(t.columns[j] in setOf("metadata","config","payload"))JSONObject(v)}};if(t.name=="rules"){val rule=PodcastInboxRule.parse(JSONObject(row.getString(3)));require(rule.account==row.getString(1)&&rule.show==row.getString(2)&&rule.key==row.getString(0))}
   if(t.name=="inbox"){val episode=JSONObject(row.getString(4));require(episode.optString("kind")=="episode"&&episode.getString("account")==row.getString(1)&&episode.getString("show")==row.getString(2)&&episode.getString("episode")==row.getString(3)&&PodcastInboxStore.identity(episode)==row.getString(0));require(episode.opt("title") is String&&episode.opt("showTitle") is String)}
   val key=if(t.name=="seen")JSONArray(listOf(row.getString(0),row.getString(1),row.getString(2))).toString()else row.getString(0);require(keys.add(key)){"Backup contains duplicate database identities"}}}
  val assets=root.getJSONArray("assets");require(assets.length()<=2048)
  val names=mutableSetOf<String>();for(i in 0 until assets.length()){val r=assets.getJSONObject(i);require(BackupArchive.asset(r.getString("path"))&&names.add(r.getString("path")));require(r.getInt("bytes") in 0..16*1024*1024&&r.getString("sha256").matches(Regex("[0-9a-f]{64}")))}
  val covers=prefs.optJSONObject("custom_covers");if(covers!=null)for(k in covers.keys())require("custom-covers/"+covers.getString(k) in names){"A custom cover is missing from this backup"}
 }
 /** All automatic work needs explicit review on a different installation. */
 fun safeRestore(root:JSONObject):JSONObject {
  val copy=JSONObject(root.toString());val prefs=copy.getJSONObject("preferences");val main=prefs.optJSONObject("media_library")?:JSONObject().also{prefs.put("media_library",it)};val ui=JSONObject(main.optString("ui","{}"));ui.put("backgroundOfflineRules",false).put("cacheAhead",0).put("automaticContinuation",false).put("musicSourceFallback",false).put("migrationReviewRequired",true)
  if(ui.optString("material")=="glass")ui.put("material","frosted").put("liquidGlassAcknowledged",false)
  ui.optJSONArray("offlineRules")?.let{r->for(i in 0 until r.length())r.getJSONObject(i).put("enabled",false)}
  ui.optJSONArray("mixRecipes")?.let{r->for(i in 0 until r.length())r.getJSONObject(i).put("refresh","manual")}
  main.put("ui",ui.toString())
  val tables=copy.getJSONObject("tables");val rules=tables.getJSONArray("rules");for(i in 0 until rules.length()){val r=rules.getJSONArray(i);val config=JSONObject(r.getString(3));config.put("enabled",false).put("autoCache",false);r.put(3,config.toString())}
  val inbox=tables.getJSONArray("inbox");for(i in 0 until inbox.length()){val r=inbox.getJSONArray(i);r.put(9,"").put(10,"").put(11,"").put(12,0)}
  return copy
 }
 fun summary(root:JSONObject)=JSONObject().put("accounts",root.getJSONArray("accounts").length()).put("history",root.getJSONObject("tables").getJSONArray("history").length()).put("inbox",root.getJSONObject("tables").getJSONArray("inbox").length()).put("assets",root.getJSONArray("assets").length())
}
