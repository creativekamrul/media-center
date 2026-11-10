package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
class CachedMediaKindTest {
 @Test fun legacyAndExplicitMusicRemainEligible(){assertTrue(CachedMediaKind.music(JSONObject().put("id","song")));assertTrue(CachedMediaKind.music(JSONObject().put("id","song").put("kind","music")))}
 @Test fun physicalBookEpisodeVideoAndUnknownRecordsNeverBecomeMusic(){for(kind in listOf("book","podcast","movie","videoEpisode","unknown"))assertFalse(CachedMediaKind.music(JSONObject().put("id","item").put("kind",kind)));for(id in listOf("spoken-file:book","spoken-file:episode","video-file:movie"))assertFalse(CachedMediaKind.music(JSONObject().put("id",id)))}
}
