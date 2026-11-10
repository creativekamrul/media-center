package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class PortablePlaylistTest {
 @Test fun preservesOrderAndRepeatedTracks(){assertEquals("#EXTM3U\n../Music/b.flac\n../Music/a.flac\n../Music/b.flac\n",PortablePlaylist.render(listOf("../Music/b.flac","../Music/a.flac","../Music/b.flac")))}
 @Test fun acceptsArtistAlbumAndSpokenPhysicalFiles(){assertTrue(PortablePlaylist.render(listOf("../Music/Author/Book/part1.m4b","../Music/Show/episode.mp3")).contains("part1.m4b"))}
 @Test fun originalVideoJobsCanFinishPortableExport(){val text=PortablePlaylist.render(listOf("../Videos/MC Playback Fixture.mp4"));assertEquals("#EXTM3U\n../Videos/MC Playback Fixture.mp4\n",text)}
 @Test fun videoPathsRemainBoundedToSelectedMediaFolders(){for(path in listOf("../Videos/../../private","../Videos/../Music/a.flac","../Videos/a\rInjected","../Videos/a\\..\\private","../Other/a.mp4","../Videos/")){try{PortablePlaylist.render(listOf(path));fail(path)}catch(_:IllegalArgumentException){}}}
 @Test fun rejectsUrlsTraversalAndInjectedEntries(){for(path in listOf("https://server/token","../Music/../../private","../Music/a\nhttps://server")){try{PortablePlaylist.render(listOf(path));fail(path)}catch(_:IllegalArgumentException){}};assertEquals("#EXTM3U\n",PortablePlaylist.render(emptyList()))}
}
