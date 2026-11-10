package local.mediacenter.library
import android.content.*
import android.database.Cursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File

/** Isolated instrumentation APK only. Never added to the production manifest. */
class MigrationTestProvider:ContentProvider(){
 override fun onCreate()=true
 override fun openFile(uri:Uri,mode:String):ParcelFileDescriptor {require(uri.lastPathSegment=="fixture.mcbackup");return ParcelFileDescriptor.open(File(requireNotNull(context).cacheDir,"fixture.mcbackup"),ParcelFileDescriptor.parseMode(mode))}
 override fun getType(uri:Uri)="application/octet-stream"
 override fun query(uri:Uri,projection:Array<out String>?,selection:String?,selectionArgs:Array<out String>?,sortOrder:String?):Cursor?=null
 override fun insert(uri:Uri,values:ContentValues?):Uri?=null
 override fun update(uri:Uri,values:ContentValues?,selection:String?,selectionArgs:Array<out String>?)=0
 override fun delete(uri:Uri,selection:String?,selectionArgs:Array<out String>?)=0
}
