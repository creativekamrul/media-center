package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test
class PortableNameTest {
 @Test fun unicodeNamesRespectFilesystemByteLimits(){for(input in listOf("বাংলা".repeat(90),"🎵".repeat(90),"a".repeat(500))){val name=PortableName.stem(input,180);assertTrue(name.toByteArray().size<=180);assertEquals(name,name.toByteArray().toString(Charsets.UTF_8));assertFalse(name.endsWith("\uFFFD"))}}
 @Test fun unsafeControlsAndSeparatorsAreRemoved(){val name=PortableName.stem(" a\u0000b\tc\n/\\:*?\"<>| ");assertFalse(name.any{it<' '||it in "\\/:*?\"<>|"});assertEquals("Untitled",PortableName.stem("  "))}
}
