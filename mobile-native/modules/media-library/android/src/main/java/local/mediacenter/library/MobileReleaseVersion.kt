package local.mediacenter.library
/** Strict SemVer ordering for official asset names. APK code and signer are checked again before install. */
internal data class MobileReleaseVersion(val major:Long,val minor:Long,val patch:Long,val pre:List<String>):Comparable<MobileReleaseVersion>{
 override fun compareTo(other:MobileReleaseVersion):Int {
  for((a,b) in listOf(major to other.major,minor to other.minor,patch to other.patch))if(a!=b)return a.compareTo(b)
  if(pre.isEmpty()||other.pre.isEmpty())return when{pre.isEmpty()&&other.pre.isEmpty()->0;pre.isEmpty()->1;else->-1}
  for(i in 0 until minOf(pre.size,other.pre.size)){val a=pre[i];val b=other.pre[i];if(a==b)continue;val an=a.all{it.isDigit()};val bn=b.all{it.isDigit()};return when{an&&bn->if(a.length!=b.length)a.length.compareTo(b.length) else a.compareTo(b);an->-1;bn->1;else->a.compareTo(b)}}
  return pre.size.compareTo(other.pre.size)
 }
 companion object{
  fun parse(value:String):MobileReleaseVersion? {
   val match=Regex("^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?(?:[+]([0-9A-Za-z.-]+))?$").matchEntire(value)?:return null
   val numbers=(1..3).map{match.groupValues[it].toLongOrNull()?:return null};val pre=match.groupValues[4].takeIf{it.isNotEmpty()}?.split('.')?:emptyList()
   if(pre.any{it.isEmpty()||it.all{c->c.isDigit()}&&it.length>1&&it.startsWith('0')})return null
   return MobileReleaseVersion(numbers[0],numbers[1],numbers[2],pre)
  }
  fun fromAsset(name:String):MobileReleaseVersion? {
   if(!name.startsWith("Media-Center-Mobile-")||!name.endsWith("-arm64.apk")||name.contains("preview",true)||name.contains("emulator",true))return null
   return parse(name.removePrefix("Media-Center-Mobile-").removeSuffix("-arm64.apk"))
  }
 }
}
