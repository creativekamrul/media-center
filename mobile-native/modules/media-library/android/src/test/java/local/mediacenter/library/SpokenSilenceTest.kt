package local.mediacenter.library
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class SpokenSilenceTest {
 @Test fun defaultAndMusicAreNeverProcessed(){
  assertNull(SpokenSilence.filter("off","book"))
  for(kind in listOf("music","local","radio","movie","videoEpisode"))for(mode in SpokenSilence.modes)assertNull(SpokenSilence.filter(mode,kind))
 }
 @Test fun spokenProfilesPreserveOriginalTimeline(){
  for(kind in listOf("book","podcast"))for(mode in listOf("gentle","balanced","strong")){
   val a=AudioOptions.parse(JSONObject().put("silence",mode));assertEquals(a,AudioOptions.parse(a.json()))
   assertTrue(a.filter(kind).contains("timestamp=copy"));assertFalse(a.filter(kind).contains("asetpts"));assertEquals("",a.filter("music"))
  }
 }
 @Test(expected=IllegalArgumentException::class) fun rejectsArbitraryFilters(){AudioOptions.parse(JSONObject().put("silence","silenceremove,volume=100"))}
}
