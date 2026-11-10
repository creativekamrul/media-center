package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
class CachePolicyTest {
 @Test fun defaultsPreserveManualDownloads(){assertNull(CachePolicy().reason(true,false,100))}
 @Test fun conditionsAndBudgetStopTransfers(){assertNotNull(CachePolicy(unmetered=true).reason(true,true,0));assertNotNull(CachePolicy(charging=true).reason(false,false,0));assertNull(CachePolicy(budget=100).reason(false,true,20,80));assertNotNull(CachePolicy(budget=100).reason(false,true,20,81));assertNotNull(CachePolicy(budget=100).reason(false,true,100))}
 @Test(expected=IllegalArgumentException::class) fun invalidBudgetRejected(){CachePolicy.parse("{\"budget\":-1}")}
}
