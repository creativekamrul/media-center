package local.mediacenter.library
/** Playback attempts fail promptly rather than waiting on reconciliation network requests. */
internal object ProgressEditGuard {
 @Volatile private var editing=false
 private var reports=0
 fun <T> edit(block:()->T):T {synchronized(this){check(!editing);check(reports==0){"Wait for pending server progress reports to finish, then refresh the preview."};editing=true};try{return block()}finally{synchronized(this){editing=false}}}
 fun report(executor:java.util.concurrent.Executor,block:()->Unit){synchronized(this){check(!editing){"Progress review is being applied"};reports++};val released=java.util.concurrent.atomic.AtomicBoolean(false);fun release(){if(released.compareAndSet(false,true))synchronized(this){reports--}};try{executor.execute{try{block()}finally{release()}}}catch(e:Exception){release();throw e}}
 fun requirePlaybackAllowed(){check(NativeBackup.recoveryError.isEmpty()){NativeBackup.recoveryError};check(!editing){"Progress review is being applied. Try playback again when it finishes."}}
 @Synchronized fun <T> start(block:()->T):T {requirePlaybackAllowed();return block()}
}
