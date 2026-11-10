package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class PlaylistEditTest {
 private fun original()=JSONObject("""{"id":"p","name":"Name","owner":"me","entry":[{"id":"a"},{"id":"b"},{"id":"a"}]}""")
 @Test fun orderedOccurrencesArePreserved(){val edit=PlaylistEdit.parse(JSONObject("""{"id":"p","name":"Edited","ids":["a","a","b"]}"""));val fields=edit.fields(original());assertEquals(listOf("0","1","2"),fields.filter{it.first=="songIndexToRemove"}.map{it.second});assertEquals(listOf("a","a","b"),fields.filter{it.first=="songIdToAdd"}.map{it.second})}
 @Test fun revisionsDetectOrderAndMetadataChanges(){val p=original();val before=PlaylistEdit.revision(p);p.put("name","Other");assertNotEquals(before,PlaylistEdit.revision(p));val swapped=original();swapped.getJSONArray("entry").getJSONObject(0).put("id","b");assertNotEquals(before,PlaylistEdit.revision(swapped))}
 @Test fun rejectsReadOnlyAndOtherOwners(){for(p in listOf(original().put("readonly",true),original().put("owner","someone"))){try{PlaylistEdit.requireWritable(p,"me");fail("allowed mutation")}catch(_:IllegalArgumentException){}};PlaylistEdit.requireWritable(original(),"me")}
 @Test fun emptyPlaylistClearsOldOccurrences(){val edit=PlaylistEdit("p","Empty",emptyList(),"");assertEquals(3,edit.fields(original()).count{it.first=="songIndexToRemove"});assertFalse(edit.fields(original()).any{it.first=="songIdToAdd"})}
}
