package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject

class JellyfinTest {
 @Test fun mediaTypesRemainExplicit(){
  val expected=mapOf("Audio" to "track","Movie" to "movie","Episode" to "videoEpisode","Series" to "series","Season" to "season","MusicAlbum" to "album","CollectionFolder" to "folder","Book" to "unsupported")
  expected.forEach{(type,kind)->assertEquals(kind,Jellyfin.item(JSONObject().put("Id","same").put("Name","A title").put("Type",type)).getString("kind"))}
 }
 @Test fun musicAlbumMetadataIsPreservedWithoutReinterpretingVideo(){val audio=JSONObject().put("Id","song").put("Type","Audio").put("Album","Original album");assertEquals("Original album",Jellyfin.item(audio).getString("album"));assertEquals("",Jellyfin.item(JSONObject().put("Id","movie").put("Type","Movie").put("Album","Unexpected field")).getString("album"))}
 @Test fun jellyfinTicksBecomeWholeItemSeconds(){
  val result=Jellyfin.item(JSONObject().put("Id","a").put("Type","Movie").put("RunTimeTicks",1250000000L).put("UserData",JSONObject().put("PlaybackPositionTicks",375000000L)))
  assertEquals(125.0,result.getDouble("duration"),0.001);assertEquals(37.5,result.getDouble("resume"),0.001)
 }
 @Test(expected=org.json.JSONException::class) fun missingMediaTypeIsNotGuessed(){Jellyfin.item(JSONObject().put("Id","a").put("Name","Movie"))}
}
