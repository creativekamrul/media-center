package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class MusicQueuePlanTest {
 @Test fun keepsSourceIdentityOrderAndRepeatedTracks(){var reads=0;val rows=MusicQueuePlan.parse("""[{"account":"a","id":"1"},{"account":"b","id":"1"},{"account":"a","id":"1"}]"""){reads++;"navidrome"};assertEquals(3,rows.size);assertEquals(rows[0],rows[2]);assertNotEquals(rows[0],rows[1]);assertEquals(2,reads)}
 @Test fun pendingDisplayHintsDoNotResolveOrTrustCallerStreams(){val ref=MusicQueuePlan.parse("""[{"account":"a","id":"1","title":"Saved title","artist":"Artist","album":"Album","duration":8,"coverArt":"cover-id","url":"https://wrong","headers":"secret","kind":"book"}]"""){"jellyfin"}.single();val pending=TrackMetadata.pending(ref);assertEquals("Saved title",pending.title);assertEquals("Artist",pending.artist);assertEquals(8.0,pending.duration,0.0);assertEquals("",pending.url);assertEquals("",pending.headers);assertEquals("music",pending.kind);assertNull(pending.spokenTarget)}
 @Test fun malformedMetadataCannotBecomeAnUnboundedQueuePayload(){for(raw in listOf("""[{"account":"a","id":"1","duration":-1}]""","""[{"account":"a","id":"1","duration":"8"}]"""))assertTrue(runCatching{MusicQueuePlan.parse(raw){"jellyfin"}}.isFailure);val ref=MusicQueuePlan.parse("""[{"account":"device","id":"indexed","coverArt":"file:///private"}]"""){"jellyfin"}.single();assertNull(ref.cover);assertEquals(512,MusicQueuePlan.parse("""[{"account":"a","id":"1","title":"${"x".repeat(1000)}"}]"""){"jellyfin"}.single().title!!.length)}
 @Test(expected=IllegalArgumentException::class) fun rejectsSpokenProviders(){MusicQueuePlan.parse("""[{"account":"books","id":"book"}]"""){"audiobookshelf"}}
 @Test(expected=IllegalArgumentException::class) fun rejectsUnknownProviders(){MusicQueuePlan.parse("""[{"account":"a","id":"1"}]"""){"unknown"}}
 @Test fun localReferencesNeverAcceptCallerFileUrls(){val rows=MusicQueuePlan.parse("""[{"account":"device","id":"indexed-id","url":"file:///private"}]"""){error("Should use local index")};assertEquals(MusicQueueRef("device","indexed-id"),rows.single())}
}
