package local.mediacenter.library
import android.content.Context
import android.net.Uri
import android.util.Base64
import java.io.File
internal object CustomArtwork {
 private fun prefs(c:Context)=c.getSharedPreferences("custom_covers",Context.MODE_PRIVATE)
 private fun directory(c:Context)=File(c.filesDir,"custom-covers").apply{mkdirs()}
 @Volatile var revision=0L;private set
 fun version(c:Context,account:String,id:String)=prefs(c).getString(CustomizationData.key(account,id),null)
 fun read(c:Context,account:String,id:String,size:Int):String? {
  val version=version(c,account,id)?:return null;val file=File(directory(c),version)
  if(!file.isFile)return null
  return ArtworkStore.read(c,"custom:$version",id,size){file.readBytes()}
 }
 @Synchronized fun import(c:Context,account:String,id:String,uri:Uri){
  require(uri.scheme=="content"){"Choose an image with the system picker"}
  val bytes=c.contentResolver.openInputStream(uri)?.use{input->val output=java.io.ByteArrayOutputStream();val block=ByteArray(65536);while(true){val n=input.read(block);if(n<0)break;require(output.size()+n<=20*1024*1024){"Choose an image smaller than 20 MB"};output.write(block,0,n)};output.toByteArray()}?:error("Image could not be read")
  val encoded=ArtworkThumbnail.encode(bytes,1536);val data=Base64.decode(encoded.substringAfter(','),Base64.NO_WRAP)
  val key=CustomizationData.key(account,id);val previous=prefs(c).getString(key,null);val version=key+"-"+java.util.UUID.randomUUID()+".image";val target=File(directory(c),version);val temporary=File(directory(c),"$version.partial")
  try{temporary.writeBytes(data);check(temporary.renameTo(target));check(prefs(c).edit().putString(key,version).commit())}catch(e:Exception){target.delete();throw e}finally{temporary.delete()}
  previous?.let{File(directory(c),it).delete()};revision++
 }
 @Synchronized fun remove(c:Context,account:String,id:String){val key=CustomizationData.key(account,id);val name=prefs(c).getString(key,null);check(prefs(c).edit().remove(key).commit());name?.let{File(directory(c),it).delete()};revision++}
}
