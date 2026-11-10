package local.mediacenter.library
import android.app.*
import android.content.Intent
import android.os.IBinder
class DownloadService:Service(){
 override fun onCreate(){super.onCreate();getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("downloads","Downloads",NotificationManager.IMPORTANCE_LOW));startForeground(52,Notification.Builder(this,"downloads").setSmallIcon(android.R.drawable.stat_sys_download).setContentTitle("Saving original audio").setContentText("Keep your selected downloads folder connected.").setOngoing(true).build())}
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  OfflineStore.serviceReady(applicationContext,intent==null)
  return START_STICKY
 }
 override fun onTimeout(startId:Int,fgsType:Int){OfflineStore.serviceTimeout(applicationContext);stopSelf()}
 override fun onDestroy(){OfflineStore.serviceStopped(applicationContext);super.onDestroy()}
 override fun onBind(intent:Intent?):IBinder?=null
}
