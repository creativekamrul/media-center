package local.mediacenter.library
/** No raw native log, URL, path or credential is presented in diagnostics. */
internal object PlaybackFailure {
 fun message(value:String):String=when(safeCode(value).substringBefore('|')){
  "authorization"->"The media server rejected access to this file. Reconnect the library and retry."
  "missing"->"The server could not find this media file. Rescan the library and retry."
  "tls"->"The media connection could not verify its certificate or complete TLS. Check the server certificate and this device’s date and time."
  "timeout"->"Loading the media timed out. Check the connection to the server and retry."
  "network"->"The media server could not be reached. Check the network or VPN and retry."
  "format"->"The media response was not recognized as a playable file. The file may be damaged or the server may have returned another response."
  "decoder"->"The bundled media engine could not decode this file’s format."
  "output"->"Android could not open the audio output. Check the connected DAC or output device and retry."
  else->"Unable to play this file. Check the source and connection."
 }
 fun safeCode(value:String):String {val parts=value.split('|');val code=parts.getOrNull(1)?.toIntOrNull()?:0;val category=when(code){-14->"output";-17->"format";else->parts.firstOrNull()?.takeIf{it in setOf("authorization","missing","tls","timeout","network","format","decoder","output")}?:"unknown"};return "$category|$code"}
}
