package local.mediacenter.library
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.content.ContentValues
import org.json.*

internal object BackupTables {
 private fun open(c:Context,name:String):SQLiteDatabase {
  val helper=if(name=="listening.db")ListeningStore(c) else PodcastInboxStore(c)
  helper.writableDatabase // Ensure the fixed local schema exists before opening another handle.
  helper.close()
  return SQLiteDatabase.openDatabase(c.getDatabasePath(name).path,null,SQLiteDatabase.OPEN_READWRITE)
 }
 fun snapshot(c:Context):JSONObject {val result=JSONObject();for(database in BackupData.tables.map{it.database}.distinct())open(c,database).use{db->db.beginTransaction();try{for(t in BackupData.tables.filter{it.database==database}){val rows=JSONArray();db.rawQuery("SELECT "+t.columns.joinToString(",")+" FROM "+t.name,null).use{cursor->while(cursor.moveToNext()){require(rows.length()<t.limit){"Backup table exceeds its supported row limit"};val row=JSONArray();for((i,column)in t.columns.withIndex())row.put(if(column in t.numbers){if(column=="seconds")cursor.getDouble(i)else cursor.getLong(i)}else cursor.getString(i));rows.put(row)}};result.put(t.name,rows)};db.setTransactionSuccessful()}finally{db.endTransaction()}};return result}
 fun replace(c:Context,data:JSONObject){for(database in BackupData.tables.map{it.database}.distinct())open(c,database).use{db->db.beginTransaction();try{for(t in BackupData.tables.filter{it.database==database}){db.delete(t.name,null,null);val rows=data.getJSONArray(t.name);for(i in 0 until rows.length()){val row=rows.getJSONArray(i);val values=ContentValues();for((j,column)in t.columns.withIndex())if(column in t.numbers){if(column=="seconds")values.put(column,row.getDouble(j))else values.put(column,row.getLong(j))}else values.put(column,row.getString(j));db.insertOrThrow(t.name,null,values)}};db.setTransactionSuccessful()}finally{db.endTransaction()}}}
 fun empty()=JSONObject().apply{for(t in BackupData.tables)put(t.name,JSONArray())}
}
