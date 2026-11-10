package local.mediacenter.library
import org.json.JSONObject
import java.net.*
class ProviderStatus(val status:Int):Exception("Server returned HTTP $status")
object ProviderHttp {
 fun segment(s:String)=URLEncoder.encode(s,"UTF-8").replace("+","%20")
 fun bytes(a:JSONObject,path:String,headers:Map<String,String>,body:JSONObject?=null,method:String=if(body==null)"GET" else "POST"):Pair<ByteArray,String>{
  require(!path.startsWith('/')&&!path.contains(".."));val uri=URI(a.getString("url").trimEnd('/')+"/"+path);val c=uri.toURL().openConnection() as HttpURLConnection
  try{c.instanceFollowRedirects=false;c.connectTimeout=15000;c.readTimeout=25000;headers.forEach{(k,v)->require(!v.contains('\r')&&!v.contains('\n'));c.setRequestProperty(k,v)}
   if(body!=null){require(method in setOf("POST","PATCH"));c.requestMethod=method;c.doOutput=true;c.setRequestProperty("Content-Type","application/json");c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))}}
   if(c.responseCode !in 200..299)throw ProviderStatus(c.responseCode)
   val result=c.inputStream.use{input->val out=java.io.ByteArrayOutputStream();val b=ByteArray(16384);while(true){val n=input.read(b);if(n<0)break;require(out.size()+n<=16*1024*1024){"Server response too large"};out.write(b,0,n)};out.toByteArray()};return result to (c.contentType?.substringBefore(';')?:"application/octet-stream")
  }finally{c.disconnect()}
 }
 fun json(a:JSONObject,path:String,headers:Map<String,String> = emptyMap(),body:JSONObject?=null)=JSONObject(String(bytes(a,path,headers,body).first,Charsets.UTF_8))
 fun sameOrigin(a:JSONObject,path:String):String{val base=URI(a.getString("url").trimEnd('/')+"/");val uri=base.resolve(path);require(uri.scheme==base.scheme&&uri.authority==base.authority&&uri.userInfo==null){"Server supplied an unexpected audio origin"};return uri.toString()}
}
