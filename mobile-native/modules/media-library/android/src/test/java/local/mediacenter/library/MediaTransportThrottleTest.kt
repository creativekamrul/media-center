package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class MediaTransportThrottleTest {
 @Test fun pausedSessionDoesNotSpamBinderEvenAfterHours(){val p=MediaTransportThrottle();assertTrue(p.publish("music",false,12.0,1.0,0));for(t in 1L..10000L)assertFalse(p.publish("music",false,12.0,1.0,t*200))}
 @Test fun playingClockUsesFiveSecondHeartbeatInsteadOfFiveCallsPerSecond(){val p=MediaTransportThrottle();var updates=0;for(t in 0L..15000L step 200)if(p.publish("music",true,t/1000.0,1.0,t))updates++;assertEquals(4,updates)}
 @Test fun seeksAndPauseResumePublishImmediately(){val p=MediaTransportThrottle();assertTrue(p.publish("music",true,0.0,1.0,0));assertTrue(p.publish("music",true,90.0,1.0,200));assertTrue(p.publish("music",false,90.2,1.0,400));assertFalse(p.publish("music",false,90.2,1.0,600));assertTrue(p.publish("music",false,20.0,1.0,700));assertTrue(p.publish("music",true,20.0,1.0,800))}
 @Test fun booksAndPodcastSpeedAndIdentityChangesStayVisible(){val p=MediaTransportThrottle();assertTrue(p.publish("book:server:item",true,10.0,1.5,0));assertFalse(p.publish("book:server:item",true,10.3,1.5,200));assertTrue(p.publish("book:server:item",true,10.6,2.0,400));assertTrue(p.publish("podcast:server:show:episode",true,10.6,2.0,500))}
 @Test fun bufferingClockDriftIsCorrectedWithoutAHeartbeatDelay(){val p=MediaTransportThrottle();assertTrue(p.publish("music",true,0.0,1.0,0));assertTrue(p.publish("music",true,0.0,1.0,1000))}
 @Test fun invalidValuesAndMonotonicClockResetCannotCreateAnUpdateLoop(){val p=MediaTransportThrottle();assertTrue(p.publish("music",false,Double.NaN,Double.NaN,500));assertFalse(p.publish("music",false,Double.NaN,Double.NaN,600));assertTrue(p.publish("music",false,0.0,1.0,100))}
}
