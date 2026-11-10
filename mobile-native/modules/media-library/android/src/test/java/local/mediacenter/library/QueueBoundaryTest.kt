package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class QueueBoundaryTest {
 @Test fun manualLastNextCannotMarkABookOrEpisodeFinished(){for(kind in listOf("book","podcast","music"))assertEquals(kind,QueueBoundaryAction.STAY,QueueBoundary.action(1,false))}
 @Test fun previousAtTheFirstItemRestartsInsteadOfJumpingToTheEnd(){assertEquals(QueueBoundaryAction.RESTART,QueueBoundary.action(-1,false))}
 @Test fun onlyANaturalForwardEndFinishesTheQueue(){assertEquals(QueueBoundaryAction.FINISH,QueueBoundary.action(1,true));assertEquals(QueueBoundaryAction.RESTART,QueueBoundary.action(-1,true))}
}
