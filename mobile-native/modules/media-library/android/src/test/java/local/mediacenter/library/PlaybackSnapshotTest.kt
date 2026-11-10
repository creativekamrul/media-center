package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*

class PlaybackSnapshotTest {
 @Test fun coldReadBeforeAnyPlaybackReturnsValidEmptyQueueAndStableDefaults(){
  val snapshot=PlaybackSnapshot.initial();val state=JSONObject(snapshot.clientState(-1))
  assertFalse(state.getBoolean("loaded"));assertFalse(state.getBoolean("playing"));assertEquals(0,state.getInt("index"));assertEquals(0,state.getInt("queueVersion"));assertEquals(0,state.getJSONArray("queue").length())
 }
 @Test fun emptyObjectPublicationNeverProducesALeadingComma(){assertEquals(0,JSONObject(PlaybackSnapshot("{}",0,"[]").clientState(-1)).getJSONArray("queue").length())}
 @Test fun unchangedQueueIsOmittedWhileChangedQueueKeepsTheSameSnapshot(){
  val snapshot=PlaybackSnapshot("{\"queueVersion\":7,\"index\":0,\"title\":\"A, {B}\"}",7,"[{\"id\":\"saved\"}]")
  assertFalse(JSONObject(snapshot.clientState(7)).has("queue"));val changed=JSONObject(snapshot.clientState(6));assertEquals(7,changed.getInt("queueVersion"));assertEquals("saved",changed.getJSONArray("queue").getJSONObject(0).getString("id"));assertEquals("A, {B}",changed.getString("title"))
 }
}
