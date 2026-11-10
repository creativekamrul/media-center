package local.mediacenter.library
import org.json.*
import java.net.*
import java.security.MessageDigest
import java.security.SecureRandom
/** Token-authenticated bounded Subsonic requests; repeated form fields are preserved. */
internal object NativeSubsonic {
 private fun validateUrl(value:String,allowHttp:Boolean):String {
  val uri=try{URI(value.trim())}catch(e:Exception){throw IllegalArgumentException("Enter a valid server URL")}
  require(uri.scheme=="https"||(uri.scheme=="http"&&allowHttp)) { "Use HTTPS, or explicitly allow HTTP for this server" }
  require(!uri.host.isNullOrBlank()&&uri.userInfo==null&&uri.query==null&&uri.fragment==null) { "Use the server base URL without credentials, query or fragment" }
  return uri.toString().trimEnd('/')
 }
 fun jsonRequest(a:JSONObject,method:String,params:Map<String,String>):JSONObject = jsonRequest(a,method,params.toList())
 fun jsonRequest(a:JSONObject,method:String,params:List<Pair<String,String>>):JSONObject {
  val result=try{JSONObject(String(request(a,method,params).first,Charsets.UTF_8)).getJSONObject("subsonic-response")}catch(e:IllegalStateException){throw e}catch(e:Exception){throw IllegalStateException("Server returned an invalid Subsonic response")}
  if(result.optString("status")!="ok") { val code=result.optJSONObject("error")?.optInt("code");throw IllegalStateException(if(code==40||code==41) "Sign-in failed. Check your username and password." else "Server rejected the request (code $code).") }
  return result
 }
 fun request(a:JSONObject,method:String,params:Map<String,String>):Pair<ByteArray,String> = request(a,method,params.toList())
 fun request(a:JSONObject,method:String,params:List<Pair<String,String>>):Pair<ByteArray,String> {
  val salt=ByteArray(16).also{SecureRandom().nextBytes(it)}.joinToString(""){"%02x".format(it)}
  val token=MessageDigest.getInstance("MD5").digest((a.getString("password")+salt).toByteArray(Charsets.UTF_8)).joinToString(""){"%02x".format(it)}
  val fields=mapOf("u" to a.getString("username"),"t" to token,"s" to salt,"v" to "1.16.1","c" to "MediaCenterMobile","f" to "json").toList()+params
  val connection=(URI(validateUrl(a.getString("url"),a.optBoolean("allowHttp"))+"/rest/$method.view").toURL().openConnection() as HttpURLConnection)
  try {
   connection.instanceFollowRedirects=false;connection.connectTimeout=15000;connection.readTimeout=20000;connection.requestMethod="POST";connection.doOutput=true
   connection.setRequestProperty("Content-Type","application/x-www-form-urlencoded; charset=UTF-8")
   val body=fields.joinToString("&"){URLEncoder.encode(it.first,"UTF-8")+"="+URLEncoder.encode(it.second,"UTF-8")}
   connection.outputStream.use{it.write(body.toByteArray(Charsets.UTF_8))}
   val status=connection.responseCode
   if(status in 300..399) throw IllegalStateException("Use the final server URL; redirects are not followed.")
   if(status!=200) throw IllegalStateException("Server returned HTTP $status")
   val bytes=connection.inputStream.use { stream ->
    val output=java.io.ByteArrayOutputStream(); val buffer=ByteArray(16384)
    while(true) { val count=stream.read(buffer);if(count<0)break;require(output.size()+count<=8*1024*1024) { "Server response is too large" };output.write(buffer,0,count) };output.toByteArray()
   }
   require(bytes.size<=8*1024*1024) { "Server response is too large" }
   return Pair(bytes,connection.contentType?.substringBefore(';')?:"application/octet-stream")
  } catch(e:IllegalStateException){throw e}catch(e:Exception){throw IllegalStateException(when(e){is javax.net.ssl.SSLException->"Certificate or TLS handshake failed";is java.net.SocketTimeoutException->"Server timed out";is java.net.UnknownHostException->"DNS could not resolve server";else->"Cannot reach the server. Check the network or VPN."})}
  finally{connection.disconnect()}
 }
}
