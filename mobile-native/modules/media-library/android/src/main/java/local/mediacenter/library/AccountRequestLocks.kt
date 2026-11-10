package local.mediacenter.library
import java.util.concurrent.ConcurrentHashMap

/** Refresh-token serialization belongs to one account, never every Audiobookshelf server. */
internal object AccountRequestLocks {
 private val locks=ConcurrentHashMap<String,Any>()
 fun <T> withAccount(id:String,work:()->T):T=synchronized(locks.computeIfAbsent(id){Any()}){work()}
}
