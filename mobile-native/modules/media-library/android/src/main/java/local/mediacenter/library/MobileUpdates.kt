package local.mediacenter.library

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.PackageInfo
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

/** Only official mobile release assets are accepted; Android always asks before installation. */
object MobileUpdates {
 private const val root="https://github.com/creativekamrul/media-center/releases/download/"
 private var candidate:JSONObject?=null
 private fun connection(url:String):HttpURLConnection {
  val uri=URI(url);require(uri.scheme=="https"&&uri.host in setOf("api.github.com","github.com","release-assets.githubusercontent.com","objects.githubusercontent.com"))
  return (uri.toURL().openConnection() as HttpURLConnection).apply { instanceFollowRedirects=false;connectTimeout=15000;readTimeout=30000;setRequestProperty("User-Agent","MediaCenterMobile");setRequestProperty("Accept","application/vnd.github+json") }
 }
 @Synchronized fun check(context:Context):String {
  candidate=null
  val installedVersion=MobileReleaseVersion.parse(context.packageManager.getPackageInfo(context.packageName,0).versionName?:"")
  val preview=JSONObject(context.getSharedPreferences("media_library",Context.MODE_PRIVATE).getString("ui","{}")?:"{}").optString("updateChannel","stable")=="preview"
  val c=connection("https://api.github.com/repos/creativekamrul/media-center/releases?per_page=30")
  val releases=try { require(c.responseCode==200){"GitHub update check failed (${c.responseCode}). Try again later."};val bytes=c.inputStream.use{input->val out=java.io.ByteArrayOutputStream();val bytes=ByteArray(8192);while(true){val n=input.read(bytes);if(n<0)break;require(out.size()+n<=2*1024*1024);out.write(bytes,0,n)};out.toByteArray()};require(bytes.size<=2*1024*1024);JSONArray(String(bytes,Charsets.UTF_8)) }finally{c.disconnect()}
  for(i in 0 until releases.length()) {
   val r=releases.getJSONObject(i);if(r.optBoolean("draft")||(!preview&&r.optBoolean("prerelease")))continue
   val assets=r.optJSONArray("assets")?:continue
   for(j in 0 until assets.length()) {
    val a=assets.getJSONObject(j);val name=a.optString("name")
    val version=MobileReleaseVersion.fromAsset(name)?:continue
    if(installedVersion!=null&&version<=installedVersion)continue
    if(!preview&&version.pre.isNotEmpty())continue
    val url=a.optString("browser_download_url");val digest=a.optString("digest");if(!url.startsWith(root)||!digest.matches(Regex("sha256:[a-fA-F0-9]{64}")))continue
    candidate=JSONObject().put("url",url).put("digest",digest.removePrefix("sha256:")).put("size",a.getLong("size"))
    return JSONObject().put("available",true).put("name",a.getString("name")).put("version",r.optString("tag_name")).put("notes",r.optString("body").take(30000)).put("prerelease",r.optBoolean("prerelease")).put("installed",context.packageManager.getPackageInfo(context.packageName,0).versionName).toString()
   }
  }
  return JSONObject().put("available",false).put("message","No newer matching Android release is available.").toString()
 }
 @Suppress("DEPRECATION")
 @Synchronized fun install(context:Context):String {
  val release=candidate?:throw IllegalStateException("Check for updates first.")
  if(!context.packageManager.canRequestPackageInstalls()) {
   context.startActivity(Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
   return "Allow updates from Media Center, then tap Install again."
  }
  val dir=File(context.cacheDir,"updates").apply{mkdirs()};val file=File(dir,"update.apk");file.delete()
  val size=release.getLong("size");require(size in 1..(500L*1024*1024))
  var url=release.getString("url");var done=false
  try {
   for(hop in 0..4) {
    val c=connection(url)
    try {
     if(c.responseCode in listOf(301,302,303,307,308)){url=URI(url).resolve(c.getHeaderField("Location")).toString();continue}
     require(c.responseCode==200){"Update download failed."}
     var total=0L;c.inputStream.use{input->file.outputStream().use{out->val bytes=ByteArray(65536);while(true){val n=input.read(bytes);if(n<0)break;total+=n;require(total<=size){"Invalid update size"};out.write(bytes,0,n)}}};require(total==size);done=true;break
    }finally{c.disconnect()}
   }
   require(done){"Too many update redirects"}
   val digest=MessageDigest.getInstance("SHA-256");file.inputStream().use{input->val bytes=ByteArray(65536);while(true){val n=input.read(bytes);if(n<0)break;digest.update(bytes,0,n)}}
   require(digest.digest().joinToString(""){"%02x".format(it)}.equals(release.getString("digest"),true)){"Update checksum mismatch"}
   val pm=context.packageManager
   val flags=if(Build.VERSION.SDK_INT>=28)PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
   val apk=pm.getPackageArchiveInfo(file.path,flags)?:error("Invalid Android package")
   val current=pm.getPackageInfo(context.packageName,flags)
   require(apk.packageName==context.packageName){"Update is for a different app"}
   fun code(info:PackageInfo)=if(Build.VERSION.SDK_INT>=28)info.longVersionCode else info.versionCode.toLong()
   fun signers(info:PackageInfo)=(if(Build.VERSION.SDK_INT>=28)info.signingInfo?.apkContentsSigners else info.signatures)?.map{it.toCharsString()}?.toSet()?:emptySet()
   require(code(apk)>code(current)){"This version is already installed or newer."}
   val installed=signers(current)
   val incoming=signers(apk)
   require(installed.isNotEmpty()&&incoming==installed){"Update signature does not match this installation."}
   val uri=FileProvider.getUriForFile(context,context.packageName+".updates",file)
   context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
   return "Confirm the update in the Android installer."
  }catch(e:Exception){file.delete();throw e}
 }
}
