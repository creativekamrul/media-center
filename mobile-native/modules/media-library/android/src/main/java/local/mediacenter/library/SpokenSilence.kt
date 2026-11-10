package local.mediacenter.library

internal object SpokenSilence {
 val modes=setOf("off","gentle","balanced","strong")
 fun filter(mode:String,kind:String):String? {
  require(mode in modes)
  if(mode=="off"||kind !in setOf("book","podcast"))return null
  val settings=when(mode){"gentle"->"1.2:-50dB:0.25";"balanced"->"0.8:-45dB:0.2";else->"0.5:-40dB:0.15"}.split(':')
  // Copy source PTS: resume/chapter positions must never become shortened-output seconds.
  return "silenceremove=stop_periods=-1:stop_duration=${settings[0]}:stop_threshold=${settings[1]}:stop_silence=${settings[2]}:timestamp=copy"
 }
}
