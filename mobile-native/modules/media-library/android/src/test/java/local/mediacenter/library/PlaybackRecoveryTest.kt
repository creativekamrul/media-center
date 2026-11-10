package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class PlaybackRecoveryTest {
 @Test fun transientFailureRetriesTheActualMusicBookOrEpisodeCheckpoint(){for(kind in listOf("music","book","podcast"))assertEquals(kind,123.0,PlaybackRecovery.point(false,false,false,true,123.0)!!,.001)}
 @Test fun bufferingOrPausedLoadedFilesAreNotRestartedByPlay(){assertNull(PlaybackRecovery.point(false,false,true,true,123.0));assertNull(PlaybackRecovery.point(false,true,false,false,123.0));assertNull(PlaybackRecovery.point(false,false,false,false,123.0))}
 @Test fun naturalEndRestartsFromZeroAndInvalidCheckpointsAreBounded(){assertEquals(0.0,PlaybackRecovery.point(true,true,false,false,123.0)!!,.001);assertEquals(0.0,PlaybackRecovery.point(false,false,false,true,Double.NaN)!!,.001)}
}
