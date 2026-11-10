package local.mediacenter.library
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.os.SystemClock
import org.json.JSONObject
import org.json.JSONArray

/** Local listening history, keyed by server, media type and target. Never counts seeks as listening. */
class ListeningStore(context:Context):SQLiteOpenHelper(context,"listening.db",null,1){
 override fun onCreate(db:SQLiteDatabase){db.execSQL("CREATE TABLE history(identity TEXT PRIMARY KEY, metadata TEXT NOT NULL, seconds REAL NOT NULL DEFAULT 0, plays INTEGER NOT NULL DEFAULT 0, last_played INTEGER NOT NULL)")}
 override fun onUpgrade(db:SQLiteDatabase,old:Int,new:Int){}
 @Synchronized fun add(key:String,metadata:JSONObject,seconds:Double,play:Boolean){val db=writableDatabase;db.beginTransaction();try{db.execSQL("INSERT OR IGNORE INTO history(identity,metadata,last_played) VALUES(?,?,?)",arrayOf(key,metadata.toString(),System.currentTimeMillis()));db.execSQL("UPDATE history SET metadata=?,seconds=seconds+?,plays=plays+?,last_played=? WHERE identity=?",arrayOf(metadata.toString(),seconds,if(play)1 else 0,System.currentTimeMillis(),key));db.setTransactionSuccessful()}finally{db.endTransaction()}}
 @Synchronized fun list(mode:String,limit:Int?=null):String{require(limit==null||limit in 1..1000);require(mode in setOf("recent","most"));val out=JSONArray();readableDatabase.rawQuery("SELECT metadata,seconds,plays FROM history ORDER BY "+(if(mode=="most")"plays DESC,seconds DESC" else "last_played DESC")+(limit?.let{" LIMIT $it"}?:""),null).use{rows->while(rows.moveToNext())out.put(JSONObject(rows.getString(0)).put("listenedSeconds",rows.getDouble(1)).put("playCount",rows.getInt(2)))};return out.toString()}
}
object ListeningHistory{
 private var store:ListeningStore?=null;private var identity="";private var metadata=JSONObject();private var tick=0L;private var pending=0.0;private var session=0.0;private var counted=false;private var playing=false
 @Synchronized fun configure(context:Context){if(store==null)store=ListeningStore(context.applicationContext)}
 @Synchronized fun observe(track:JSONObject?,active:Boolean){val now=SystemClock.elapsedRealtime();val key=if(track==null)"" else JSONArray(listOf(track.optString("account"),track.optString("kind"),track.optString("id"))).toString();if(playing&&tick>0){val elapsed=((now-tick)/1000.0).coerceIn(0.0,2.0);pending+=elapsed;session+=elapsed};tick=now
  if(key!=identity){flush();identity=key;session=0.0;counted=false};if(track!=null)metadata=track;playing=active;if(pending>=5||!active)flush()
 }
 @Synchronized fun restart(){flush();session=0.0;counted=false}
 private fun flush(){if(identity.isBlank()||pending<=0)return;val count=!counted&&session>=30;try{store?.add(identity,metadata,pending,count)}catch(_:Exception){return};if(count)counted=true;pending=0.0}
 @Synchronized fun list(context:Context,mode:String):String{configure(context);return store!!.list(mode)}
}
