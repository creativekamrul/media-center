package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class SpokenTargetTest {
 @Test fun episodesNeverShareProgressWithBooksOrOtherEpisodes(){
  val book=SpokenTarget.Book("item");val first=SpokenTarget.Episode("item","one");val second=SpokenTarget.Episode("item","two")
  assertNotEquals(book.key("server"),first.key("server"));assertNotEquals(first.key("server"),second.key("server"));assertNotEquals(first.key("server"),first.key("other"))
  assertNotEquals(SpokenTarget.Episode("a:b","c").key("server"),SpokenTarget.Episode("a","b:c").key("server"))
 }
 @Test fun playbackRoutesRequireEpisodeIdentity(){
  assertEquals("api/items/book/play",SpokenTarget.Book("book").playPath())
  assertEquals("api/items/show/play/episode",SpokenTarget.Episode("show","episode").playPath())
 }
}
