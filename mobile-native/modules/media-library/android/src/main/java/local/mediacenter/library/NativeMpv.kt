package local.mediacenter.library
import android.content.Context
object NativeMpv {
 init { System.loadLibrary("media_mpv") }
 external fun create(context:Context):Long
 external fun createVideo(context:Context,surface:android.view.Surface):Long
 external fun load(handle:Long,url:String,append:Boolean,headers:String):Int
 external fun eventEntry(handle:Long):Long
 external fun command(handle:Long,args:Array<String>):Int
 external fun property(handle:Long,name:String):String?
 external fun lastError(handle:Long):String
 external fun event(handle:Long):Int
 external fun destroy(handle:Long)
}
