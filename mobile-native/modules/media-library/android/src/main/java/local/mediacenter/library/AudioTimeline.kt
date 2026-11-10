package local.mediacenter.library
/** Book chapters and physical files are deliberately separate. */
data class AudioPart(val url:String,val start:Double,val duration:Double)
data class FilePosition(val index:Int,val seconds:Double)
object AudioTimeline {
 fun locate(parts:List<AudioPart>,wholeSeconds:Double):FilePosition {
  require(parts.isNotEmpty()&&wholeSeconds.isFinite());require(parts.all{it.start.isFinite()&&it.duration.isFinite()&&it.start>=0&&it.duration>0})
  require(parts.first().start==0.0&&parts.zipWithNext().all{(a,b)->kotlin.math.abs(a.start+a.duration-b.start)<0.1}){"Audio files do not form a continuous timeline"}
  val target=wholeSeconds.coerceIn(0.0,parts.last().start+parts.last().duration)
  val index=parts.indexOfLast{it.start<=target}.coerceAtLeast(0)
  return FilePosition(index,(target-parts[index].start).coerceIn(0.0,parts[index].duration))
 }
 fun whole(parts:List<AudioPart>,index:Int,fileSeconds:Double)=parts[index].start+fileSeconds.coerceIn(0.0,parts[index].duration)
}
