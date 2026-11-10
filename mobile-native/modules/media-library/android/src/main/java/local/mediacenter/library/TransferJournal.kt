package local.mediacenter.library

import android.content.Context
import android.net.Uri
import android.provider.DocumentsContract as Documents
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

/** One native transfer owns this journal. Never scans/deletes unrelated shared-folder files. */
internal object TransferJournal {
 private const val KEY="pendingFile"
 private fun prefs(c:Context)=c.getSharedPreferences("media_downloads",Context.MODE_PRIVATE)
 private fun save(c:Context,j:JSONObject){check(prefs(c).edit().putString(KEY,j.toString()).commit())}
 private fun clear(c:Context){check(prefs(c).edit().remove(KEY).commit())}
 private fun load(c:Context)=prefs(c).getString(KEY,null)?.let{JSONObject(it)}
 private fun find(c:Context,parent:Uri,name:String):Uri? {
  val children=Documents.buildChildDocumentsUriUsingTree(parent,Documents.getDocumentId(parent))
  requireNotNull(c.contentResolver.query(children,arrayOf(Documents.Document.COLUMN_DOCUMENT_ID,Documents.Document.COLUMN_DISPLAY_NAME),null,null,null)).use{rows->
   while(rows.moveToNext())if(rows.getString(1)==name)return Documents.buildDocumentUriUsingTree(parent,rows.getString(0))
  };return null
 }
 private fun validate(j:JSONObject){
  val token=j.getString("token");require(UUID.fromString(token).toString()==token)
  val tree=Uri.parse(j.getString("tree"));val parent=Uri.parse(j.getString("parent"))
  require(tree.scheme=="content"&&Documents.isTreeUri(tree)&&parent.scheme=="content"&&parent.authority==tree.authority)
  require(Documents.getTreeDocumentId(parent)==Documents.getTreeDocumentId(tree))
  require(j.getString("tempName")==".mc-$token.partial")
  val target=j.getString("name");require(target.toByteArray(Charsets.UTF_8).size<=240&&target.matches(Regex("[^/\\\\\\r\\n]+ - "+Regex.escape(token)+"\\.[A-Za-z0-9]{2,5}")))
  j.optJSONObject("record")?.let{r->
   require(r.getString("tree")==tree.toString()&&r.getString("name")==target&&r.getLong("bytes")>0)
   require(r.getString("sha256").matches(Regex("[a-f0-9]{64}")))
   require(r.getString("path").endsWith("/$target")&&!r.getString("path").split('/').any{it==".."})
   require(r.getString("key")==r.getString("account")+":"+r.getString("id"))
  }
 }
 fun begin(c:Context,tree:Uri,parent:Uri,baseName:String,suffix:String,mime:String):Pair<Uri,String>{
  check(load(c)==null){"Retry recovery of the previous transfer before starting another"}
  val token=UUID.randomUUID().toString();val name="${PortableName.stem(baseName,180)} - $token.$suffix"
  val j=JSONObject().put("token",token).put("tree",tree.toString()).put("parent",parent.toString()).put("tempName",".mc-$token.partial").put("name",name)
  validate(j);save(c,j)
  // Persist intent before creation, so even a kill before receiving the URI remains recoverable.
  val temp=Documents.createDocument(c.contentResolver,parent,mime,j.getString("tempName"))?:error("Cannot create original-media file")
  require(find(c,parent,j.getString("tempName"))==temp){"Folder changed the temporary file name"}
  return temp to name
 }
 fun prepare(c:Context,record:JSONObject){val j=requireNotNull(load(c));j.put("record",record);validate(j);save(c,j)}
 fun finish(c:Context,record:JSONObject){
  val rows=JSONArray(prefs(c).getString("items","[]"));val keep=(0 until rows.length()).map{rows.getJSONObject(it)}.filterNot{it.optString("key")==record.getString("key")&&it.optString("tree")==record.getString("tree")}
  check(prefs(c).edit().putString("items",JSONArray(keep+record).toString()).remove(KEY).commit())
 }
 private fun matches(c:Context,uri:Uri,r:JSONObject):Boolean {
  val hash=MessageDigest.getInstance("SHA-256");var count=0L
  requireNotNull(c.contentResolver.openInputStream(uri)).use{input->val buffer=ByteArray(65536);while(true){val n=input.read(buffer);if(n<0)break;count+=n;if(count>r.getLong("bytes"))return false;hash.update(buffer,0,n)}}
  return count==r.getLong("bytes")&&hash.digest().joinToString(""){"%02x".format(it)}==r.getString("sha256")
 }
 fun recover(c:Context){
  val j=load(c)?:return;validate(j);val parent=Uri.parse(j.getString("parent"))
  val temp=find(c,parent,j.getString("tempName"));val final=find(c,parent,j.getString("name"));val record=j.optJSONObject("record")
  if(final!=null){
   require(record!=null&&matches(c,final,record)){"A recovered original needs review. No final file was deleted."}
   val rows=JSONArray(prefs(c).getString("items","[]"));require((0 until rows.length()).none{val r=rows.getJSONObject(it);r.optString("tree")==record.getString("tree")&&r.optString("key")==record.getString("key")&&r.optString("uri")!=final.toString()}){"A recovered original conflicts with an existing cached item"}
   if(temp!=null)require(Documents.deleteDocument(c.contentResolver,temp)){"Could not remove the interrupted temporary file"}
   finish(c,record.put("uri",final.toString()));return
  }
  if(temp!=null)require(Documents.deleteDocument(c.contentResolver,temp)){"Could not remove the interrupted temporary file"}
  clear(c)
 }
}
