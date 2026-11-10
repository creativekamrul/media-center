package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*
class JellyfinPlaylistPlanTest {
 private val a="11111111111111111111111111111111";private val b="22222222222222222222222222222222"
 @Test fun permissionRequiresAnExplicitCurrentUserEditGrant(){JellyfinPlaylistPlan.permission(JSONObject().put("UserId",a).put("CanEdit",true),a);for(raw in listOf(JSONObject().put("UserId",b).put("CanEdit",true),JSONObject().put("UserId",a).put("CanEdit",false),JSONObject().put("UserId",a).put("CanEdit","true")))assertTrue(runCatching{JellyfinPlaylistPlan.permission(raw,a)}.isFailure)}
 @Test fun reorderPayloadPreservesSharingAndDoesNotSilentlyDeduplicate(){val edit=PlaylistEdit(a,"Name",listOf(b,a),"revision");val payload=JellyfinPlaylistPlan.payload(edit,listOf(a,b));assertEquals(listOf(b,a),JellyfinPlaylistPlan.ids(payload.getJSONArray("Ids")));assertEquals(setOf("Name","Ids"),payload.keys().asSequence().toSet());assertTrue(runCatching{JellyfinPlaylistPlan.payload(edit.copy(ids=listOf(a,a)),listOf(a,b))}.isFailure)}
 @Test fun renameOnlyPreservesLegacyRepeatedOccurrences(){val payload=JellyfinPlaylistPlan.payload(PlaylistEdit(a,"Renamed",listOf(a,a,b),""),listOf(a,a,b));assertEquals(setOf("Name"),payload.keys().asSequence().toSet())}
 @Test fun revisionsBindAccountCredentialsPermissionsNameAndOrder(){val account=JSONObject().put("id","account").put("url","https://server").put("userId",a).put("accessToken","first");val meta=JSONObject().put("Id",a).put("Name","Name");val management=JSONObject().put("ItemIds",JSONArray().put(a).put(b));val permission=JSONObject().put("CanEdit",true);val initial=JellyfinPlaylistPlan.revision(account,meta,management,permission);assertNotEquals(initial,JellyfinPlaylistPlan.revision(JSONObject(account.toString()).put("accessToken","changed"),meta,management,permission));assertNotEquals(initial,JellyfinPlaylistPlan.revision(account,meta,JSONObject().put("ItemIds",JSONArray().put(b).put(a)),permission));assertNotEquals(initial,JellyfinPlaylistPlan.revision(account,JSONObject(meta.toString()).put("Name","New"),management,permission));assertFalse(initial.contains("first"))}
}
