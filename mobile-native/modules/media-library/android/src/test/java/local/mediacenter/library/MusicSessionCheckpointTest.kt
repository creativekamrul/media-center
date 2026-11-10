package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*
class MusicSessionCheckpointTest {
 @Test fun playingPositionsCheckpointAtFiveSeconds(){val g=MusicSessionCheckpoint();assertTrue(g.due(1,0,0.0,true,0));g.saved(1,0,0.0,true,0);assertFalse(g.due(1,0,2.0,true,2000));assertTrue(g.due(1,0,5.0,true,5000))}
 @Test fun unchangedPausedPlaybackNeverRewritesEvenAfterAnHour(){val g=MusicSessionCheckpoint();g.saved(1,0,45.0,false,0);for(now in 200L..3600000L step 200)assertFalse(g.due(1,0,45.0,false,now))}
 @Test fun pausedSeekAndPlayPauseTransitionsSaveImmediately(){val g=MusicSessionCheckpoint();g.saved(1,0,45.0,true,0);assertTrue(g.due(1,0,45.0,false,200));g.saved(1,0,45.0,false,200);assertTrue(g.due(1,0,90.0,false,400));g.saved(1,0,90.0,false,400);assertFalse(g.due(1,0,90.0,false,600));assertTrue(g.due(1,0,90.0,true,800))}
 @Test fun newQueueOrTrackCannotReuseAnOldCheckpoint(){val g=MusicSessionCheckpoint();g.saved(1,0,0.0,false,0);assertTrue(g.due(2,0,0.0,false,200));assertTrue(g.due(1,1,0.0,false,200))}
 @Test fun alreadyEncodedQueueKeepsEscapedTitlesAndEmptyStateValid(){for(rows in listOf(JSONArray(),JSONArray().put(JSONObject().put("title","A \"quoted\" title · বাংলা").put("kind","music")))){val result=JSONObject(MusicSessionCheckpoint.encode(rows.toString(),0,12.5,1000));assertEquals(rows.toString(),result.getJSONArray("queue").toString());assertEquals(12.5,result.getDouble("position"),0.0)}}
 @Test fun invalidPositionsNeverReachPersistence(){val g=MusicSessionCheckpoint();assertFalse(g.due(1,0,Double.NaN,true,0));assertFalse(g.due(1,0,-1.0,false,0))}
}
