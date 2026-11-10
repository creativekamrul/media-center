package local.mediacenter.library
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject

class MediaWidget:AppWidgetProvider(){
 override fun onUpdate(c:Context,m:AppWidgetManager,ids:IntArray){render(c,m,ids)}
 override fun onReceive(c:Context,i:Intent){super.onReceive(c,i);val action=i.action?.removePrefix("local.mediacenter.widget.");if(action in setOf("toggle","next","previous")){
  if(JSONObject(Playback.state()).optJSONObject("track")==null){c.packageManager.getLaunchIntentForPackage(c.packageName)?.let{c.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))}}
  else if(action=="toggle")Playback.control("toggle") else Playback.headset(action=="next")
  update(c)
 }}
 companion object {
  private var lastState=""
  fun update(c:Context){val state=JSONObject(Playback.state());val signature=state.optJSONObject("track").toString()+state.optBoolean("playing");if(signature==lastState)return;lastState=signature;val m=AppWidgetManager.getInstance(c);val ids=m.getAppWidgetIds(ComponentName(c,MediaWidget::class.java));if(ids.isNotEmpty())render(c,m,ids)}
  private fun render(c:Context,m:AppWidgetManager,ids:IntArray){val s=JSONObject(Playback.state());val t=s.optJSONObject("track");val v=RemoteViews(c.packageName,R.layout.media_widget)
   v.setTextViewText(R.id.widget_title,t?.optString("title")?:"Media Center");v.setTextViewText(R.id.widget_artist,t?.optString("artist")?:"Open your library")
   v.setImageViewResource(R.id.widget_play,if(s.optBoolean("playing"))android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play)
   c.packageManager.getLaunchIntentForPackage(c.packageName)?.let{v.setOnClickPendingIntent(R.id.widget_title,PendingIntent.getActivity(c,80,it,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))}
   for((id,action) in listOf(R.id.widget_previous to "previous",R.id.widget_play to "toggle",R.id.widget_next to "next")){val launch=c.packageManager.getLaunchIntentForPackage(c.packageName);if(t==null&&launch!=null){v.setOnClickPendingIntent(id,PendingIntent.getActivity(c,id,launch,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))}else{val intent=Intent(c,MediaWidget::class.java).setAction("local.mediacenter.widget.$action");v.setOnClickPendingIntent(id,PendingIntent.getBroadcast(c,id,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))}}
   m.updateAppWidget(ids,v)
  }
 }
}
