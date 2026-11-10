package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class RelativePlaybackClockTest {
 @Test fun failedOrUnloadedStreamCannotResetTheLastKnownPoint(){val c=RelativePlaybackClock();c.reset(40.0);assertEquals(42.5,c.read("42.5",0),.001);for(value in listOf(null,"nan","NaN","Infinity","-1","invalid"))assertEquals(42.5,c.read(value,0),.001)}
 @Test fun multifileBookRecoveryKeepsItsWholeBookCheckpoint(){val c=RelativePlaybackClock();val parts=listOf(AudioPart("a",0.0,100.0),AudioPart("b",100.0,90.0));c.reset(25.0);c.read("27.5",0);assertEquals(127.5,AudioTimeline.whole(parts,1,c.read(null,0)),.001)}
 @Test fun podcastEpisodeAndNextBookFileStartTheirOwnRelativeClock(){val c=RelativePlaybackClock();c.reset(80.0);c.reset(0.0);assertEquals(0.0,c.read(null,0),.001);val episode=listOf(AudioPart("episode",0.0,100.0));c.reset(12.0);assertEquals(12.0,AudioTimeline.whole(episode,0,c.read(null,0)),.001)}
 @Test fun explicitResumeAndInvalidResetAreBounded(){val c=RelativePlaybackClock();c.reset(120.0);assertEquals(120.0,c.value,.001);c.reset(Double.NaN);assertEquals(0.0,c.value,.001)}
 @Test fun stalePostSeekSamplesCannotMoveTheThumbBackBeforeAcknowledgement(){val c=RelativePlaybackClock();c.awaitSeek(40.0,1000);assertEquals(40.0,c.read("0",1100),.001);assertEquals(40.0,c.read(null,1200),.001);assertEquals(40.2,c.read("40.2",1300),.001);assertEquals(41.0,c.read("41",2100),.001);c.awaitSeek(90.0,3000);assertEquals(0.0,c.read("0",5100),.001)}
}
