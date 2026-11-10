package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*
class SavedMusicSourcesTest {
 private fun saved(accounts:List<String>,index:Int)=JSONObject().put("queue",JSONArray(accounts.mapIndexed{i,a->JSONObject().put("account",a).put("id",i.toString())})).put("index",index).put("position",45.5).put("updated",123L).toString()
 @Test fun removedFutureAndEarlierSourcesCannotBlockAValidCurrentTrack(){val r=JSONObject(SavedMusicSources.visible(saved(listOf("removed","live","removed","live"),1),setOf("live")));assertEquals(2,r.getJSONArray("queue").length());assertEquals(0,r.getInt("index"));assertEquals(45.5,r.getDouble("position"),0.0);assertEquals("3",r.getJSONArray("queue").getJSONObject(1).getString("id"))}
 @Test fun removedCurrentSourceHidesTheShortcutWithoutSelectingAnotherTrack(){assertEquals("{}",SavedMusicSources.visible(saved(listOf("removed","live"),0),setOf("live")))}
 @Test fun configuredButUnreachableSourcesAndDeviceItemsArePreserved(){val r=JSONObject(SavedMusicSources.visible(saved(listOf("unreachable","device","unreachable"),2),setOf("unreachable")));assertEquals(3,r.getJSONArray("queue").length());assertEquals(2,r.getInt("index"));assertEquals(123L,r.getLong("updated"))}
 @Test fun invalidSnapshotsFailClosedWithoutAFalseResumeTarget(){for(r in listOf("{}","invalid",saved(listOf("live"),2)))assertEquals("{}",SavedMusicSources.visible(r,setOf("live")))}
}
