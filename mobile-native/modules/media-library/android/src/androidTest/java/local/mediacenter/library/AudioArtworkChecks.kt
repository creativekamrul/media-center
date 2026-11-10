package local.mediacenter.library
import android.content.Context
import android.net.Uri
import org.json.*
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

internal object AudioArtworkChecks {
 private fun own(c:Context){check(c.packageName=="local.mediacenter.library.test")}
 private fun clean(c:Context,name:String){val dir=File(c.filesDir,name);check(dir.canonicalPath.startsWith(c.filesDir.canonicalPath+File.separator));if(dir.exists())check(dir.deleteRecursively())}
 fun artwork(c:Context,phase:(String)->Unit){
  own(c);phase("retained cover renders without an account or network");clean(c,"artwork-thumbnails");clean(c,"retained-artwork");clean(c,"custom-covers")
  val bitmap=android.graphics.Bitmap.createBitmap(16,16,android.graphics.Bitmap.Config.ARGB_8888);bitmap.eraseColor(android.graphics.Color.CYAN);val image=java.io.ByteArrayOutputStream().use{out->check(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));bitmap.recycle();out.toByteArray()}
  val retained=File(c.filesDir,"retained-artwork/"+CustomizationData.key("art-fixture","cover")+".image");retained.parentFile!!.mkdirs();retained.writeBytes(image)
  val first=Uri.parse(NativeArtwork.read(c,"art-fixture","cover",384));check(File(first.path!!).length()>0)
  phase("thumbnail LRU leaves retained and custom masters intact");val master=File(c.filesDir,"custom-covers/master.image");master.parentFile!!.mkdirs();master.writeBytes(image)
  val dir=File(c.filesDir,"artwork-thumbnails");val oldest=File(dir,"oldest.image");val newer=File(dir,"newer.image");java.io.RandomAccessFile(oldest,"rw").use{it.setLength(64L*1024*1024)};java.io.RandomAccessFile(newer,"rw").use{it.setLength(64L*1024*1024)};oldest.setLastModified(1000);newer.setLastModified(2000)
  val next=Uri.parse(ArtworkStore.read(c,"art-fixture","other",192){image});check(File(next.path!!).length()>0);check(!oldest.exists()&&newer.exists());check(dir.listFiles()!!.sumOf{it.length()}<=128L*1024*1024);check(retained.readBytes().contentEquals(image)&&master.readBytes().contentEquals(image))
  phase("offline cover regenerates after thumbnail eviction");clean(c,"artwork-thumbnails");val restored=Uri.parse(NativeArtwork.read(c,"art-fixture","cover",192));check(File(restored.path!!).length()>0)
  phase("invalid artwork does not create a thumbnail");check(runCatching{ArtworkStore.read(c,"art-fixture","bad",192){byteArrayOf(1,2,3)}}.isFailure);check(File(c.filesDir,"artwork-thumbnails").listFiles()!!.none{it.extension=="partial"})
  clean(c,"artwork-thumbnails");clean(c,"retained-artwork");clean(c,"custom-covers")
 }
 fun audio(c:Context,phase:(String)->Unit){
  own(c);phase("muted bundled MPV original playback");val rate=44100;val count=rate*12;val wave=ByteBuffer.allocate(44+count*2).order(ByteOrder.LITTLE_ENDIAN);wave.put("RIFF".toByteArray()).putInt(36+count*2).put("WAVEfmt ".toByteArray()).putInt(16).putShort(1).putShort(1).putInt(rate).putInt(rate*2).putShort(2).putShort(16).put("data".toByteArray()).putInt(count*2)
  val file=File(c.cacheDir,"audio-processing-fixture.wav");file.writeBytes(wave.array());val handle=NativeMpv.create(c);check(handle!=0L)
  val field=Playback.javaClass.getDeclaredField("handle").apply{isAccessible=true};field.setLong(Playback,handle)
  try{
   check(NativeMpv.command(handle,arrayOf("set","volume","0"))>=0);check(NativeMpv.load(handle,file.path,false,"")>=0)
   val deadline=System.currentTimeMillis()+10000;while((NativeMpv.property(handle,"time-pos")?.toDoubleOrNull()?:0.0)<=0){check(System.currentTimeMillis()<deadline){"Muted original did not advance: "+NativeMpv.lastError(handle)};Thread.sleep(50)}
   phase("graphic EQ is acknowledged by the real engine");var saved=false;val graphic=AudioOptions(equalizer=true,bands=listOf(4.0,3.0,2.0,1.0,0.0,-1.0,-2.0,-1.0,0.0,1.0),eqPreamp=-6.0);Playback.setAudio(graphic){saved=true};check(saved);check(NativeMpv.property(handle,"af").orEmpty().contains("equalizer"));val before=NativeMpv.property(handle,"af")
   phase("failed persistence restores the previous engine filter");check(runCatching{Playback.setAudio(AudioOptions()){error("Simulated private preference write failure")}}.isFailure);check(NativeMpv.property(handle,"af")==before)
   phase("parametric EQ and ReplayGain engine acceptance");Playback.setAudio(AudioOptions(replayGain="album",preamp=-2.0,equalizer=true,eqPreamp=-5.0,parametric=true,filters=listOf(ParametricBand(80.0,3.0,0.7),ParametricBand(3000.0,-2.0,1.2))));check(NativeMpv.property(handle,"replaygain")=="album");check(NativeMpv.property(handle,"af").orEmpty().contains("equalizer"))
   phase("book voice/silence filters and reset");check(NativeMpv.command(handle,arrayOf("set","af",AudioOptions(speech=true,silence="gentle").filter("book")))>=0);Playback.setAudio(AudioOptions());check(NativeMpv.property(handle,"replaygain")=="no");check(NativeMpv.property(handle,"af").orEmpty() in setOf("","[]"));check(NativeMpv.property(handle,"time-pos")?.toDoubleOrNull()!=null)
  }finally{Playback.idleProgressEdit{field.setLong(Playback,0L);NativeMpv.destroy(handle)};file.delete()}
 }
}
