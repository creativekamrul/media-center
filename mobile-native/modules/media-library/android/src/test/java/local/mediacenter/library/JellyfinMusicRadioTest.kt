package local.mediacenter.library
import org.json.*
import org.junit.Test
import org.junit.Assert.*
class JellyfinMusicRadioTest {
 @Test fun videosBooksAndUnknownSeedsCannotBeUsedForMusicRadio(){Jellyfin.requireMusicSeed(JSONObject().put("Type","Audio"));for(kind in listOf("Movie","Episode","Series","AudioBook","Book","Podcast","MusicAlbum","unknown")){try{Jellyfin.requireMusicSeed(JSONObject().put("Type",kind));fail("Accepted $kind")}catch(_:IllegalArgumentException){}}}
 @Test fun onlyAudioItemsAreReturnedAndTheResultIsBounded(){val rows=JSONArray().put(JSONObject().put("Id","episode").put("Type","Episode"));for(i in 0..90)rows.put(JSONObject().put("Id","track$i").put("Type","Audio").put("Name","Song $i"));rows.put(JSONObject().put("Id","book").put("Type","Book"));val r=Jellyfin.musicSimilarResponse(JSONObject().put("Items",rows));assertEquals(60,r.getInt("total"));val items=r.getJSONArray("items");for(i in 0 until items.length())assertEquals("track",items.getJSONObject(i).getString("kind"))}
}
