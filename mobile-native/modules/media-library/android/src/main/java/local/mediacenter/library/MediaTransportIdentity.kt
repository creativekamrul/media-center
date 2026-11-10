package local.mediacenter.library
import org.json.JSONObject
/** Empty initial/stopped queues have no track object, including Android platform-null JSON values. */
internal object MediaTransportIdentity {
 fun key(state:JSONObject):String=state.optJSONObject("track")?.toString().orEmpty()
}
