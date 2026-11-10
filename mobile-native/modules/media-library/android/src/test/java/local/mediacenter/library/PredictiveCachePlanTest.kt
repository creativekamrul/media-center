package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*
class PredictiveCachePlanTest {
 private fun track(id:String,account:String="a",kind:String="music")=JSONObject().put("account",account).put("id",id).put("kind",kind)
 private fun state(vararg rows:JSONObject)=JSONObject().put("loaded",true).put("playing",true).put("queueVersion",1).put("index",0).put("track",rows.first()).put("queue",JSONArray(rows.toList()))
 @Test fun looksOnlyAheadAndNeverDownloadsTheCurrentOrRepeatedTrack(){assertEquals(listOf("next"),PredictiveCachePlan.select(state(track("current"),track("current"),track("next"),track("next"),track("later")),3,emptySet(),50).map{it.second})}
 @Test fun sourceIdentityAndCacheExclusionsStaySeparate(){val result=PredictiveCachePlan.select(state(track("current"),track("same"),track("same","b")),3,setOf(PredictiveCachePlan.key("a","same")),50);assertEquals(listOf("b" to "same"),result)}
 @Test fun noWorkForPausedUnloadedSpokenOrDisabledPlayback(){val base=state(track("current"),track("next"));for(s in listOf(JSONObject(base.toString()).put("playing",false),JSONObject(base.toString()).put("loaded",false),state(track("book",kind="book"),track("next"))))assertTrue(PredictiveCachePlan.select(s,3,emptySet(),50).isEmpty());assertTrue(PredictiveCachePlan.select(base,0,emptySet(),50).isEmpty())}
 @Test fun localRadioBooksAndPodcastEpisodesNeverEnterMusicCache(){assertEquals(emptyList<Pair<String,String>>(),PredictiveCachePlan.select(state(track("current"),track("local",kind="local"),track("radio",kind="radio"),track("book",kind="book"),track("show:episode",kind="podcast")),5,emptySet(),50))}
 @Test fun sessionBudgetAndQueueRevisionPreventUnboundedOrStaleWork(){val s=state(track("current"),track("next"),track("later"));assertEquals(1,PredictiveCachePlan.select(s,3,emptySet(),1).size);assertTrue(PredictiveCachePlan.select(s,3,emptySet(),0).isEmpty());assertTrue(PredictiveCachePlan.sameQueue(s,s));assertFalse(PredictiveCachePlan.sameQueue(s,JSONObject(s.toString()).put("index",1)));assertFalse(PredictiveCachePlan.sameQueue(s,JSONObject(s.toString()).put("queueVersion",2)))}
}
