package local.mediacenter.library
import org.json.JSONObject
import org.junit.Test
import org.junit.Assert.*
class ScheduledTransfersTest {
 private fun job(status:String,owner:String?=null)=JSONObject().put("status",status).put("scheduledOwner",owner)
 @Test fun workerNeverClaimsManualOrAnotherWorkersQueue(){assertTrue(ScheduledTransfers.selectable(job("queued","worker"),"worker"));assertFalse(ScheduledTransfers.selectable(job("queued"),"worker"));assertFalse(ScheduledTransfers.selectable(job("queued","another"),"worker"));assertFalse(ScheduledTransfers.selectable(job("paused","worker"),"worker"));assertTrue(ScheduledTransfers.selectable(job("queued"),null))}
 @Test fun cancellationPausesOnlyOwnedUnfinishedTransfers(){val own=job("downloading","worker");val manual=job("downloading");val another=job("queued","another");ScheduledTransfers.pause(own,"worker");ScheduledTransfers.pause(manual,"worker");ScheduledTransfers.pause(another,"worker");assertEquals("paused",own.getString("status"));assertEquals("downloading",manual.getString("status"));assertEquals("queued",another.getString("status"))}
 @Test fun completeCancelledAndPausedTransfersNeverRestartOrHoldWorker(){for(status in listOf("complete","cancelled","paused","error")){val r=job(status,"worker");assertFalse(ScheduledTransfers.pending(r,"worker"));ScheduledTransfers.pause(r,"worker");assertEquals(status,r.getString("status"))}}
}
