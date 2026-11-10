package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test
class LegacyPlaylistTest {
 @Test fun repeatedEntriesAndOrderArePreserved(){val paths=LegacyPlaylistPlan.paths("\uFEFF#EXTM3U\r\n../Music/a.flac\r\n#EXTINF:1,A\r\n../Music/b.flac\r\n../Music/a.flac\r\n".toByteArray());assertEquals(listOf("a","b","a"),LegacyPlaylistPlan.keys(paths,mapOf("../Music/a.flac" to listOf("a"),"../Music/b.flac" to listOf("b"))))}
 @Test fun untrustedUrisAndTraversalAreRejected(){for(path in listOf("https://example.com/a","/Music/a","../Music/../a","../Music/a\\b","../Elsewhere/a"))assertTrue(runCatching{LegacyPlaylistPlan.paths(path.toByteArray())}.isFailure)}
 @Test fun unknownOrAmbiguousCachedSourceIsRejected(){for(index in listOf(emptyMap(),mapOf("../Music/a" to listOf("one","two"))))assertTrue(runCatching{LegacyPlaylistPlan.keys(listOf("../Music/a"),index)}.isFailure)}
 @Test fun invalidUtf8AndEmptyPlaylistFail(){for(bytes in listOf(byteArrayOf(0xc3.toByte(),0x28),"#EXTM3U\n".toByteArray()))assertTrue(runCatching{LegacyPlaylistPlan.paths(bytes)}.isFailure)}
}
