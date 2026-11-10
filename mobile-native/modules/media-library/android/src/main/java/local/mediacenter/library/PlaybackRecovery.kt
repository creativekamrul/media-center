package local.mediacenter.library
internal object PlaybackRecovery {
 fun point(ended:Boolean,loaded:Boolean,resolving:Boolean,failed:Boolean,position:Double):Double? = if(ended)0.0 else if(!loaded&&!resolving&&failed)position.takeIf{it.isFinite()&&it>=0}?:0.0 else null
}
