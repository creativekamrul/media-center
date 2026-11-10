package local.mediacenter.library
import org.json.JSONObject
/** Restore identity remains explicit for books and independently identified podcast episodes. */
data class SpokenResumeRef(val account:String,val target:SpokenTarget){companion object{
 fun parse(row:JSONObject):SpokenResumeRef{val account=row.getString("account");val item=row.getString("item");val episode=row.optString("episode");require(account.length in 1..512&&item.length in 1..512&&episode.length<=512);val target=when(row.getString("kind")){"book"->{require(episode.isEmpty());SpokenTarget.Book(item)};"episode"->{require(episode.isNotEmpty());SpokenTarget.Episode(item,episode)};else->throw IllegalArgumentException("Unknown spoken media kind")};return SpokenResumeRef(account,target)}
}}
