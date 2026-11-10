package local.mediacenter.library
internal enum class QueueBoundaryAction { FINISH, RESTART, STAY }
internal object QueueBoundary {
 fun action(direction:Int,naturalEnd:Boolean):QueueBoundaryAction {require(direction==1||direction== -1);return if(direction<0)QueueBoundaryAction.RESTART else if(naturalEnd)QueueBoundaryAction.FINISH else QueueBoundaryAction.STAY}
}
