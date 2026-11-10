package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class SpokenResumeRefTest {
 private fun row(account:String="a",kind:String="book",episode:String="")=JSONObject().put("account",account).put("kind",kind).put("item","show").put("episode",episode)
 @Test fun bookResumeKeepsBookIdentity(){val r=SpokenResumeRef.parse(row());assertTrue(r.target is SpokenTarget.Book);assertNotEquals(r.target.key("a"),r.target.key("b"))}
 @Test fun podcastEpisodesNeverShareResumeKeys(){val one=SpokenResumeRef.parse(row(kind="episode",episode="one"));val two=SpokenResumeRef.parse(row(kind="episode",episode="two"));assertNotEquals(one.target.key(one.account),two.target.key(two.account));assertNotEquals(one.target.key("a"),SpokenResumeRef.parse(row()).target.key("a"))}
 @Test fun invalidTargetsFailExplicitly(){for(r in listOf(row(kind="unknown"),row(kind="episode"),row(episode="unexpected"))){try{SpokenResumeRef.parse(r);fail("Invalid target accepted")}catch(_:IllegalArgumentException){}}}
}
