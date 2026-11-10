package local.mediacenter.library
import org.junit.Assert.*
import org.junit.Test
class VideoCompletionTest {
 @Test fun heldLastFrameCompletesExactlyOnce(){assertTrue(VideoCompletion.reached(true,false,false,"yes"));assertFalse(VideoCompletion.reached(true,true,false,"yes"))}
 @Test fun openingFailureAndOrdinaryPauseAreNotCompletion(){assertFalse(VideoCompletion.reached(false,false,false,"yes"));assertFalse(VideoCompletion.reached(true,false,true,"yes"));assertFalse(VideoCompletion.reached(true,false,false,"no"));assertFalse(VideoCompletion.reached(true,false,false,null))}
}
