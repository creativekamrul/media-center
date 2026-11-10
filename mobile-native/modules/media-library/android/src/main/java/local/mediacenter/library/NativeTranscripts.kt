package local.mediacenter.library
import android.content.Context
import org.json.JSONObject
import java.io.File
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.util.UUID

/** User-imported spoken transcripts. No lyrics lookup or remote transcription service. */
internal object NativeTranscripts {
 fun identity(track:JSONObject,identity:String){
  require(track.optString("kind") in setOf("book","podcast")){"Transcripts are available for books and podcast episodes"}
  require(identity==track.getString("account")+":"+track.getString("id")){"The playing item changed. Open its transcript again."}
 }
 fun validate(value:String){identity(JSONObject(Playback.state()).getJSONObject("track"),value)}
 fun text(bytes:ByteArray):String {
  require(bytes.size<=2_000_000){"Transcript file is too large"}
  val text=Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString().removePrefix("\uFEFF").replace("\r\n","\n").replace('\r','\n')
  require(text.isNotBlank()){"The transcript file is empty. Saved text was kept."};validateText(text);return text
 }
 internal fun validateText(text:String){
  require(text.length<=500000&&!text.contains('\u0000')){"Choose a UTF-8 VTT, SRT or text transcript"}
  if(text.isBlank())return
  val blocks=text.trim().split(Regex("\\n\\s*\\n"));require(blocks.size<=10000){"Choose a transcript with at most 10,000 sections"}
  if(!text.contains("-->")&&!text.trimStart().startsWith("WEBVTT"))return
  fun seconds(value:String):Double? {val m=Regex("^(?:(\\d{1,5}):)?(\\d{1,2}):(\\d{2})(?:[.,](\\d{1,3}))?$").matchEntire(value)?:return null;val min=m.groupValues[2].toInt();val sec=m.groupValues[3].toInt();if(min>=60||sec>=60)return null;return (m.groupValues[1].toIntOrNull()?:0)*3600.0+min*60+sec+(m.groupValues[4].padEnd(3,'0').toIntOrNull()?:0)/1000.0}
  val valid=blocks.any{block->val lines=block.lines();if(Regex("^(WEBVTT|NOTE|STYLE|REGION)(?:\\s|$)").containsMatchIn(lines.first()))false else {
   val i=lines.indexOfFirst{it.contains("-->")};if(i<0)false else {val range=Regex("^(\\S+)\\s+-->\\s+(\\S+)(?:\\s.*)?$").matchEntire(lines[i]);val start=range?.let{seconds(it.groupValues[1])};val end=range?.let{seconds(it.groupValues[2])};start!=null&&end!=null&&end>start&&lines.drop(i+1).joinToString("\n").replace(Regex("<[^>]*>"),"").isNotBlank()}
  }}
  require(valid){"No valid transcript timestamps were found. Use VTT, SRT or plain text."}
 }
 private fun file(c:Context,identity:String)=File(File(c.filesDir,"spoken-transcripts").apply{mkdirs()},CustomizationData.key("transcript",identity)+".txt")
 fun read(c:Context,identity:String):String {validate(identity);return file(c,identity).takeIf{it.isFile}?.readText(Charsets.UTF_8).orEmpty()}
 fun save(c:Context,identity:String,text:String){validate(identity);validateText(text);val target=file(c,identity)
  if(text.isBlank()){check(!target.exists()||target.delete());return}
  val temp=File(target.parentFile,UUID.randomUUID().toString()+".partial");try{temp.writeText(text,Charsets.UTF_8);check(temp.renameTo(target))}finally{temp.delete()}
 }
}
