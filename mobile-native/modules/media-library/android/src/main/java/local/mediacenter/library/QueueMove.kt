package local.mediacenter.library
object QueueMove {
 fun <T> apply(queue:List<T>,current:Int,from:Int,to:Int):Pair<List<T>,Int>{
  require(from in queue.indices&&to in queue.indices&&current in queue.indices)
  val rows=queue.toMutableList();val entry=rows.removeAt(from);rows.add(to,entry)
  val index=when{current==from->to;from<current&&to>=current->current-1;from>current&&to<=current->current+1;else->current}
  return rows to index
 }
}
