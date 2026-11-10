package local.mediacenter.library
import org.json.*
import java.security.MessageDigest
import java.util.Locale

internal data class MixDefinition(val id:String,val refresh:String,val sources:List<String>,val count:Int,val canonical:String){
 val fingerprint:String get()=MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
 fun period(now:Long):Long=when(refresh){"daily"->now/86400000L;"weekly"->now/(7*86400000L);else->0L}
}
internal object MixSnapshotPlan {
 fun definition(r:JSONObject):MixDefinition {
  val id=r.getString("id");val name=r.getString("name").trim();val refresh=r.getString("refresh");val count=r.getInt("count");val seed=r.getDouble("seed");val familiarity=r.getString("familiarity")
  require(id.length in 1..120&&name.length in 1..80&&refresh in setOf("manual","daily","weekly")&&count in 1..500&&seed.isFinite()&&familiarity in setOf("balanced","familiar","unheard"))
  fun strings(key:String,normalize:Boolean=false):List<String>{val a=r.getJSONArray(key);require(a.length()<=100);return (0 until a.length()).map{val value=a.getString(it);require(value.length<=512);if(normalize)value.trim().lowercase(Locale.ROOT)else value}.filter{!normalize||it.isNotEmpty()}.distinct()}
  val sources=strings("sources");require(sources.isNotEmpty()&&sources.all{it.isNotBlank()})
  val genres=strings("genres",true);val artists=strings("artists",true)
  fun optional(key:String,min:Double,max:Double):Any {if(!r.has(key)||r.isNull(key))return JSONObject.NULL;val value=r.getDouble(key);require(value.isFinite()&&value in min..max);if(key!="maxMinutes")require(value%1==0.0);return value}
  val from=optional("yearFrom",1.0,9999.0);val to=optional("yearTo",1.0,9999.0);if(from is Number&&to is Number)require(from.toDouble()<=to.toDouble())
  val canonical=JSONArray().put(id).put(name).put(JSONArray(sources)).put(JSONArray(genres)).put(JSONArray(artists)).put(from).put(to).put(optional("maxMinutes",1.0,1440.0)).put(count).put(familiarity).put(refresh).put(seed).toString()
  return MixDefinition(id,refresh,sources,count,canonical)
 }
 fun current(saved:JSONObject?,d:MixDefinition,now:Long)=saved!=null&&saved.optString("fingerprint")==d.fingerprint&&saved.optLong("period",-1)==d.period(now)&&saved.has("rows")
 fun due(saved:JSONObject?,d:MixDefinition,now:Long):Boolean {if(d.refresh=="manual")return false;if(saved?.optString("attemptFingerprint")==d.fingerprint&&saved.optLong("retryAfter",0)>now&&saved.optLong("retryAfter",0)-now<=15*60000)return false;return !current(saved,d,now)}
 fun rows(input:JSONArray,d:MixDefinition):JSONArray {
  require(input.length()<=d.count);val output=JSONArray();val seen=mutableSetOf<String>()
  for(i in 0 until input.length()){val r=input.getJSONObject(i);val account=r.getString("account");val id=r.getString("id");require(account in d.sources&&id.length in 1..1000);require(seen.add(JSONArray().put(account).put(id).toString())){"Duplicate track in generated mix"};val out=JSONObject().put("account",account).put("id",id).put("title",r.optString("title").take(500)).put("artist",r.optString("artist").take(500));val duration=r.optDouble("duration",0.0);require(duration.isFinite()&&duration>=0);out.put("duration",duration);val cover=r.optString("coverArt");if(cover.length<=1000&&!cover.contains("://"))out.put("coverArt",cover);output.put(out)}
  return output
 }
}
