package local.mediacenter.library
import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
object AppShortcuts {
 fun install(c:Context){try{val manager=c.getSystemService(ShortcutManager::class.java);if(manager.isRateLimitingActive)return;val activity=c.packageManager.getLaunchIntentForPackage(c.packageName)?.component?:return
  val rows=listOf(Triple("search","Search",android.R.drawable.ic_menu_search),Triple("library","Library",android.R.drawable.ic_menu_agenda),Triple("downloads","Cache",android.R.drawable.stat_sys_download_done)).take(manager.maxShortcutCountPerActivity)
  manager.dynamicShortcuts=rows.map{(path,label,icon)->ShortcutInfo.Builder(c,path).setShortLabel(label).setIcon(Icon.createWithResource(c,icon)).setIntent(Intent(Intent.ACTION_VIEW,Uri.parse("mediacenter:///$path")).setComponent(activity)).build()}
 }catch(_:Exception){/* Launcher restrictions must not block opening the library. */}}
}
