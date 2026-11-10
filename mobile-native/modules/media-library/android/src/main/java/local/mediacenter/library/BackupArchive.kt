package local.mediacenter.library
import java.io.*
import java.security.MessageDigest
import java.util.zip.*
import org.json.*

internal data class BackupContents(val manifest:JSONObject,val assets:Map<String,ByteArray>)
/** No archive entry is used as a filesystem path before this allowlist is checked. */
internal object BackupArchive {
 val folders=setOf("custom-covers","retained-artwork","spoken-transcripts","mix-snapshots")
 const val EXPANDED=96*1024*1024
 fun asset(path:String):Boolean {val parts=path.split('/');return parts.size==2&&parts[0] in folders&&parts[1].matches(Regex("[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,179}"))&&!parts[1].contains("..")&&parts[1].substringAfterLast('.') in setOf("image","txt","json")}
 fun digest(bytes:ByteArray)=MessageDigest.getInstance("SHA-256").digest(bytes).joinToString(""){"%02x".format(it)}
 fun pack(manifest:JSONObject,assets:Map<String,ByteArray>):ByteArray {
  require(assets.size<=2048&&assets.keys.all(::asset));require(assets.values.sumOf{it.size.toLong()}<=EXPANDED)
  val root=JSONObject(manifest.toString()).put("assets",JSONArray(assets.map{(path,bytes)->JSONObject().put("path",path).put("sha256",digest(bytes)).put("bytes",bytes.size)}));BackupData.validate(root)
  val out=ByteArrayOutputStream();ZipOutputStream(out).use{zip->fun put(name:String,bytes:ByteArray){require(bytes.size<=16*1024*1024);zip.putNextEntry(ZipEntry(name));zip.write(bytes);zip.closeEntry()};put("manifest.json",root.toString().toByteArray(Charsets.UTF_8));for((path,bytes)in assets)put("assets/$path",bytes)}
  return out.toByteArray().also{require(it.size<=BackupCipher.LIMIT-128){"Backup exceeds the 64 MiB archive limit"}}
 }
 fun unpack(bytes:ByteArray):BackupContents {
  require(bytes.size<=BackupCipher.LIMIT);val entries=linkedMapOf<String,ByteArray>();var total=0L
  ZipInputStream(ByteArrayInputStream(bytes)).use{zip->while(true){val entry=zip.nextEntry?:break;val name=entry.name;require(!entry.isDirectory&&(name=="manifest.json"||name.startsWith("assets/")&&asset(name.removePrefix("assets/")))){"Backup contains an unsupported path"};require(entries.size<2049&&!entries.containsKey(name)){"Backup contains duplicate or excessive entries"};val out=ByteArrayOutputStream();val block=ByteArray(16384);while(true){val n=zip.read(block);if(n<0)break;total+=n;require(total<=EXPANDED&&out.size()+n<=16*1024*1024){"Expanded backup exceeds its safety limit"};out.write(block,0,n)};entries[name]=out.toByteArray();zip.closeEntry()}}
  val manifest=JSONObject(String(requireNotNull(entries.remove("manifest.json")){"Backup manifest is missing"},Charsets.UTF_8));BackupData.validate(manifest)
  val declarations=manifest.getJSONArray("assets");require(declarations.length()==entries.size)
  val assets=linkedMapOf<String,ByteArray>();for(i in 0 until declarations.length()){val d=declarations.getJSONObject(i);val path=d.getString("path");require(asset(path)&&!assets.containsKey(path));val data=requireNotNull(entries["assets/$path"]);require(data.size==d.getInt("bytes")&&digest(data)==d.getString("sha256")){"Backup artwork or text failed integrity validation"};assets[path]=data}
  return BackupContents(manifest,assets)
 }
}
