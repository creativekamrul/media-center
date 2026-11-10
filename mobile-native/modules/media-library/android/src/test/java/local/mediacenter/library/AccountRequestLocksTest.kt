package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import java.util.concurrent.*
class AccountRequestLocksTest {
 @Test fun anUnavailableServerCannotHoldTheOtherAccountsRequestLock(){val executor=Executors.newFixedThreadPool(2);val entered=CountDownLatch(1);val release=CountDownLatch(1);try{val first=executor.submit{AccountRequestLocks.withAccount("book-server"){entered.countDown();release.await(2,TimeUnit.SECONDS)}};assertTrue(entered.await(1,TimeUnit.SECONDS));val second=executor.submit<Boolean>{AccountRequestLocks.withAccount("podcast-server"){true}};assertTrue(second.get(1,TimeUnit.SECONDS));release.countDown();first.get(1,TimeUnit.SECONDS)}finally{release.countDown();executor.shutdownNow()}}
 @Test fun theSameAccountStillSerializesItsBookAndEpisodeRequests(){val executor=Executors.newFixedThreadPool(2);val entered=CountDownLatch(1);val waiting=CountDownLatch(1);val release=CountDownLatch(1);try{val first=executor.submit{AccountRequestLocks.withAccount("shared-server"){entered.countDown();release.await(2,TimeUnit.SECONDS)}};assertTrue(entered.await(1,TimeUnit.SECONDS));val second=executor.submit<Boolean>{waiting.countDown();AccountRequestLocks.withAccount("shared-server"){true}};assertTrue(waiting.await(1,TimeUnit.SECONDS));try{second.get(50,TimeUnit.MILLISECONDS);fail("Same-account request passed the active lock")}catch(_:TimeoutException){};release.countDown();first.get(1,TimeUnit.SECONDS);assertTrue(second.get(1,TimeUnit.SECONDS))}finally{release.countDown();executor.shutdownNow()}}
}
