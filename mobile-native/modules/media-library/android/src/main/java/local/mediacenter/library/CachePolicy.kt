package local.mediacenter.library
import org.json.JSONObject

data class CachePolicy(val unmetered:Boolean=false,val charging:Boolean=false,val budget:Long=0){
 fun reason(metered:Boolean,powered:Boolean,stored:Long,incoming:Long=0):String? = when {
  unmetered&&metered -> "Waiting for an unmetered connection. Resume when available."
  charging&&!powered -> "Connect power, then resume this transfer."
  budget>0&&(stored>=budget||incoming>budget-stored) -> "Cache budget reached. Increase the limit or remove files before resuming."
  else -> null
 }
 fun json()=JSONObject().put("unmetered",unmetered).put("charging",charging).put("budget",budget)
 companion object {fun parse(raw:String):CachePolicy {val j=JSONObject(raw);val budget=j.optLong("budget",0);require(budget in 0..2199023255552L);return CachePolicy(j.optBoolean("unmetered"),j.optBoolean("charging"),budget)}}
}
