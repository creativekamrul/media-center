package local.mediacenter.library
import org.json.*
import java.util.concurrent.ConcurrentHashMap
object TrackMetadata {
 private val rows=ConcurrentHashMap<String,JSONObject>()
 fun remember(account:String,node:Any?){when(node){is JSONArray->for(i in 0 until node.length())remember(account,node.opt(i));is JSONObject->{if(node.has("id")&&node.has("title")&&(node.has("duration")||node.has("album"))){if(rows.size>50000)rows.clear();rows[account+":"+node.getString("id")]=node};for(key in node.keys())if(node.opt(key) is JSONArray||node.opt(key) is JSONObject)remember(account,node.opt(key))}}}
 fun pending(account:String,id:String):Playable {val r=rows[account+":"+id];return Playable(account,id,r?.optString("title")?:"",r?.optString("artist")?:"",r?.optString("album")?:"",r?.optString("coverArt")?:"","",r?.optDouble("duration",0.0)?:0.0)}
 fun pending(ref:MusicQueueRef):Playable {val known=pending(ref.account,ref.id);return known.copy(title=ref.title?:known.title,artist=ref.artist?:known.artist,album=ref.album?:known.album,cover=ref.cover?:known.cover,duration=ref.duration?:known.duration)}
}
