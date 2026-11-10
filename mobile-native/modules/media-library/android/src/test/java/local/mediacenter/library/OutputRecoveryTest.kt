package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class OutputRecoveryTest {
 @Test fun onlyRejectedOutputCanTriggerOneCompatibilityAttempt(){val r=OutputRecovery();for(code in listOf(-13,-17,-20,0))assertFalse(r.retry("unknown|$code"));assertFalse(r.used);assertTrue(r.retry("output|-14"));assertTrue(r.used);assertFalse(r.retry("output|-14"))}
 @Test fun booksPodcastsAndMusicStartFreshAndDoNotEnableCompatibilityByDefault(){for(kind in listOf("book","podcast","music")){val r=OutputRecovery();assertFalse(kind,r.used);assertTrue(kind,r.retry("unknown|-14"));assertEquals(listOf("audio-format" to "s16","audio-samplerate" to "48000","audio-channels" to "stereo"),OutputRecovery.compatible)};assertTrue(PlaybackFailure.message("unknown|-14").contains("audio output"));assertEquals("output|-14",PlaybackFailure.safeCode("unknown|-14"))}
}
