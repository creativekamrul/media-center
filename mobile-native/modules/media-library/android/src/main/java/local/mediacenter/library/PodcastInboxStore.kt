package local.mediacenter.library
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.*

/** Separate bounded SQLite state, not a large JSON blob in appearance/preferences. No tokens or URLs. */
internal class PodcastInboxStore(c:Context):SQLiteOpenHelper(c,"podcast-inbox.db",null,1){
 override fun onCreate(db:SQLiteDatabase){
  db.execSQL("CREATE TABLE rules(identity TEXT PRIMARY KEY,account TEXT NOT NULL,show_id TEXT NOT NULL,config TEXT NOT NULL,last_checked INTEGER NOT NULL DEFAULT 0,error TEXT NOT NULL DEFAULT '')")
  db.execSQL("CREATE TABLE seen(account TEXT NOT NULL,show_id TEXT NOT NULL,episode TEXT NOT NULL,PRIMARY KEY(account,show_id,episode))")
  db.execSQL("CREATE TABLE inbox(identity TEXT PRIMARY KEY,account TEXT NOT NULL,show_id TEXT NOT NULL,episode TEXT NOT NULL,payload TEXT NOT NULL,search_text TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,reviewed INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,cache_mode TEXT NOT NULL DEFAULT '',cache_state TEXT NOT NULL DEFAULT '',cache_error TEXT NOT NULL DEFAULT '',cache_checked INTEGER NOT NULL DEFAULT 0)")
  db.execSQL("CREATE INDEX inbox_recent ON inbox(created DESC)");db.execSQL("CREATE INDEX inbox_show ON inbox(account,show_id)")
 }
 override fun onUpgrade(db:SQLiteDatabase,old:Int,new:Int){}
 @Synchronized fun rules():List<JSONObject>{val result=mutableListOf<JSONObject>();readableDatabase.rawQuery("SELECT config,last_checked,error FROM rules ORDER BY last_checked,identity",null).use{r->while(r.moveToNext()){val rule=JSONObject(r.getString(0));result.add(rule.put("key",PodcastInboxRule.parse(rule).key).put("lastChecked",r.getLong(1)).put("error",r.getString(2)))}};return result}
 @Synchronized fun rule(key:String)=rules().firstOrNull{PodcastInboxRule.parse(it).key==key}
 @Synchronized fun save(rule:PodcastInboxRule){require(this.rule(rule.key)!=null||rules().size<20){"Follow up to 20 shows in this inbox"};writableDatabase.execSQL("INSERT OR REPLACE INTO rules(identity,account,show_id,config,last_checked,error) VALUES(?,?,?,?,0,'')",arrayOf(rule.key,rule.account,rule.show,rule.json().toString()))}
 @Synchronized fun removeRule(rule:PodcastInboxRule){val db=writableDatabase;db.beginTransaction();try{db.execSQL("DELETE FROM rules WHERE identity=?",arrayOf(rule.key));db.execSQL("DELETE FROM seen WHERE account=? AND show_id=?",arrayOf(rule.account,rule.show));db.execSQL("UPDATE inbox SET cache_mode='',cache_state='',cache_error='' WHERE account=? AND show_id=? AND cache_mode='auto' AND cache_state='pending'",arrayOf(rule.account,rule.show));db.setTransactionSuccessful()}finally{db.endTransaction()}}
 @Synchronized fun reset(rule:PodcastInboxRule){val db=writableDatabase;db.beginTransaction();try{db.execSQL("DELETE FROM seen WHERE account=? AND show_id=?",arrayOf(rule.account,rule.show));db.execSQL("UPDATE rules SET last_checked=0,error='' WHERE identity=?",arrayOf(rule.key));db.setTransactionSuccessful()}finally{db.endTransaction()}}
 @Synchronized fun checked(rule:PodcastInboxRule,error:String){if(this.rule(rule.key)?.let{PodcastInboxRule.parse(it).json().toString()}!=rule.json().toString())return;writableDatabase.execSQL("UPDATE rules SET last_checked=?,error=? WHERE identity=?",arrayOf<Any>(System.currentTimeMillis(),error.take(300),rule.key))}
 @Synchronized fun ingest(rule:PodcastInboxRule,episodes:List<JSONObject>):Int {
  if(this.rule(rule.key)?.let{PodcastInboxRule.parse(it).json().toString()}!=rule.json().toString())return 0
  val seen=mutableSetOf<String>();val db=writableDatabase;db.rawQuery("SELECT episode FROM seen WHERE account=? AND show_id=?",arrayOf(rule.account,rule.show)).use{r->while(r.moveToNext())seen.add(r.getString(0))}
  val selected=PodcastInboxPlan.select(rule,episodes,seen);val count=db.rawQuery("SELECT COUNT(*) FROM inbox WHERE reviewed=0",null).use{it.moveToFirst();it.getInt(0)}
  require(count+selected.count{entry(identity(it))==null}<=2000){"Review or remove inbox episodes before adding more (2,000 unreviewed limit)"}
  var added=0;db.beginTransaction();try{
   for(e in selected){val key=identity(e);val values=android.content.ContentValues().apply{put("identity",key);put("account",rule.account);put("show_id",rule.show);put("episode",e.getString("episode"));put("payload",e.toString());put("search_text",searchText(e));put("published",e.optLong("publishedAt"));put("created",System.currentTimeMillis());put("cache_mode",if(rule.autoCache)"auto" else "");put("cache_state",if(rule.autoCache)"pending" else "")};if(db.insertWithOnConflict("inbox",null,values,SQLiteDatabase.CONFLICT_IGNORE)!=-1L)added++}
   val insert=db.compileStatement("INSERT OR IGNORE INTO seen(account,show_id,episode) VALUES(?,?,?)");insert.use{statement->for(e in episodes){statement.bindString(1,rule.account);statement.bindString(2,rule.show);statement.bindString(3,e.getString("episode"));statement.executeInsert();statement.clearBindings()}}
   val stored=mutableSetOf<String>();db.rawQuery("SELECT episode FROM inbox WHERE account=? AND show_id=?",arrayOf(rule.account,rule.show)).use{r->while(r.moveToNext())stored.add(r.getString(0))}
   db.compileStatement("UPDATE inbox SET payload=?,search_text=?,published=? WHERE identity=?").use{statement->for(e in episodes){if(e.getString("episode") !in stored)continue;statement.bindString(1,e.toString());statement.bindString(2,searchText(e));statement.bindLong(3,e.optLong("publishedAt"));statement.bindString(4,identity(e));statement.executeUpdateDelete();statement.clearBindings()}}
   db.execSQL("DELETE FROM inbox WHERE reviewed=1 AND identity NOT IN (SELECT identity FROM inbox WHERE reviewed=1 ORDER BY created DESC LIMIT 1000)")
   db.setTransactionSuccessful()
  }finally{db.endTransaction()};return added
 }
 private fun row(r:android.database.Cursor)=JSONObject(r.getString(0)).put("key",r.getString(1)).put("reviewed",r.getInt(2)==1).put("cacheState",r.getString(3)).put("cacheError",r.getString(4))
 @Synchronized fun entries(offset:Int,unreviewed:Boolean,query:String):JSONObject {
  require(offset in 0..5000&&query.length<=200);val where="WHERE 1=1"+(if(unreviewed)" AND reviewed=0" else "")+(if(query.isNotBlank())" AND search_text LIKE ? ESCAPE '\\'" else "");val args=if(query.isBlank())emptyArray() else arrayOf("%"+query.lowercase(java.util.Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%")
  val total=readableDatabase.rawQuery("SELECT COUNT(*) FROM inbox $where",args).use{it.moveToFirst();it.getInt(0)};val rows=JSONArray();readableDatabase.rawQuery("SELECT payload,identity,reviewed,cache_state,cache_error FROM inbox $where ORDER BY created DESC,published DESC,identity LIMIT 50 OFFSET $offset",args).use{r->while(r.moveToNext())rows.put(row(r))};return JSONObject().put("items",rows).put("total",total)
 }
 @Synchronized fun entry(key:String):JSONObject?=readableDatabase.rawQuery("SELECT payload,identity,reviewed,cache_state,cache_error FROM inbox WHERE identity=?",arrayOf(key)).use{if(it.moveToFirst())row(it) else null}
 @Synchronized fun pending():List<JSONObject>{val rows=mutableListOf<JSONObject>();readableDatabase.rawQuery("SELECT payload,identity,reviewed,cache_state,cache_error FROM inbox WHERE cache_state='pending' ORDER BY CASE WHEN cache_mode='manual' THEN 0 ELSE 1 END,cache_checked,created LIMIT 20",null).use{r->while(r.moveToNext())rows.add(row(r))};return rows}
 @Synchronized fun cacheMode(key:String):String=readableDatabase.rawQuery("SELECT cache_mode FROM inbox WHERE identity=?",arrayOf(key)).use{if(it.moveToFirst())it.getString(0) else ""}
 @Synchronized fun cacheState(key:String,state:String,error:String=""){writableDatabase.execSQL("UPDATE inbox SET cache_state=?,cache_error=?,cache_checked=? WHERE identity=?",arrayOf<Any>(state,error.take(300),System.currentTimeMillis(),key))}
 @Synchronized fun cache(key:String){require(entry(key)!=null){"Episode no longer in the inbox"};writableDatabase.execSQL("UPDATE inbox SET cache_mode='manual',cache_state='pending',cache_error='' WHERE identity=?",arrayOf(key))}
 @Synchronized fun review(key:String,value:Boolean){writableDatabase.execSQL("UPDATE inbox SET reviewed=? WHERE identity=?",arrayOf<Any>(if(value)1 else 0,key))}
 @Synchronized fun remove(key:String){writableDatabase.execSQL("DELETE FROM inbox WHERE identity=?",arrayOf(key))}
 @Synchronized fun clearReviewed(){writableDatabase.execSQL("DELETE FROM inbox WHERE reviewed=1")}
 companion object {fun identity(e:JSONObject)=JSONArray(listOf(e.getString("account"),"podcast",e.getString("show"),e.getString("episode"))).toString();private fun searchText(e:JSONObject)=(e.getString("title")+"\n"+e.getString("showTitle")).lowercase(java.util.Locale.ROOT)}
}
