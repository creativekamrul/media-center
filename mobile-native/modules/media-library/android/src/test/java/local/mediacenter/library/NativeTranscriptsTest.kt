package local.mediacenter.library
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class NativeTranscriptsTest {
 @Test fun booksAndEpisodesKeepIndependentSourceScopedTranscripts(){
  for(kind in listOf("book","podcast")){val t=JSONObject().put("account","a").put("id","episode-two").put("kind",kind);NativeTranscripts.identity(t,"a:episode-two")
   for(wrong in listOf("a:episode-one","b:episode-two")){try{NativeTranscripts.identity(t,wrong);fail("Mixed transcript identities")}catch(_:IllegalArgumentException){}}
  }
 }
 @Test fun musicAndUnknownKindsCannotUseTheSpokenStore(){
  for(kind in listOf("music","local","radio","show","unknown")){try{NativeTranscripts.identity(JSONObject().put("account","a").put("id","x").put("kind",kind),"a:x");fail("Accepted $kind")}catch(_:IllegalArgumentException){}}
 }
 @Test fun importsRequireBoundedUtf8(){
  assertEquals("Plain\n",NativeTranscripts.text("\uFEFFPlain\r\n".toByteArray(Charsets.UTF_8)))
  for(data in listOf(byteArrayOf(0xc3.toByte(),0x28),ByteArray(2_000_001),"bad\u0000text".toByteArray())){try{NativeTranscripts.text(data);fail("Accepted invalid transcript")}catch(_:Exception){}}
 }
 @Test fun invalidTimedImportsAreRejectedBeforeReplacingSavedText(){
  NativeTranscripts.validateText("WEBVTT\n\n01:02:03.250 --> 01:02:05.000\nA book chapter")
  NativeTranscripts.validateText("1\n00:00:01,100 --> 00:00:03,000\nA podcast episode")
  for(text in listOf("WEBVTT","00:99:00 --> 01:00:00\nInvalid","00:00:05 --> 00:00:01\nBackwards","00:00:00 --> 00:00:01\n<i></i>")){try{NativeTranscripts.validateText(text);fail("Accepted invalid timed text")}catch(_:IllegalArgumentException){}}
 }
 @Test fun emptyImportsCannotClearSavedTranscriptsAndCrLineEndingsWork(){
  for(value in listOf(""," \r\n","\uFEFF")){try{NativeTranscripts.text(value.toByteArray(Charsets.UTF_8));fail("Accepted empty import")}catch(_:IllegalArgumentException){}}
  assertEquals("1\n00:00:01,000 --> 00:00:02,000\nText",NativeTranscripts.text("1\r00:00:01,000 --> 00:00:02,000\rText".toByteArray(Charsets.UTF_8)))
 }
}
