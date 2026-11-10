package local.mediacenter.library
import org.json.JSONArray

internal object ArtworkReferences {
 fun parse(raw:String):Set<Pair<String,String>> {
  require(raw.length<=2_000_000);val rows=JSONArray(raw);require(rows.length()<=10000)
  return (0 until rows.length()).mapNotNull{val row=rows.optJSONObject(it)?:return@mapNotNull null
   val account=row.opt("account") as? String?:return@mapNotNull null;val id=row.opt("id") as? String?:return@mapNotNull null
   if(account=="device"||account.length !in 1..512||id.length !in 1..512||'\u0000' in account||'\u0000' in id)null else account to id
  }.toSet()
 }
}
