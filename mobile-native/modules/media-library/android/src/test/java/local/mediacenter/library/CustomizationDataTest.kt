package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
class CustomizationDataTest {
 @Test fun artworkIdentityIsBoundToTheSourceAndCannotTraversePaths(){val a=CustomizationData.key("server-a","../book");assertTrue(a.matches(Regex("[a-f0-9]{64}")));assertNotEquals(a,CustomizationData.key("server-b","../book"));assertNotEquals(CustomizationData.key("ab","c"),CustomizationData.key("a","bc"))}
 @Test fun lyricsNeverApplyToBooksOrPodcastEpisodes(){for(kind in listOf("book","podcast","radio")){try{CustomizationData.lyricsIdentity(JSONObject().put("account","s").put("id","i").put("kind",kind),"s:i");fail(kind)}catch(_:IllegalArgumentException){}};CustomizationData.lyricsIdentity(JSONObject().put("account","s").put("id","i").put("kind","music"),"s:i");try{CustomizationData.lyricsIdentity(JSONObject().put("account","s").put("id","i"),"other:i");fail()}catch(_:IllegalArgumentException){}}
 @Test fun lrcImportsNormalizeUtf8WithoutDamagingTiming(){val text=CustomizationData.text("\uFEFF[01:02.500] Hello\r\n[01:05.00] World".toByteArray(Charsets.UTF_8));assertEquals("[01:02.500] Hello\n[01:05.00] World",text);assertTrue(CustomizationData.synced(text));assertFalse(CustomizationData.synced("Plain lyrics"));assertEquals("a_b_c",CustomizationData.filename("a/b:c"))}
 @Test fun absentOrNullServiceFieldsNeverBecomeLiteralLyrics(){val empty=CustomizationData.lyricsFields(JSONObject().put("syncedLyrics",JSONObject.NULL).put("plainLyrics",42));assertEquals("",empty.getString("synced"));assertEquals("",empty.getString("plain"));val instrumental=CustomizationData.lyricsFields(JSONObject().put("instrumental",true));assertTrue(instrumental.getBoolean("instrumental"));assertEquals("",instrumental.getString("synced"))}
 @Test fun binaryOversizeAndInvalidUtf8AreRejected(){for(bytes in listOf(byteArrayOf(0),byteArrayOf(195.toByte(),40),ByteArray(400001))){try{CustomizationData.text(bytes);fail()}catch(_:Exception){}}}
 @Test fun emptyImportsCannotRestoreAutomaticLyricsAndCrLineEndingsWork(){
  for(value in listOf(""," \r\n","\uFEFF")){try{CustomizationData.text(value.toByteArray(Charsets.UTF_8));fail("Accepted empty import")}catch(_:IllegalArgumentException){}}
  assertEquals("[00:01] First\n[00:02] Second",CustomizationData.text("[00:01] First\r[00:02] Second".toByteArray(Charsets.UTF_8)))
 }
}
