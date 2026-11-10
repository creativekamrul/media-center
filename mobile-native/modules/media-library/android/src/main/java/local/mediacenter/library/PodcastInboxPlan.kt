package local.mediacenter.library
import org.json.*
import java.util.Locale

internal data class PodcastInboxRule(val account:String,val show:String,val title:String,val include:String="",val exclude:String="",val minSeconds:Double=0.0,val maxSeconds:Double=0.0,val limit:Int=10,val onlyUnplayed:Boolean=true,val enabled:Boolean=false,val autoCache:Boolean=false,val unmetered:Boolean=true){
 val key:String get()=JSONArray(listOf(account,show)).toString()
 fun json()=JSONObject().put("account",account).put("show",show).put("title",title).put("include",include).put("exclude",exclude).put("minSeconds",minSeconds).put("maxSeconds",maxSeconds).put("limit",limit).put("onlyUnplayed",onlyUnplayed).put("enabled",enabled).put("autoCache",autoCache).put("unmetered",unmetered)
 companion object {
  fun parse(raw:JSONObject):PodcastInboxRule {
   fun text(key:String,fallback:String?=null):String{if(!raw.has(key)&&fallback!=null)return fallback;return (raw.opt(key) as? String)?:throw IllegalArgumentException("Use a text value for $key")}
   fun number(key:String,fallback:Double):Double{if(!raw.has(key))return fallback;return (raw.opt(key) as? Number)?.toDouble()?:throw IllegalArgumentException("Use a number for $key")}
   fun flag(key:String,fallback:Boolean):Boolean{if(!raw.has(key))return fallback;return (raw.opt(key) as? Boolean)?:throw IllegalArgumentException("Use a switch value for $key")}
   val a=text("account");val s=text("show");val title=text("title").trim();val include=text("include","").trim();val exclude=text("exclude","").trim();val min=number("minSeconds",0.0);val max=number("maxSeconds",0.0);val count=number("limit",10.0);require(count.isFinite()&&count==count.toInt().toDouble()){"Use a whole number of episodes"};val limit=count.toInt()
   require(a.length in 1..512&&s.length in 1..512&&title.length in 1..500&&include.length<=200&&exclude.length<=200){"Check the show and filter fields"}
   require(min.isFinite()&&max.isFinite()&&min in 0.0..604800.0&&max in 0.0..604800.0&&(max==0.0||max>=min)&&limit in 1..50){"Use valid durations and a limit from 1 to 50 episodes"}
   return PodcastInboxRule(a,s,title,include,exclude,min,max,limit,flag("onlyUnplayed",true),flag("enabled",false),flag("autoCache",false),flag("unmetered",true))
  }
 }
}
internal object PodcastInboxPlan {
 fun progressSnapshot(raw:JSONObject):JSONObject {
  val rows=raw.getJSONArray("mediaProgress");require(rows.length()<=100000){"The server progress snapshot exceeds the inbox limit"};val out=JSONArray()
  for(i in 0 until rows.length()){val p=rows.optJSONObject(i)?:continue;val episode=p.optString("episodeId");if(episode.isBlank()||episode=="null")continue;out.put(JSONObject().put("libraryItemId",p.opt("libraryItemId")?:JSONObject.NULL).put("episodeId",episode).put("isFinished",p.opt("isFinished")?:JSONObject.NULL).put("currentTime",p.opt("currentTime")?:0))}
  return JSONObject().put("mediaProgress",out)
 }
 /** ABS 2.35.1 expanded podcast + /api/me. Unknown media never becomes an episode. */
 fun episodes(account:String,show:String,raw:JSONObject,user:JSONObject):List<JSONObject>{
  require(raw.getString("mediaType")=="podcast"&&raw.getString("id")==show){"Choose a podcast show for the inbox"}
  val rows=raw.getJSONObject("media").getJSONArray("episodes");require(rows.length()<=20000){"This show exceeds the 20,000-episode inbox scan limit"}
  val progress=user.getJSONArray("mediaProgress");val own=mutableMapOf<String,JSONObject>();val unknown=mutableSetOf<String>()
  for(i in 0 until progress.length()){val p=progress.optJSONObject(i)?:continue;val episode=p.optString("episodeId").takeIf{it.isNotBlank()&&it!="null"}?:continue;val parent=p.optString("libraryItemId");if(parent==show){require(own[episode]==null){"The server returned conflicting episode progress identities"};own[episode]=p}else if(parent.isBlank()||parent=="null")unknown.add(episode)}
  val showTitle=raw.getJSONObject("media").getJSONObject("metadata").optString("title").take(500)
  val ids=mutableSetOf<String>();return (0 until rows.length()).mapNotNull{i->val e=rows.getJSONObject(i);val id=e.getString("id");require(id.length in 1..512&&ids.add(id)){"The show contains an invalid or repeated episode identity"};val audio=e.optJSONObject("audioFile");val duration=audio?.optDouble("duration",0.0)?:0.0
   if(audio==null||!duration.isFinite()||duration<=0)return@mapNotNull null
   val p=own[id];JSONObject().put("account",account).put("show",show).put("episode",id).put("kind","episode").put("title",e.optString("title").take(500)).put("showTitle",showTitle).put("coverArt",show).put("duration",duration).put("publishedAt",e.optLong("publishedAt",0).coerceAtLeast(0)).put("addedAt",e.optLong("addedAt",0).coerceAtLeast(0)).put("progressKnown",if(p!=null)p.opt("isFinished") is Boolean else id !in unknown).put("finished",p?.optBoolean("isFinished",false)?:false).put("position",(p?.optDouble("currentTime",0.0)?:0.0).takeIf{it.isFinite()&&it>=0}?:0.0)
  }.sortedWith(compareByDescending<JSONObject>{it.optLong("publishedAt").takeIf{t->t>0}?:it.optLong("addedAt")}.thenBy{it.getString("episode")})
 }
 fun select(rule:PodcastInboxRule,episodes:List<JSONObject>,seen:Set<String>):List<JSONObject>{
  val include=rule.include.lowercase(Locale.ROOT);val exclude=rule.exclude.lowercase(Locale.ROOT)
  return episodes.asSequence().filter{it.getString("account")==rule.account&&it.getString("show")==rule.show&&it.getString("kind")=="episode"&&it.getString("episode") !in seen}.filter{e->val text=e.getString("title").lowercase(Locale.ROOT);val duration=e.getDouble("duration");(!rule.onlyUnplayed||(e.optBoolean("progressKnown")&&!e.optBoolean("finished")))&&(include.isBlank()||text.contains(include))&&(exclude.isBlank()||!text.contains(exclude))&&duration>=rule.minSeconds&&(rule.maxSeconds==0.0||duration<=rule.maxSeconds)}.take(rule.limit).toList()
 }
}
