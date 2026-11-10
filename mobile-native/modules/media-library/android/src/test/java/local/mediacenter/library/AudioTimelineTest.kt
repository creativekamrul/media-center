package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class AudioTimelineTest {
 @Test fun bookSeekCrossesFilesWithoutTreatingChaptersAsFiles(){
  val parts=listOf(AudioPart("first",0.0,100.0),AudioPart("second",100.0,90.0))
  assertEquals(FilePosition(1,25.0),AudioTimeline.locate(parts,125.0))
  assertEquals(FilePosition(1,0.0),AudioTimeline.locate(parts,100.0))
  assertEquals(125.0,AudioTimeline.whole(parts,1,25.0),.001)
 }
 @Test fun podcastEpisodeStartsItsOwnTimeline(){
  val first=listOf(AudioPart("episode1",0.0,60.0));val second=listOf(AudioPart("episode2",0.0,80.0))
  assertEquals(FilePosition(0,30.0),AudioTimeline.locate(first,30.0));assertEquals(FilePosition(0,0.0),AudioTimeline.locate(second,0.0))
 }
 @Test fun seekClampsAtEndpoints(){val p=listOf(AudioPart("file",0.0,20.0));assertEquals(FilePosition(0,0.0),AudioTimeline.locate(p,-5.0));assertEquals(FilePosition(0,20.0),AudioTimeline.locate(p,99.0))}
}
