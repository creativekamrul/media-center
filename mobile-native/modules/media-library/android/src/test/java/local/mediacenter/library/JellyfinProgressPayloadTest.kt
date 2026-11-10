package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class JellyfinProgressPayloadTest {
 private val media=JellyfinMedia(JSONObject(),"movie-id",JSONObject().put("kind","movie"),"","source-id","session-id","")
 @Test fun directPlayProgressPreservesTheActualItemAndSecondsToTicksConversion(){val body=Jellyfin.reportPayload(media,"Progress",12.5,true);assertEquals("movie-id",body.getString("ItemId"));assertEquals("source-id",body.getString("MediaSourceId"));assertEquals("session-id",body.getString("PlaySessionId"));assertEquals(125000000L,body.getLong("PositionTicks"));assertTrue(body.getBoolean("IsPaused"));assertEquals("DirectPlay",body.getString("PlayMethod"));assertFalse(body.has("Failed"))}
 @Test fun genuinePlaybackFailureIsStoppedAsFailedWithoutOmittingTheCheckpoint(){val body=Jellyfin.reportPayload(media,"Stopped",12.5,true,true);assertTrue(body.getBoolean("Failed"));assertEquals(125000000L,body.getLong("PositionTicks"));try{Jellyfin.reportPayload(media,"Progress",12.5,true,true);fail()}catch(_:IllegalArgumentException){}}
 @Test fun invalidProgressCannotBeSentToTheServer(){for(point in listOf(Double.NaN,Double.POSITIVE_INFINITY,-1.0)){try{Jellyfin.reportPayload(media,"Progress",point,false);fail()}catch(_:IllegalArgumentException){}}}
}
