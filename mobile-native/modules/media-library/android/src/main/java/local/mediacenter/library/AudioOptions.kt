package local.mediacenter.library
import org.json.JSONObject
import org.json.JSONArray

data class ParametricBand(val frequency:Double,val gain:Double,val q:Double){
 fun json()=JSONObject().put("frequency",frequency).put("gain",gain).put("q",q)
 companion object {fun parse(r:JSONObject):ParametricBand {val f=r.getDouble("frequency");val g=r.getDouble("gain");val q=r.getDouble("q");require(f.isFinite()&&f in 20.0..20000.0&&g.isFinite()&&g in -12.0..12.0&&q.isFinite()&&q in 0.1..12.0);return ParametricBand(f,g,q)}}
}
data class AudioOptions(val replayGain:String="no",val preamp:Double=0.0,val equalizer:Boolean=false,val bands:List<Double> = List(10){0.0},val eqPreamp:Double=0.0,val parametric:Boolean=false,val filters:List<ParametricBand> = emptyList(),val fallback:Double=0.0,val speech:Boolean=false,val silence:String="off"){
 companion object{fun parse(value:JSONObject):AudioOptions{val gain=value.optString("replayGain","no");require(gain in setOf("no","track","album"));val pre=value.optDouble("preamp",0.0);require(pre.isFinite()&&pre in -12.0..6.0);val rows=value.optJSONArray("bands")?:JSONArray(List(10){0.0});require(rows.length()==10);val bands=(0..9).map{rows.getDouble(it)};require(bands.all{it.isFinite()&&it in -12.0..12.0});val eqPre=value.optDouble("eqPreamp",0.0);require(eqPre.isFinite()&&eqPre in -24.0..6.0);val filters=value.optJSONArray("filters")?:JSONArray();require(filters.length()<=12);val fallback=value.optDouble("fallback",0.0);require(fallback.isFinite()&&fallback in -12.0..0.0);val silence=value.optString("silence","off");require(silence in SpokenSilence.modes);return AudioOptions(gain,pre,value.optBoolean("equalizer"),bands,eqPre,value.optBoolean("parametric"),(0 until filters.length()).map{ParametricBand.parse(filters.getJSONObject(it))},fallback,value.optBoolean("speech"),silence)}}
 fun json()=JSONObject().put("replayGain",replayGain).put("preamp",preamp).put("equalizer",equalizer).put("bands",JSONArray(bands)).put("eqPreamp",eqPreamp).put("parametric",parametric).put("filters",JSONArray(filters.map{it.json()})).put("fallback",fallback).put("speech",speech).put("silence",silence)
 fun filter(kind:String="music"):String {
  val chain=mutableListOf<String>()
  if(equalizer){chain.add("volume=${eqPreamp}dB");if(parametric)chain.addAll(filters.map{"equalizer=f=${it.frequency}:t=q:w=${it.q}:g=${it.gain}"}) else {val frequencies=listOf(31,62,125,250,500,1000,2000,4000,8000,16000);chain.addAll(frequencies.mapIndexed{i,f->"equalizer=f=$f:t=o:w=1:g=${bands[i]}"})}}
  if(speech&&kind in setOf("book","podcast"))chain.addAll(listOf("volume=-3dB","equalizer=f=125:t=o:w=1:g=-3","equalizer=f=2000:t=o:w=1:g=3"))
  SpokenSilence.filter(silence,kind)?.let{chain.add(it)}
  return if(chain.isEmpty())"" else "lavfi=["+chain.joinToString(",")+"]"
 }
}
