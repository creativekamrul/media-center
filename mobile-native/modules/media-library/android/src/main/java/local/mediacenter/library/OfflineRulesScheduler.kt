package local.mediacenter.library
import android.content.Context
import androidx.work.*
import java.util.concurrent.TimeUnit

internal object OfflineRulesScheduler {
 private const val name="media-center-offline-rules"
 @Volatile private var signature=""
 @Synchronized fun configure(c:Context){
  val policy=OfflineStore.policy(c);val rules=OfflineRules.definitions(c).filter{it.enabled};val enabled=OfflineRules.background(c)&&OfflineStore.folder(c)!=null&&policy.unmetered&&policy.budget>0&&rules.isNotEmpty()
  val next=listOf(enabled,policy.charging,policy.budget,OfflineStore.folder(c),rules.joinToString("|"){it.id+":"+it.fingerprint()}).joinToString(";")
  if(signature==next)return
  val manager=WorkManager.getInstance(c)
  if(!enabled){manager.cancelUniqueWork(name);signature=next;return}
  val constraints=Constraints.Builder().setRequiredNetworkType(NetworkType.UNMETERED).setRequiresCharging(policy.charging).setRequiresStorageNotLow(true).build()
  val request=PeriodicWorkRequestBuilder<OfflineRulesWorker>(1,TimeUnit.HOURS).setInitialDelay(1,TimeUnit.MINUTES).setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL,15,TimeUnit.MINUTES).addTag(name).build()
  manager.enqueueUniquePeriodicWork(name,ExistingPeriodicWorkPolicy.UPDATE,request)
  signature=next
 }
}

/** Regular bounded WorkManager work; downloads use the same original-file IO and pause checkpoints. */
@androidx.annotation.Keep
class OfflineRulesWorker(c:Context,p:WorkerParameters):Worker(c,p){
 override fun doWork():Result {
  val c=applicationContext;val owner=id.toString()
  if(!c.getSystemService(android.os.UserManager::class.java).isUserUnlocked)return Result.retry()
  if(!OfflineRules.background(c)||OfflineRules.definitions(c).none{it.enabled})return Result.success()
  if(!OfflineStore.beginScheduled(c,owner))return Result.retry()
  val deadline=android.os.SystemClock.elapsedRealtime()+7*60*1000
  val cancelled={isStopped||!OfflineRules.background(c)||android.os.SystemClock.elapsedRealtime()>=deadline}
  val manager=c.getSystemService(android.app.NotificationManager::class.java)
  return try{
   manager.createNotificationChannel(android.app.NotificationChannel("offline-rules","Offline collection checks",android.app.NotificationManager.IMPORTANCE_LOW))
   val notification=android.app.Notification.Builder(c,"offline-rules").setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("Checking offline collections").setContentText("Storage and unmetered limits apply. Manage transfers in Cache.").setOngoing(true).build()
   runCatching{manager.notify(53,notification)}
   OfflineRules.check(c,background=true,scheduledOwner=owner,cancelled=cancelled)
   while(!cancelled()&&OfflineStore.scheduledPending(c,owner))Thread.sleep(250)
   Result.success()
  }catch(_:Exception){Result.retry()}finally{OfflineStore.endScheduled(c,owner);manager.cancel(53)}
 }
}
