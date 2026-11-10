package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import org.json.JSONObject
class SpokenDownloadPlanTest {
 @Test fun booksUsePhysicalTracksNotChapters(){val raw=JSONObject("""{"mediaType":"book","media":{"chapters":[{"start":0,"end":90},{"start":90,"end":120}],"tracks":[{"ino":1,"duration":60,"startOffset":0},{"ino":2,"duration":60,"startOffset":60}]}}""");val files=SpokenDownloadPlan.files(raw,SpokenTarget.Book("b"));assertEquals(2,files.size);val point=AudioTimeline.locate(files.map{AudioPart(it.ino,it.start,it.duration)},90.0);assertEquals(1,point.index);assertEquals(30.0,point.seconds,0.001)}
 @Test fun episodeSelectsOnlyItsOwnFile(){val raw=JSONObject("""{"mediaType":"podcast","media":{"episodes":[{"id":"a","audioFile":{"ino":1,"duration":30}},{"id":"b","audioFile":{"ino":2,"duration":50}}]}}""");val files=SpokenDownloadPlan.files(raw,SpokenTarget.Episode("show","b"));assertEquals(1,files.size);assertEquals("2",files[0].ino);assertEquals(0.0,files[0].start,0.001)}
 @Test(expected=IllegalArgumentException::class) fun wrongMediaKindFails(){SpokenDownloadPlan.files(JSONObject("""{"mediaType":"podcast","media":{}}"""),SpokenTarget.Book("b"))}
 @Test(expected=IllegalArgumentException::class) fun unavailableEpisodeFails(){SpokenDownloadPlan.files(JSONObject("""{"mediaType":"podcast","media":{"episodes":[]}}"""),SpokenTarget.Episode("s","e"))}
}
