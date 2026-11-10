package local.mediacenter.library
import java.net.HttpURLConnection
import java.net.URI
import org.json.JSONObject
/** Bounded read-only source check. Never emits URLs, cookies, tokens or response bodies. */
internal object AudioSourceProbe {
 fun container(bytes:ByteArray):String {
  fun at(offset:Int,text:String)=bytes.size>=offset+text.length&&text.indices.all{bytes[offset+it].toInt().and(255)==text[it].code}
  return when{at(4,"ftyp")->"MP4 / M4A / M4B";at(0,"fLaC")->"FLAC";at(0,"OggS")->"Ogg";at(0,"RIFF")->"RIFF / WAV";at(0,"ID3")->"ID3-tagged audio";bytes.size>=2&&bytes[0].toInt().and(255)==255&&bytes[1].toInt().and(224)==224->"MPEG / AAC frames";else->"Not identified in the first bytes"}
 }
 fun read(track:Playable?):String {
  requireNotNull(track){"Choose and try playing an item first."}
  val result=JSONObject().put("kind",track.kind).put("parts",track.parts.size.coerceAtLeast(1))
  val uri=URI(track.url)
  if(uri.scheme !in setOf("https","http"))return result.put("source","Local file").toString(2)
  result.put("connection",if(uri.scheme=="https")"HTTPS" else "HTTP")
  val c=uri.toURL().openConnection() as HttpURLConnection
  try{
   c.instanceFollowRedirects=false;c.connectTimeout=8000;c.readTimeout=8000;c.setRequestProperty("Range","bytes=0-4095")
   for(name in listOf("Authorization","X-Emby-Token","Cookie")){val prefix="$name: ";if(track.headers.startsWith(prefix)){val value=track.headers.removePrefix(prefix);require(!value.contains('\r')&&!value.contains('\n'));c.setRequestProperty(name,value)}}
   val status=c.responseCode;result.put("httpStatus",status).put("contentType",(c.contentType?:"Unknown").substringBefore(';').take(80)).put("rangeSupported",status==206)
   if(status in 200..299){val bytes=c.inputStream.use{input->val block=ByteArray(4096);var count=0;while(count<block.size){val n=input.read(block,count,block.size-count);if(n<0)break;count+=n};block.copyOf(count)};result.put("container",container(bytes)).put("bytesChecked",bytes.size)}
  }catch(_:javax.net.ssl.SSLException){result.put("failure","Android TLS certificate or handshake check failed")}
   catch(_:java.net.SocketTimeoutException){result.put("failure","Audio source timed out")}
   catch(_:Exception){result.put("failure","Audio source could not be read")}
  finally{c.disconnect()}
  return result.toString(2)
 }
}
