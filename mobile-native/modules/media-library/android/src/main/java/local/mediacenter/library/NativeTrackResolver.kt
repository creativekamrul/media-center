package local.mediacenter.library
import org.json.*
import java.net.*
import java.security.MessageDigest
import java.util.UUID
/** Original-media resolution shared by playback and the native download service. */
internal object NativeTrackResolver {
 fun resolve(context:android.content.Context,pending:Playable,preferOffline:Boolean=true,allowFallback:Boolean=preferOffline):Playable {
  try{return direct(context,pending,preferOffline)}catch(original:Exception){if(preferOffline&&allowFallback)try{MusicFallback.find(context,pending)?.let{return it}}catch(_:Exception){};throw original}
 }
 private fun direct(context:android.content.Context,pending:Playable,preferOffline:Boolean):Playable {
  if(pending.spokenTarget!=null)return SpokenResolver.resolve(context,pending)
  if(pending.account=="device"){
   return DeviceLibrary.play(context,pending.id,false)
  }
  if(preferOffline){
   OfflineStore.cached(context,pending)?.let{return it}
  }
  val id=pending.account;val account=EncryptedAccounts.read(context,id);val songId=pending.id
  if(account.optString("type")=="audiobookshelf"){require(songId.startsWith("spoken-file:"));return SpokenCache.resolveFile(context,account,songId)}
  if(account.optString("type")=="jellyfin"&&songId.startsWith("video-file:")){require(!preferOffline){"Use the video playback screen"};return VideoCache.resolveFile(context,account,songId)}
  if(account.optString("type")=="jellyfin"){val m=Jellyfin.prepare(account,songId);require(m.item.getString("kind")=="track"){"Choose a music track"};return Playable(id,songId,m.item.getString("title"),m.item.optString("artist"),m.item.optString("album"),songId,m.url,m.item.optDouble("duration"),m.headers,jellyfin=m)}
  return if(account.optString("type")=="downtify") Downtify.resolve(account,songId) else {
   val song=NativeSubsonic.jsonRequest(account,"getSong",mapOf("id" to songId)).getJSONObject("song")
   val salt=UUID.randomUUID().toString();val token=MessageDigest.getInstance("MD5").digest((account.getString("password")+salt).toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
   val fields=mapOf("u" to account.getString("username"),"t" to token,"s" to salt,"v" to "1.16.1","c" to "MediaCenterMobile","id" to songId,"format" to "raw")
   val url=account.getString("url")+"/rest/stream.view?"+fields.toList().joinToString("&"){URLEncoder.encode(it.first,"UTF-8")+"="+URLEncoder.encode(it.second,"UTF-8")}
   Playable(id,songId,song.optString("title"),song.optString("artist"),song.optString("album"),song.optString("coverArt"),url,song.optDouble("duration",0.0),suffix=song.optString("suffix","audio"))
  }
 }
}
