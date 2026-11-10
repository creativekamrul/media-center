package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class CacheJobStateTest {
 @Test fun interruptionDoesNotRestartUnattendedDownloads(){assertEquals("paused",CacheJobState.interrupted("downloading"));assertEquals("paused",CacheJobState.interrupted("queued"));assertEquals("complete",CacheJobState.interrupted("complete"))}
 @Test fun systemRestartRecoversOnlyActiveWork(){
  for(status in listOf("downloading","queued"))assertEquals("queued",CacheJobState.restore(status,true))
  for(status in listOf("paused","cancelled","error","complete"))assertEquals(status,CacheJobState.restore(status,true))
  assertEquals("paused",CacheJobState.restore("downloading",false))
 }
 @Test fun spokenAndMusicJobsHaveIdenticalPauseSafety(){
  for(kind in listOf("music","book","podcast"))for(action in listOf("pause","cancel")){
   val state=CacheJobState.control("downloading",action)
   assertEquals(kind,state,CacheJobState.restore(state,true))
  }
 }
 @Test fun pauseOrCancelWinsOverNetworkFailure(){assertEquals("paused",CacheJobState.failed(CacheJobState.control("downloading","pause")));assertEquals("cancelled",CacheJobState.failed(CacheJobState.control("downloading","cancel")));assertEquals("error",CacheJobState.failed("downloading"))}
 @Test fun retryRequeuesAndCompletedJobsStayComplete(){assertEquals("queued",CacheJobState.control("error","resume"));assertEquals("complete",CacheJobState.control("complete","resume"));assertEquals("complete",CacheJobState.control("complete","cancel"))}
}
