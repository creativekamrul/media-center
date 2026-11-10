package local.mediacenter.library
import org.json.*

/** Uses server series membership and ordering, never title guesses or podcast identities. */
internal object BookSeriesPlan {
 fun memberships(book:JSONObject):JSONArray {
  require(book.getString("mediaType")=="book"){"Series are available for audiobooks"}
  val rows=book.getJSONObject("media").getJSONObject("metadata").optJSONArray("series")?:JSONArray();require(rows.length()<=100)
  val out=JSONArray();val ids=mutableSetOf<String>()
  for(i in 0 until rows.length()){val row=rows.getJSONObject(i);val id=row.getString("id");require(id.length in 1..512&&ids.add(id)){"Invalid series membership"};out.put(JSONObject().put("id",id).put("title",row.getString("name").take(500)).put("sequence",row.optString("sequence").takeUnless{it=="null"}?:""))}
  return out
 }
 fun anchor(book:JSONObject,series:String):String {
  val rows=memberships(book);require((0 until rows.length()).any{rows.getJSONObject(it).getString("id")==series}){"This book is no longer in that series"}
  return book.getString("libraryId").also{require(it.length in 1..512)}
 }
 fun page(book:JSONObject,series:String,info:JSONObject,page:JSONObject):JSONObject {
  val library=anchor(book,series);require(info.getString("id")==series&&info.getString("libraryId")==library){"The server returned another series"}
  val progress=info.getJSONObject("progress");val known=strings(progress.getJSONArray("libraryItemIds"));val finished=strings(progress.getJSONArray("libraryItemIdsFinished"));require(known.containsAll(finished)){"The series progress snapshot is inconsistent"}
  val rows=page.getJSONArray("results");require(rows.length()<=40);val out=JSONArray();val ids=mutableSetOf<String>()
  for(i in 0 until rows.length()){val row=rows.getJSONObject(i);require(anchor(row,series)==library){"The series contains an item from another library"};val id=row.getString("id");require(id.length in 1..512&&ids.add(id)){"Invalid series book identity"};val media=row.getJSONObject("media");val metadata=media.getJSONObject("metadata");val memberships=memberships(row);val member=(0 until memberships.length()).map{memberships.getJSONObject(it)}.first{it.getString("id")==series}
   out.put(JSONObject().put("id",id).put("kind","book").put("title",metadata.getString("title").take(500)).put("artist",metadata.optString("authorName").take(500)).put("coverArt",id).put("sequence",member.getString("sequence")).put("finished",id in finished).put("progressKnown",id in known).put("current",id==book.getString("id")))
  }
  val total=page.getInt("total");require(total>=rows.length()&&total<=100000){"Invalid series page size"}
  return JSONObject().put("title",info.getString("name").take(500)).put("items",out).put("total",total)
 }
 private fun strings(rows:JSONArray):Set<String>{require(rows.length()<=100000);val result=mutableSetOf<String>();for(i in 0 until rows.length()){val id=rows.get(i) as? String?:throw IllegalArgumentException("Invalid series progress identity");require(id.length in 1..512&&result.add(id)){"Repeated series progress identity"}};return result}
}
