package local.mediacenter.library
import org.json.*

/** Removing a connection must not leave an unresumable Home shortcut. Offline != removed. */
internal object SavedMusicSources {
 fun visible(raw:String,configured:Set<String>):String=try {
  require(raw.length<=4_500_000);val state=JSONObject(raw);val rows=state.getJSONArray("queue");require(rows.length() in 1..5000);val current=state.getInt("index");require(current in 0 until rows.length());val at=state.getDouble("position");require(at.isFinite()&&at>=0)
  fun present(i:Int)=rows.getJSONObject(i).getString("account").let{it=="device"||it in configured}
  if(!present(current))"{}" else {
   val keep=(0 until rows.length()).filter(::present);state.put("queue",JSONArray(keep.map{rows.getJSONObject(it)})).put("index",keep.indexOf(current)).toString()
  }
 }catch(_:Exception){"{}"}
}
