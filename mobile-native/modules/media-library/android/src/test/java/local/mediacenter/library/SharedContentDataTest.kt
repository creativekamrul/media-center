package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test
class SharedContentDataTest {
 @Test fun supportedPublicLinksAreExtractedFromSharedTitles(){for(url in listOf("https://open.spotify.com/track/abc?si=public","https://music.youtube.com/watch?v=abcdefghijk","https://youtu.be/abcdefghijk","https://www.deezer.com/album/42","https://soundcloud.com/artist/track")){val r=SharedContentData.parse("Listen to this: $url");assertEquals("link",r.getString("kind"));assertEquals(url,r.getString("value"))}}
 @Test fun unsafeUrlsNeverBecomeSearchesOrNetworkRequests(){for(value in listOf("https://open.spotify.com.evil.test/track/x","https://user:password@open.spotify.com/track/x","http://open.spotify.com/track/x","https://127.0.0.1/private","https://music.youtube.com:9000/watch","file:///sdcard/song.flac","content://private/file","javascript://alert","spotify://track/x")){try{SharedContentData.parse(value);fail("Accepted unsafe URL")}catch(_:IllegalArgumentException){}}}
 @Test fun plainTextSearchesAreBoundedAndBlankPayloadsRejected(){assertEquals("Adele Hello",SharedContentData.parse(" Adele Hello ").getString("value"));for(value in listOf(""," ","x".repeat(301),"x".repeat(4097),"bad\u0000text")){try{SharedContentData.parse(value);fail("Accepted invalid payload")}catch(_:IllegalArgumentException){}}}
}
