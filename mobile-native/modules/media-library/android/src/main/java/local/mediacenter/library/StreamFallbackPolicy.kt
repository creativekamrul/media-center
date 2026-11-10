package local.mediacenter.library

/** A failed music stream may switch once; spoken timelines and output failures never do. */
internal object StreamFallbackPolicy {
 fun eligible(kind:String,account:String,fallbackFrom:String,errorCode:String)=
  kind=="music"&&account!="device"&&fallbackFrom.isEmpty()&&PlaybackFailure.safeCode(errorCode).substringBefore('|')!="output"
}
