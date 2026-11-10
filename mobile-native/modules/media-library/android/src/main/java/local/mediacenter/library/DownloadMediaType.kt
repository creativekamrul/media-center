package local.mediacenter.library
import java.util.Locale

internal class UnexpectedMediaResponse:IllegalStateException("The server returned a non-media response. Reconnect this source and retry.")
internal object DownloadMediaType {
 fun original(raw:String?):String {
  val mime=(raw?:"application/octet-stream").substringBefore(';').trim().lowercase(Locale.ROOT)
  if(!mime.startsWith("audio/")&&!mime.startsWith("video/")&&mime !in setOf("application/octet-stream","binary/octet-stream","application/ogg","application/x-flac","application/x-matroska"))throw UnexpectedMediaResponse()
  return mime
 }
}
