package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class ArtworkSizingTest {
 @Test fun originalSmallImagesNeverDivideByZeroOrUpsample(){assertEquals(1,ArtworkSizing.sample(90,90,96));assertEquals(1,ArtworkSizing.sample(600,600,1536))}
 @Test fun largeImagesBoundDecoderMemoryBeforeScaling(){assertEquals(16,ArtworkSizing.sample(3000,3000,96));assertEquals(4,ArtworkSizing.sample(3000,2000,384));assertEquals(1,ArtworkSizing.sample(3000,3000,1536))}
 @Test fun invalidDimensionsFailExplicitly(){try{ArtworkSizing.sample(0,300,96);fail()}catch(_:IllegalArgumentException){}}
}
