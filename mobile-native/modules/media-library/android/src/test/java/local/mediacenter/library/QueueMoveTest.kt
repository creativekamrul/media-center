package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class QueueMoveTest {
 @Test fun currentTrackMovesWithoutChangingItsIdentity(){val (rows,index)=QueueMove.apply(listOf("a","b","c"),1,1,2);assertEquals(listOf("a","c","b"),rows);assertEquals("b",rows[index])}
 @Test fun movingAcrossCurrentPreservesCurrentOccurrence(){val rows=listOf("a","b","b","c");val (moved,index)=QueueMove.apply(rows,2,0,3);assertEquals(1,index);assertEquals(listOf("b","b","c","a"),moved);assertEquals(rows,listOf("a","b","b","c"))}
 @Test fun rejectingStaleIndexes(){try{QueueMove.apply(listOf("a"),0,1,0);fail()}catch(_:IllegalArgumentException){}}
}
