package local.mediacenter.library
import org.json.JSONArray
import org.json.JSONObject

internal data class SpokenQueueEntry(val ref:SpokenResumeRef,val title:String)
internal data class SavedSpokenQueue(val entries:List<SpokenQueueEntry>,val index:Int,val position:Double)
/** Persist only explicit identities and display metadata, never stream URLs, sessions or credentials. */
internal object SpokenQueuePlan {
 fun entries(raw:JSONArray):List<SpokenQueueEntry>{
  require(raw.length() in 1..500){"Choose between 1 and 500 books or episodes"}
  return (0 until raw.length()).map{val row=raw.getJSONObject(it);SpokenQueueEntry(SpokenResumeRef.parse(row),row.optString("title").take(500))}
 }
 fun read(raw:JSONObject):SavedSpokenQueue {
  require(raw.getInt("formatVersion")==1){"Unsupported spoken session version"}
  val rows=entries(raw.getJSONArray("queue"));val index=raw.getInt("index");val position=raw.getDouble("position")
  require(index in rows.indices&&position.isFinite()&&position>=0){"Invalid saved spoken position"};return SavedSpokenQueue(rows,index,position)
 }
 fun row(ref:SpokenResumeRef,title:String):JSONObject=JSONObject().put("account",ref.account).put("kind",if(ref.target is SpokenTarget.Book)"book" else "episode").put("item",ref.target.itemId).put("episode",(ref.target as? SpokenTarget.Episode)?.episodeId?:"").put("title",title.take(500))
 fun encode(queueJson:String,index:Int,position:Double,updated:Long)=MusicSessionCheckpoint.encode(queueJson,index,position,updated).dropLast(1)+",\"formatVersion\":1}"
}
