package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class PlaybackPolicyTest {
 @Test fun spokenResumeNeverRewindsMusicOrShortPauses(){val p=PlaybackPolicy(10);assertEquals(2.0,p.resume(12.0,true,10000),0.0);assertEquals(0.0,p.resume(2.0,true,20000),0.0);assertEquals(12.0,p.resume(12.0,false,10000),0.0);assertEquals(12.0,p.resume(12.0,true,100),0.0)}
 @Test fun headsetMappingsAreExplicit(){assertEquals(Pair("skip",30.0),PlaybackPolicy(headset="seek").headsetAction(true));assertNull(PlaybackPolicy(headset="disabled").headsetAction(false));assertEquals(Pair("previous",0.0),PlaybackPolicy().headsetAction(false))}
 @Test fun rejectsInvalidSettings(){assertThrows(IllegalArgumentException::class.java){PlaybackPolicy.parse(JSONObject("{\"rewind\":90}"))};assertThrows(IllegalArgumentException::class.java){PlaybackPolicy.parse(JSONObject("{\"headset\":\"shell\"}"))}}
}
