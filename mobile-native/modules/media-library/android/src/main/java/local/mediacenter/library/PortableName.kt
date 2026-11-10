package local.mediacenter.library

/** UTF-8 byte limits matter on shared storage; never split an emoji or other code point. */
internal object PortableName {
 fun stem(value:String,maxBytes:Int=90):String {
  require(maxBytes in 1..200)
  val clean=value.map{if(it<' '||it=='\u007f'||it in "\\/:*?\"<>|")'_' else it}.joinToString("").trim().ifBlank{"Untitled"}
  val out=StringBuilder();var bytes=0;val points=clean.codePoints().iterator()
  while(points.hasNext()){val next=String(Character.toChars(points.nextInt()));val count=next.toByteArray(Charsets.UTF_8).size;if(bytes+count>maxBytes)break;out.append(next);bytes+=count}
  return out.toString().trim().ifBlank{"_"}
 }
}
