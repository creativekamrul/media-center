package local.mediacenter.library
import org.json.JSONObject

internal object CachedMediaKind {
 fun music(row:JSONObject):Boolean {
  val id=row.optString("id");if(id.startsWith("spoken-file:")||id.startsWith("video-file:"))return false
  // Legacy app-created music records predate the explicit kind column.
  return !row.has("kind")||row.optString("kind")=="music"
 }
}
