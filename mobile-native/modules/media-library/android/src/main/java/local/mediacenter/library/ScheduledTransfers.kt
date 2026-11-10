package local.mediacenter.library
import org.json.JSONObject
/** A scheduled worker must never claim, resume or cancel a manually queued transfer. */
internal object ScheduledTransfers {
 fun selectable(row:JSONObject,owner:String?)=row.optString("status")=="queued"&&(owner==null||row.optString("scheduledOwner")==owner)
 fun pending(row:JSONObject,owner:String)=row.optString("scheduledOwner")==owner&&row.optString("status") in setOf("queued","downloading")
 fun pause(row:JSONObject,owner:String){if(pending(row,owner))row.put("status","paused").put("error","Android paused the scheduled transfer. Resume it in Cache.")}
}
