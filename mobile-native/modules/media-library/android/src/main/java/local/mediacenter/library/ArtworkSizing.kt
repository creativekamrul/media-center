package local.mediacenter.library
internal object ArtworkSizing {
 fun sample(width:Int,height:Int,target:Int):Int {
  require(width>0&&height>0&&target>0)
  var sample=1
  while(maxOf(width,height).toLong()/sample>target.toLong()*2)sample*=2
  return sample
 }
}
