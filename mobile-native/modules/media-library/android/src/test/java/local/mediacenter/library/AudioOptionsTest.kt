package local.mediacenter.library

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class AudioOptionsTest {
 @Test fun defaultsLeaveAudioUnprocessed(){val options=AudioOptions.parse(JSONObject());assertEquals("no",options.replayGain);assertEquals("",options.filter());assertEquals(0.0,options.preamp,0.0)}
 @Test fun validatesProcessingBeforePersisting(){
  for(raw in listOf("{\"replayGain\":\"arbitrary\"}","{\"preamp\":80}","{\"bands\":[1,2]}","{\"bands\":[0,0,0,0,0,0,0,0,0,30]}")){
   try{AudioOptions.parse(JSONObject(raw));fail("Accepted unsafe audio settings") }catch(_:IllegalArgumentException){}
  }
 }
 @Test fun equalizerRoundTripsWithoutChangingGain(){val options=AudioOptions("album",-3.0,true,listOf(-2.0,1.0,0.0,0.0,0.0,2.0,0.0,0.0,0.0,-1.0));assertEquals(options,AudioOptions.parse(options.json()));assertTrue(options.filter().contains("equalizer=f=31:t=o:w=1:g=-2.0"));assertTrue(options.filter().contains("equalizer=f=16000:t=o:w=1:g=-1.0"))}
 @Test fun eqPreampIsIndependentAndDisabledWithEq(){val options=AudioOptions.parse(JSONObject("""{"replayGain":"album","preamp":2,"equalizer":true,"eqPreamp":-6}"""));assertEquals(2.0,options.preamp,0.0);assertEquals(-6.0,options.eqPreamp,0.0);assertTrue(options.filter().startsWith("lavfi=[volume=-6.0dB,"));assertEquals(options,AudioOptions.parse(options.json()));assertEquals("",options.copy(equalizer=false).filter())}
 @Test(expected=IllegalArgumentException::class) fun rejectInvalidEqPreamp(){AudioOptions.parse(JSONObject("""{"eqPreamp":100}"""))}
 @Test fun parametricRoundTripAndBypass(){val a=AudioOptions.parse(JSONObject("""{"equalizer":true,"parametric":true,"eqPreamp":-4,"filters":[{"frequency":80,"gain":3,"q":0.7}]}"""));assertEquals(a,AudioOptions.parse(a.json()));assertTrue(a.filter().contains("f=80.0:t=q:w=0.7:g=3.0"));assertEquals("",a.copy(equalizer=false).filter())}
 @Test fun voiceProcessingOnlyAffectsSpokenKinds(){val a=AudioOptions(speech=true);for(kind in listOf("music","local","radio"))assertEquals("",a.filter(kind));for(kind in listOf("book","podcast"))assertTrue(a.filter(kind).contains("f=2000"))}
 @Test fun rejectsInvalidParametricInput(){for(raw in listOf("""{"filters":[{"frequency":0,"gain":0,"q":1}]}""","""{"filters":[{"frequency":1000,"gain":20,"q":1}]}""","""{"filters":[{"frequency":1000,"gain":0,"q":0}]}""","""{"fallback":5}""")){try{AudioOptions.parse(JSONObject(raw));fail("Accepted invalid filter")}catch(_:IllegalArgumentException){}}}
}
