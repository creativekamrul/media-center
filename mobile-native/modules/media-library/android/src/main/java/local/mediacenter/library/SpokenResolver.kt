package local.mediacenter.library
import android.content.Context
import org.json.JSONObject

/** A session is opened only for the item about to play, never for all queued books/episodes. */
internal object SpokenResolver {
 fun pending(entry:SpokenQueueEntry,start:Double=-1.0)=Playable(entry.ref.account,entry.ref.target.key(entry.ref.account),entry.title,"","",entry.ref.target.itemId,"",0.0,kind=if(entry.ref.target is SpokenTarget.Book)"book" else "podcast",startPosition=start,spokenTarget=entry.ref.target)
 fun resolve(c:Context,pending:Playable):Playable {
  val target=requireNotNull(pending.spokenTarget);val id=pending.account;val a=EncryptedAccounts.read(c,id)
  require(a.optString("type")=="audiobookshelf"){"Reconnect this Audiobookshelf source before resuming"}
  val persist:(JSONObject)->Unit={EncryptedAccounts.write(c,id,it)}
  SpokenCache.cached(c,id,target)?.let{return if(pending.startPosition>=0)it.copy(startPosition=pending.startPosition.coerceAtMost(it.duration))else it}
  val detail=Audiobookshelf.detail(a,target.itemId,persist)
  val metadata=if(target is SpokenTarget.Episode){val rows=detail.getJSONArray("items");(0 until rows.length()).map{rows.getJSONObject(it)}.first{it.getString("id")==target.episodeId}}else detail
  val session=Audiobookshelf.session(a,target,persist);val rows=session.getJSONArray("audioTracks")
  val parts=(0 until rows.length()).map{i->val part=rows.getJSONObject(i);AudioPart(part.getString("contentUrl"),part.getDouble("startOffset"),part.getDouble("duration"))}
  val duration=session.getDouble("duration");require(duration.isFinite()&&duration>0)
  val start=if(pending.startPosition>=0)pending.startPosition.coerceAtMost(duration)else session.optDouble("currentTime",0.0)
  AudioTimeline.locate(parts,start)
  return Playable(id,target.key(id),metadata.getString("title"),detail.optString("artist"),if(target is SpokenTarget.Episode)detail.getString("title")else "",target.itemId,parts.first().url,duration,"Authorization: Bearer "+a.getString("accessToken"),kind=if(target is SpokenTarget.Book)"book" else "podcast",parts=parts,startPosition=start,session=SpokenSession(a,target,session.getString("id"),persist),spokenTarget=target)
 }
}
