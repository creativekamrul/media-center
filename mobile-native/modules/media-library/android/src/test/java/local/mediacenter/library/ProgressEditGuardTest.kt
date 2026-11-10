package local.mediacenter.library
import org.junit.Test
import org.junit.Assert.*
import java.util.concurrent.*
class ProgressEditGuardTest {
 @Test fun queuedProgressMustFinishBeforeAnOfflineEdit(){val tasks=mutableListOf<Runnable>();val executor=Executor{tasks.add(it)};ProgressEditGuard.report(executor){};assertTrue(runCatching{ProgressEditGuard.edit{}}.isFailure);tasks.removeAt(0).run();assertEquals("ready",ProgressEditGuard.edit{"ready"})}
 @Test fun reportFailureOrRejectedExecutorDoesNotLeaveTheGateBusy(){val direct=Executor{it.run()};assertTrue(runCatching{ProgressEditGuard.report(direct){throw IllegalArgumentException("fixture")}}.isFailure);assertEquals("ready",ProgressEditGuard.edit{"ready"});val rejected=Executor{throw RejectedExecutionException("fixture")};assertTrue(runCatching{ProgressEditGuard.report(rejected){}}.isFailure);assertEquals("ready",ProgressEditGuard.edit{"ready"})}
 @Test fun playbackRejectedDuringEditAndAllowedAfterFailure(){val entered=CountDownLatch(1);val release=CountDownLatch(1);val pool=Executors.newSingleThreadExecutor();try{val result=pool.submit{try{ProgressEditGuard.edit{entered.countDown();release.await(2,TimeUnit.SECONDS);throw IllegalArgumentException("fixture")}}catch(_:IllegalArgumentException){}};assertTrue(entered.await(2,TimeUnit.SECONDS));try{ProgressEditGuard.start{fail("Playback admitted during edit")};fail("No rejection")}catch(_:IllegalStateException){};release.countDown();result.get(2,TimeUnit.SECONDS);assertEquals("ready",ProgressEditGuard.start{"ready"})}finally{release.countDown();pool.shutdownNow()}}
}
