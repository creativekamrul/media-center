package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class ProgressHeartbeatTest {
 @Test fun pausedBookAndPodcastDoNotResubmitTheirPositionOnATimer(){for(kind in listOf("book","podcast")){val p=ProgressHeartbeat(15000);p.reset(120.0,0);for(t in 200L..3600000L step 200)assertFalse(kind,p.due(120.0,false,t));assertFalse(p.needsPosition(120.0,0.0,false))}}
 @Test fun playbackPauseAndExplicitPausedSeekHaveDistinctUpdates(){val p=ProgressHeartbeat(15000);p.reset(0.0,0);assertTrue(p.due(0.0,true,0));for(t in 200L..14800L step 200)assertFalse(p.due(t/1000.0,true,t));assertTrue(p.due(15.0,true,15000));assertTrue(p.due(15.2,false,15200));assertFalse(p.due(15.2,false,50000));assertTrue(p.due(80.0,false,50200));assertFalse(p.due(80.0,false,90000));assertTrue(p.due(80.0,true,90200))}
 @Test fun seeksDuringPlaybackSyncWithoutWaitingAndSessionResetDoesNotSharePositions(){val p=ProgressHeartbeat(15000);p.reset(100.0,0);assertTrue(p.due(100.0,true,0));assertTrue(p.due(900.0,true,200));p.reset(5.0,1000);assertFalse(p.due(5.0,false,1200));assertFalse(p.needsPosition(5.0,0.0,false));assertTrue(p.needsPosition(5.0,2.0,false))}
 @Test fun timestampsChangeOnlyForARealValidCheckpoint(){assertTrue(ProgressHeartbeat.changed(Double.NaN,10.0));assertFalse(ProgressHeartbeat.changed(10.0,10.0));assertTrue(ProgressHeartbeat.changed(10.0,9.0));assertFalse(ProgressHeartbeat.changed(10.0,Double.NaN));assertFalse(ProgressHeartbeat.changed(10.0,-1.0))}
}
