package local.mediacenter.library
import org.json.JSONObject

data class PlaybackPolicy(val rewind:Int=0,val headset:String="track"){
 companion object {fun parse(raw:JSONObject):PlaybackPolicy {val rewind=raw.optInt("rewind",0);require(rewind in 0..30);val headset=raw.optString("headset","track");require(headset in setOf("track","seek","disabled"));return PlaybackPolicy(rewind,headset)}}
 fun json()=JSONObject().put("rewind",rewind).put("headset",headset)
 fun resume(position:Double,spoken:Boolean,pausedMs:Long)=if(spoken&&pausedMs>=10000) (position-rewind).coerceAtLeast(0.0) else position
 fun headsetAction(next:Boolean)=when(headset){"seek"->Pair("skip",if(next)30.0 else -15.0);"disabled"->null;else->Pair(if(next)"next" else "previous",0.0)}
}
