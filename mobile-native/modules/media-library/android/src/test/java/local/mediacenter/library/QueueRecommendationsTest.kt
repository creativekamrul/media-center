package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class QueueRecommendationsTest {
 @Test fun neverContinuesSpokenRadioPausedRepeatOrSleepEnd(){for(kind in listOf("book","podcast","radio"))assertFalse(QueueRecommendations.eligible(kind,true,"off",false,0,10.0));assertFalse(QueueRecommendations.eligible("music",false,"off",false,0,10.0));assertFalse(QueueRecommendations.eligible("music",true,"one",false,0,10.0));assertFalse(QueueRecommendations.eligible("music",true,"off",true,0,10.0));assertTrue(QueueRecommendations.eligible("music",true,"off",false,0,10.0))}
 @Test fun preservesCrossServerIdentityAndHonorsFeedback(){val candidates=listOf(QueueCandidate("a","1","A",5.0),QueueCandidate("b","1","B",4.0),QueueCandidate("a","2","Hidden",10.0),QueueCandidate("b","3","C",8.0));val out=QueueRecommendations.select(candidates+candidates,setOf("a" to "1"),setOf("b" to "3"),setOf("hidden"),"");assertEquals(listOf("b" to "1"),out.map{it.identity})}
 @Test fun spacesArtistsWhenAlternativesExistAndCapsTheQueue(){val candidates=(1..5).map{QueueCandidate("s","a$it","A",10.0)}+(1..5).map{QueueCandidate("s","b$it","B",1.0)};val out=QueueRecommendations.select(candidates,emptySet(),emptySet(),emptySet(),"A",6);assertEquals(6,out.size);assertEquals("B",out.first().artist);assertTrue(out.zipWithNext().all{it.first.artist!=it.second.artist})}
}
