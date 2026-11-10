package local.mediacenter.library
import java.net.URI
import org.json.JSONObject

/** Share-sheet inputs are data, never authenticated URLs or commands. */
internal object SharedContentData {
 private val hosts=setOf("open.spotify.com","music.youtube.com","www.youtube.com","youtube.com","youtu.be","deezer.com","www.deezer.com","soundcloud.com","www.soundcloud.com","m.soundcloud.com")
 fun link(value:String):String {
  require(value.length in 1..2048&&!value.any{it.isWhitespace()||it.isISOControl()}){"Choose a public music link"}
  val uri=URI(value);require(uri.scheme=="https"&&uri.host?.lowercase() in hosts&&uri.userInfo==null&&(uri.port==-1||uri.port==443)){"Share a public Spotify, YouTube Music, Deezer or SoundCloud link"}
  return uri.toASCIIString()
 }
 fun parse(raw:String):JSONObject {
  require(raw.length in 1..4096&&!raw.contains('\u0000')){"Shared text is empty or too large"}
  val text=raw.trim();require(text.isNotEmpty()){"Shared text is empty"}
  val url=Regex("https?://[^\\s<>]+",RegexOption.IGNORE_CASE).find(text)?.value?.trimEnd('.',',',')',']')
  if(url!=null)return JSONObject().put("kind","link").put("value",link(url))
  require(!Regex("[a-z][a-z0-9+.-]*://",RegexOption.IGNORE_CASE).containsMatchIn(text)){"This shared link type is not supported"}
  require(text.length<=300){"Keep a library search under 300 characters"}
  return JSONObject().put("kind","text").put("value",text)
 }
}
