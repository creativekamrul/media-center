package local.mediacenter.library
/** Retry only a rejected Android output setup, once per queue item; never substitute silent output. */
internal class OutputRecovery {
 var used=false;private set
 fun retry(failure:String):Boolean {if(used||failure.substringAfter('|',"0").toIntOrNull()!=-14)return false;used=true;return true}
 companion object {val compatible=listOf("audio-format" to "s16","audio-samplerate" to "48000","audio-channels" to "stereo")}
}
