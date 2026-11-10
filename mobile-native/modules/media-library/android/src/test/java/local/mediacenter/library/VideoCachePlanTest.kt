package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
class VideoCachePlanTest {
 private fun item(kind:String="movie")=JSONObject().put("id","video").put("kind",kind).put("title","Video").put("duration",120.0).put("resume",15.0).put("accessToken","private-token").put("url","https://private-url")
 @Test fun musicBooksShowsSeasonsAndUnknownMediaCannotBecomeVideos(){for(kind in listOf("track","book","show","podcast","series","season","unknown")){try{VideoCachePlan.manifest("account","video","source",item(kind),"mp4");fail("Accepted $kind")}catch(_:IllegalArgumentException){}}}
 @Test fun metadataNeverStoresTokensOrAuthenticatedUrls(){val result=VideoCachePlan.manifest("account","video","source",item(),"mp4");assertFalse(result.toString().contains("private-token"));assertFalse(result.toString().contains("private-url"));assertEquals("movie",result.getJSONObject("item").getString("kind"))}
 @Test fun versionAccountAndMediaTypeAreIndependentCacheIdentities(){val one=VideoCachePlan.manifest("account","video","source",item(),"mp4");for(other in listOf(VideoCachePlan.manifest("other","video","source",item(),"mp4"),VideoCachePlan.manifest("account","video","source2",item(),"mkv"),VideoCachePlan.manifest("account","video","source",item("videoEpisode"),"mp4")))assertNotEquals(one.getString("key"),other.getString("key"));assertTrue(one.getString("file").startsWith("video-file:"))}
 @Test fun mp4VideosNeverReceiveTheAudioM4aExtension(){assertEquals("mp4",VideoCachePlan.suffix("video/mp4","m4a"));assertEquals("mkv",VideoCachePlan.suffix("application/octet-stream","mkv"));assertEquals("video",VideoCachePlan.suffix("application/octet-stream","../../bad"))}
 @Test fun resumeIsLocalBoundedAndRestartsFinishedVideos(){assertEquals(20.0,VideoCachePlan.resume(20.0,10.0,120.0),0.0);assertEquals(10.0,VideoCachePlan.resume(Double.NaN,10.0,120.0),0.0);assertEquals(0.0,VideoCachePlan.resume(120.0,10.0,120.0),0.0);assertEquals(0.0,VideoCachePlan.resume(-1.0,Double.NaN,120.0),0.0)}
 @Test fun offlineVideoNeverNeedsCredentialsOrReportsServerProgress(){val media=JellyfinMedia(JSONObject().put("id","account"),"video",item(),"fd://1","source","","",offline=true);for(event in listOf("Playing","Progress","Stopped"))Jellyfin.report(media,event,20.0,true)}
 @Test fun wrongIdentityAndInvalidDurationsFailBeforeSaving(){for(value in listOf(item().put("id","other"),item().put("duration",0))){try{VideoCachePlan.manifest("account","video","source",value,"mp4");fail("Accepted invalid video")}catch(_:IllegalArgumentException){}}}
}
