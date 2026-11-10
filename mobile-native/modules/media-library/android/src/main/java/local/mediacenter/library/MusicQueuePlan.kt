package local.mediacenter.library
import org.json.JSONArray

data class MusicQueueRef(val account:String,val id:String,val title:String?=null,val artist:String?=null,val album:String?=null,val cover:String?=null,val duration:Double?=null)
object MusicQueuePlan {
 fun parse(input:String,sourceType:(String)->String):List<MusicQueueRef>{
  require(input.length<=4000000);val rows=JSONArray(input);require(rows.length() in 1..5000)
  val checked=mutableSetOf<String>()
  return (0 until rows.length()).map{i->val r=rows.getJSONObject(i);val account=r.getString("account");val id=r.getString("id");require(account.length in 1..512&&id.length in 1..512)
   if(checked.add(account)&&account!="device")require(sourceType(account) in setOf("navidrome","downtify","jellyfin")){"Mixes accept music sources only"}
   fun text(key:String):String?{if(!r.has(key)||r.isNull(key))return null;return r.getString(key).take(512)}
   val duration=if(r.has("duration")&&!r.isNull("duration")){require(r.opt("duration") is Number);r.getDouble("duration").also{require(it.isFinite()&&it>=0&&it<=366*86400)}}else null
   MusicQueueRef(account,id,text("title"),text("artist"),text("album"),text("coverArt")?.takeUnless{it.contains("://")},duration)
  }
 }
}
