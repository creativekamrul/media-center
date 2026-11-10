package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class PlaybackFailureTest {
 @Test fun separatesConnectionFormatAndOutputFailures(){assertTrue(PlaybackFailure.message("tls|-13").contains("certificate"));assertTrue(PlaybackFailure.message("format|-17").contains("not recognized"));assertTrue(PlaybackFailure.message("output|-14").contains("DAC"));assertTrue(PlaybackFailure.message("authorization|-13").contains("rejected access"))}
 @Test fun neverEchoesRawUrlsOrPrivateData(){for(raw in listOf("https://private/?token=secret|-13","tls|https://private/secret","decoder|password","missing|-13|secret")){val safe=PlaybackFailure.safeCode(raw);assertFalse(safe.contains("secret"));assertFalse(PlaybackFailure.message(safe).contains("private"));assertTrue(safe.substringAfter('|').toIntOrNull()!=null)}}
}
