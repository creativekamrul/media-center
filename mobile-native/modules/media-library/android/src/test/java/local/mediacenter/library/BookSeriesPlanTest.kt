package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*

class BookSeriesPlanTest {
 private fun book(id:String="one",sequence:String="1")=JSONObject().put("id",id).put("libraryId","books").put("mediaType","book").put("media",JSONObject().put("metadata",JSONObject().put("title","Book $id").put("authorName","Author").put("series",JSONArray().put(JSONObject().put("id","series").put("name","Series").put("sequence",sequence)))))
 private fun info()=JSONObject("""{"id":"series","libraryId":"books","name":"Series","progress":{"libraryItemIds":["one","two","three"],"libraryItemIdsFinished":["one"]}}""")
 private fun page(vararg books:JSONObject)=JSONObject().put("results",JSONArray(books.toList())).put("total",books.size)
 @Test fun seriesMembershipKeepsDecimalsWithoutInferringFromTitles(){val rows=BookSeriesPlan.memberships(book(sequence="1.5"));assertEquals("1.5",rows.getJSONObject(0).getString("sequence"));assertEquals(0,BookSeriesPlan.memberships(book().also{it.getJSONObject("media").getJSONObject("metadata").remove("series")}).length())}
 @Test fun serverOrderAndBookProgressArePreserved(){val result=BookSeriesPlan.page(book(),"series",info(),page(book(),book("two","1.5"),book("three","2"))).getJSONArray("items");assertEquals("two",result.getJSONObject(1).getString("id"));assertTrue(result.getJSONObject(0).getBoolean("finished"));assertTrue(result.getJSONObject(0).getBoolean("current"));assertFalse(result.getJSONObject(1).getBoolean("finished"));assertTrue(result.getJSONObject(1).getBoolean("progressKnown"));assertEquals("book",result.getJSONObject(1).getString("kind"))}
 @Test fun booksAbsentFromTheProgressSnapshotRemainUnknown(){val result=BookSeriesPlan.page(book(),"series",info(),page(book("unknown","4"))).getJSONArray("items").getJSONObject(0);assertFalse(result.getBoolean("progressKnown"));assertFalse(result.getBoolean("finished"))}
 @Test fun podcastsUnknownMediaAndOtherLibraryBooksCannotBecomeSeriesBooks(){for(row in listOf(book().put("mediaType","podcast"),book().put("mediaType","unknown"),book().put("libraryId","other"))){try{BookSeriesPlan.page(book(),"series",info(),page(row));fail("Accepted cross-media/library identity")}catch(_:IllegalArgumentException){}}}
 @Test fun changedMembershipAndAnotherSeriesFailExplicitly(){for(action in listOf<()->Unit>({BookSeriesPlan.anchor(book(),"different")},{BookSeriesPlan.page(book(),"series",info().put("id","other"),page(book()))},{BookSeriesPlan.page(book(),"series",info().put("libraryId","other"),page(book()))})){try{action();fail("Accepted changed series identity")}catch(_:IllegalArgumentException){}}}
 @Test fun contradictoryProgressAndDuplicateBookRowsFailBeforeDisplay(){val bad=info().also{it.getJSONObject("progress").getJSONArray("libraryItemIdsFinished").put("not-in-series")};for(action in listOf<()->Unit>({BookSeriesPlan.page(book(),"series",bad,page(book()))},{BookSeriesPlan.page(book(),"series",info(),page(book(),book()))})){try{action();fail("Accepted inconsistent series snapshot")}catch(_:IllegalArgumentException){}}}
}
