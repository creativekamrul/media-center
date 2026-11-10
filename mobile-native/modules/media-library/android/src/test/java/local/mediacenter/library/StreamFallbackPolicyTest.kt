package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test

class StreamFallbackPolicyTest {
 @Test fun onlyOriginalMusicStreamsMaySwitch(){
  assertTrue(StreamFallbackPolicy.eligible("music","source-a","",PlaybackFailure.safeCode("network|-13")))
  for(kind in listOf("book","podcast","local","radio","movie","videoEpisode"))assertFalse(StreamFallbackPolicy.eligible(kind,"source-a","","network|-13"))
  assertFalse(StreamFallbackPolicy.eligible("music","device","","network|-13"))
 }
 @Test fun failuresCannotLoopOrMaskOutputErrors(){
  assertFalse(StreamFallbackPolicy.eligible("music","source-b","source-a","network|-13"))
  assertFalse(StreamFallbackPolicy.eligible("music","source-a","",PlaybackFailure.safeCode("unknown|-14")))
  assertFalse(StreamFallbackPolicy.eligible("music","source-a","","output|-13"))
 }
}
