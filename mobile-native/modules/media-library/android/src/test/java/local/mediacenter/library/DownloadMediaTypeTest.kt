package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class DownloadMediaTypeTest {
 @Test fun originalAudioBookPodcastAndVideoResponsesRemainSupported(){for(mime in listOf("audio/flac","audio/mp4","audio/mpeg","video/mp4","video/x-matroska","application/ogg","application/octet-stream"))assertEquals(mime,DownloadMediaType.original(mime));assertEquals("audio/flac",DownloadMediaType.original("Audio/FLAC; charset=binary"));assertEquals("application/octet-stream",DownloadMediaType.original(null))}
 @Test fun loginPagesErrorsImagesAndStreamingManifestsCannotBeSavedAsOriginalMedia(){for(mime in listOf("text/html","application/json","image/jpeg","application/vnd.apple.mpegurl","application/dash+xml","text/plain")){try{DownloadMediaType.original(mime);fail("Accepted $mime")}catch(e:UnexpectedMediaResponse){assertFalse(e.message!!.contains(mime));assertTrue(e.message!!.contains("Reconnect"))}}}
}
