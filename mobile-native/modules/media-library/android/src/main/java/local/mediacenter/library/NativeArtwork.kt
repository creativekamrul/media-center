package local.mediacenter.library
import android.content.Context
import java.security.MessageDigest
import java.util.UUID
/** All providers use the same authenticated native fetch and persistent thumbnail cache. */
internal object NativeArtwork {
 fun read(c:Context,account:String,id:String,size:Int):String {CustomArtwork.read(c,account,id,size)?.let{return it};return ArtworkStore.read(c,account,id,size){
  try { val a=EncryptedAccounts.read(c,account);val (bytes,mime)=when(a.optString("type")){
   "jellyfin"->ProviderHttp.bytes(a,"Items/${ProviderHttp.segment(id)}/Images/Primary?maxWidth=$size",Jellyfin.headers(a))
   "downtify"->Downtify.cover(a,id)
   "audiobookshelf"->Audiobookshelf.request(a,"api/items/${ProviderHttp.segment(id)}/cover?width=$size",{EncryptedAccounts.write(c,account,it)})
   else->{val salt=UUID.randomUUID().toString();val token=MessageDigest.getInstance("MD5").digest((a.getString("password")+salt).toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)};val fields=mapOf("u" to a.getString("username"),"t" to token,"s" to salt,"v" to "1.16.1","c" to "MediaCenterMobile","id" to id,"size" to size.toString());val query=fields.entries.joinToString("&"){ProviderHttp.segment(it.key)+"="+ProviderHttp.segment(it.value)};ProviderHttp.bytes(a,"rest/getCoverArt.view?$query",emptyMap())}
  };require(mime.startsWith("image/")){"Artwork is unavailable"};bytes }catch(e:Exception){RetainedArtwork.bytes(c,account,id)?:throw e}
 }
 }
}
