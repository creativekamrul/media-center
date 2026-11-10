package local.mediacenter.library

import android.database.Cursor
import android.database.MatrixCursor
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.provider.DocumentsContract.Document
import android.provider.DocumentsContract.Root
import android.provider.DocumentsProvider
import java.io.File

/** Real SAF IO, isolated test UID only. Faults model revoked access and failed storage writes. */
class TransferTestProvider:DocumentsProvider(){
 companion object {
  const val AUTHORITY="local.mediacenter.library.test.transfers"
  @Volatile var denied=false
  @Volatile var full=false
  @Volatile var renameFails=false
 }
 override fun onCreate()=true
 private fun root()=File(requireNotNull(context).cacheDir,"transfer-fixture").apply{mkdirs()}
 private fun file(id:String):File {check(!denied){"Test folder access revoked"};require(id=="root"||id.startsWith("root/"));val r=root().canonicalFile;val f=if(id=="root")r else File(r,id.removePrefix("root/")).canonicalFile;require(f==r||f.path.startsWith(r.path+File.separator));return f}
 private fun id(f:File)="root"+f.canonicalPath.removePrefix(root().canonicalPath).replace(File.separatorChar,'/')
 private fun columns(projection:Array<out String>?)=projection?:arrayOf(Document.COLUMN_DOCUMENT_ID,Document.COLUMN_DISPLAY_NAME,Document.COLUMN_MIME_TYPE,Document.COLUMN_SIZE,Document.COLUMN_FLAGS)
 private fun row(cursor:MatrixCursor,f:File){cursor.addRow(cursor.columnNames.map{when(it){Document.COLUMN_DOCUMENT_ID->id(f);Document.COLUMN_DISPLAY_NAME->f.name;Document.COLUMN_MIME_TYPE->if(f.isDirectory)Document.MIME_TYPE_DIR else "application/octet-stream";Document.COLUMN_SIZE->f.length();Document.COLUMN_FLAGS->Document.FLAG_SUPPORTS_WRITE or Document.FLAG_SUPPORTS_DELETE or Document.FLAG_SUPPORTS_RENAME or if(f.isDirectory)Document.FLAG_DIR_SUPPORTS_CREATE else 0;else->null}})}
 override fun queryRoots(projection:Array<out String>?):Cursor=MatrixCursor(projection?:arrayOf(Root.COLUMN_ROOT_ID,Root.COLUMN_DOCUMENT_ID,Root.COLUMN_TITLE,Root.COLUMN_FLAGS)).apply{addRow(columnNames.map{when(it){Root.COLUMN_ROOT_ID->"root";Root.COLUMN_DOCUMENT_ID->"root";Root.COLUMN_TITLE->"Disposable transfer fixture";Root.COLUMN_FLAGS->Root.FLAG_SUPPORTS_CREATE;else->null}})}
 override fun queryDocument(documentId:String,projection:Array<out String>?):Cursor=MatrixCursor(columns(projection)).apply{val f=file(documentId);if(f.exists())row(this,f)}
 override fun queryChildDocuments(parentDocumentId:String,projection:Array<out String>?,sortOrder:String?):Cursor=MatrixCursor(columns(projection)).apply{file(parentDocumentId).listFiles()?.sortedBy{it.name}?.forEach{row(this,it)}}
 override fun isChildDocument(parentDocumentId:String,documentId:String)=file(documentId).canonicalPath.startsWith(file(parentDocumentId).canonicalPath+File.separator)
 override fun getDocumentType(documentId:String)=if(file(documentId).isDirectory)Document.MIME_TYPE_DIR else "application/octet-stream"
 override fun createDocument(parentDocumentId:String,mimeType:String,displayName:String):String {require(!displayName.contains('/')&&!displayName.contains('\\'));val f=File(file(parentDocumentId),displayName);require(!f.exists());if(mimeType==Document.MIME_TYPE_DIR)check(f.mkdir()) else check(f.createNewFile());return id(f)}
 override fun deleteDocument(documentId:String){check(file(documentId).delete())}
 override fun renameDocument(documentId:String,displayName:String):String {check(!renameFails){"Test provider cannot rename"};val from=file(documentId);val to=File(from.parentFile,displayName);require(!to.exists()&&!displayName.contains('/')&&!displayName.contains('\\'));check(from.renameTo(to));return id(to)}
 override fun openDocument(documentId:String,mode:String,signal:CancellationSignal?):ParcelFileDescriptor {if(mode.contains('w')&&full)throw java.io.IOException("ENOSPC simulated storage failure");return ParcelFileDescriptor.open(file(documentId),ParcelFileDescriptor.parseMode(mode))}
}
