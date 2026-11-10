package local.mediacenter.library
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.security.MessageDigest
import org.json.JSONObject
internal object CustomizationData {
 fun key(account:String,id:String):String {require(account.length in 1..512&&id.length in 1..1200&&!account.contains('\u0000')&&!id.contains('\u0000'));return MessageDigest.getInstance("SHA-256").digest((account+"\u0000"+id).toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}}
 fun lyricsIdentity(track:JSONObject,identity:String){require(track.optString("kind","music") in setOf("music","local")){"Song lyrics are only available for music"};require(identity==track.getString("account")+":"+track.getString("id")){"The playing track changed. Open lyrics again."}}
 fun text(bytes:ByteArray):String {require(bytes.size<=400000){"Lyrics file is too large"};val text=Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF").replace("\r\n","\n").replace('\r','\n');require(text.isNotBlank()){"The lyrics file is empty. Saved lyrics were kept."};require(text.length<=100000&&!text.contains('\u0000')){"Choose a UTF-8 LRC or text file"};return text}
 fun lyricsFields(data:JSONObject):JSONObject {
  fun text(key:String)=(data.opt(key) as? String).orEmpty().take(100000)
  return JSONObject().put("synced",text("syncedLyrics")).put("plain",text("plainLyrics")).put("instrumental",data.optBoolean("instrumental"))}
 fun synced(text:String)=Regex("\\[\\d{1,3}:\\d{2}").containsMatchIn(text)
 fun filename(value:String)=value.replace(Regex("[\\\\/:*?\"<>|\\r\\n]"),"_").trim().take(100).ifBlank{"Lyrics"}
}
