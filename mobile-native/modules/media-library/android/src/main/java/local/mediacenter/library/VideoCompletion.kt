package local.mediacenter.library
internal object VideoCompletion {
 // keep-open retains the last frame and may never emit END_FILE until it is closed.
 fun reached(loaded:Boolean,ended:Boolean,failed:Boolean,eof:String?)=loaded&&!ended&&!failed&&eof=="yes"
}
