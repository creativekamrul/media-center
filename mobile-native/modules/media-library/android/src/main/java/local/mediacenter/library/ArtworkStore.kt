package local.mediacenter.library

import android.content.Context
import android.net.Uri
import android.util.Base64
import java.io.File
import java.security.MessageDigest

/** Public artwork only: no authenticated URLs or credentials are persisted. */
internal object ArtworkStore {
 private const val budget=128L*1024*1024
 private val locks=Array(64){Any()}
 private val transfers=java.util.concurrent.Semaphore(4)
 private val pruning=Any()
 fun read(c:Context,account:String,id:String,size:Int,fetch:()->ByteArray):String {
  val directory=File(c.filesDir,"artwork-thumbnails").apply{mkdirs()}
  val key=MessageDigest.getInstance("SHA-256").digest("$account\u0000$id\u0000$size".toByteArray()).joinToString(""){"%02x".format(it)}
  return synchronized(locks[(key.hashCode() and Int.MAX_VALUE)%locks.size]) {
  val file=File(directory,"$key.image")
  if(file.isFile&&file.length()>0){file.setLastModified(System.currentTimeMillis());return@synchronized Uri.fromFile(file).toString()}
  transfers.acquire()
  val encoded=try{ArtworkThumbnail.encode(fetch(),size)}finally{transfers.release()}
  val bytes=Base64.decode(encoded.substringAfter(','),Base64.NO_WRAP)
  val temp=File(directory,"$key.partial")
  try{temp.writeBytes(bytes);check(temp.renameTo(file))}finally{temp.delete()}
  synchronized(pruning) {
  val entries=directory.listFiles()?.filter{it.name.endsWith(".image")}?.sortedBy{it.lastModified()}?:emptyList()
  var total=entries.sumOf{it.length()}
  for(entry in entries){if(total<=budget)break;if(entry!=file){val length=entry.length();if(entry.delete())total-=length}}
  }
  Uri.fromFile(file).toString()
  }
 }
}
