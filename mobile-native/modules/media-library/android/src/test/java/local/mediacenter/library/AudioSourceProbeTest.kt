package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class AudioSourceProbeTest {
 @Test fun recognizesBookMp4AndPodcastAudioWithoutReturningSourceBytes(){assertEquals("MP4 / M4A / M4B",AudioSourceProbe.container(byteArrayOf(0,0,0,32)+"ftypM4B ".toByteArray()));assertEquals("ID3-tagged audio",AudioSourceProbe.container("ID3-private-tag".toByteArray()));assertEquals("MPEG / AAC frames",AudioSourceProbe.container(byteArrayOf(255.toByte(),251.toByte())))}
 @Test fun htmlAndTruncatedFilesStayUnknown(){for(b in listOf(byteArrayOf(),byteArrayOf(0),"<html>private</html>".toByteArray())){val result=AudioSourceProbe.container(b);assertEquals("Not identified in the first bytes",result);assertFalse(result.contains("private"))}}
}
