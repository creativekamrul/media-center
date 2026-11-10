package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
class MediaTransportIdentityTest {
 @Test fun initialSnapshotHasSafeEmptyIdentity(){assertEquals("",MediaTransportIdentity.key(JSONObject(PlaybackSnapshot.initial().state)))}
 @Test fun clearingPreviouslyPlayingTrackCannotDereferenceNull(){val state=JSONObject().put("track",JSONObject().put("id","book")).put("playing",true);assertTrue(MediaTransportIdentity.key(state).contains("book"));state.remove("track");state.put("playing",false);assertEquals("",MediaTransportIdentity.key(state));state.put("track",JSONObject.NULL);assertEquals("",MediaTransportIdentity.key(state))}
 @Test fun emptyStoppedPublicationIsThrottledAfterFirstUpdate(){val gate=MediaTransportThrottle();val identity=MediaTransportIdentity.key(JSONObject().put("playing",false));assertTrue(gate.publish(identity,false,0.0,1.0,0));for(t in 1L..100)assertFalse(gate.publish(identity,false,0.0,1.0,t*200))}
}
