package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class MusicMatchTest {
 private val track=MusicIdentity("a","1","My Song","Artist","Album",180.0)
 @Test fun exactAlternateCopyRetainsSourceIdentity(){assertTrue(MusicMatch.same(track,track.copy(account="b",id="copy",duration=181.5)));assertFalse(MusicMatch.same(track,track.copy(id="other")))}
 @Test fun matchingNeverStripsVersionMarkersOrAssumesMissingDuration(){for(t in listOf(track.copy(account="b",title="My Song (Live)"),track.copy(account="b",album="Other"),track.copy(account="b",artist="Another"),track.copy(account="b",duration=183.0),track.copy(account="b",duration=Double.NaN),track.copy(account="b",duration=0.0)))assertFalse(MusicMatch.same(track,t))}
 @Test fun booksPodcastsAndRadioNeverParticipate(){for(kind in listOf("book","podcast","radio")){assertFalse(MusicMatch.same(track.copy(kind=kind),track.copy(account="b")));assertFalse(MusicMatch.same(track,track.copy(account="b",kind=kind)))}}
 @Test fun whitespaceAndCaseMayMatchButUnknownMetadataCannot(){assertTrue(MusicMatch.same(track,track.copy(account="b",title="  MY   SONG ",artist="ARTIST")));assertFalse(MusicMatch.same(track.copy(album=""),track.copy(account="b")));assertFalse(MusicMatch.same(track.copy(artist=""),track.copy(account="b")));assertFalse(MusicMatch.same(track,track.copy(account="b",album="")))}
}
