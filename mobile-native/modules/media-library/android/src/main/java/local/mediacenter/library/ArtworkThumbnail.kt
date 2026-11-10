package local.mediacenter.library

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import java.io.ByteArrayOutputStream

/** Bound decoded artwork even when a provider ignores the requested thumbnail size. */
internal object ArtworkThumbnail {
 fun encode(bytes:ByteArray,size:Int):String {
  val bounds=BitmapFactory.Options().apply{inJustDecodeBounds=true}
  BitmapFactory.decodeByteArray(bytes,0,bytes.size,bounds)
  require(bounds.outWidth>0&&bounds.outHeight>0){"Artwork is unavailable"}
  val options=BitmapFactory.Options().apply{inSampleSize=ArtworkSizing.sample(bounds.outWidth,bounds.outHeight,size)}
  val original=BitmapFactory.decodeByteArray(bytes,0,bytes.size,options)?:error("Artwork is unavailable")
  try {
   val ratio=minOf(1.0,size.toDouble()/maxOf(original.width,original.height))
   val scaled=if(ratio<1)Bitmap.createScaledBitmap(original,maxOf(1,(original.width*ratio).toInt()),maxOf(1,(original.height*ratio).toInt()),true) else original
   try {
    val output=ByteArrayOutputStream()
    val alpha=scaled.hasAlpha()
    scaled.compress(if(alpha)Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,90,output)
    val mime=if(alpha)"image/png" else "image/jpeg"
    return "data:$mime;base64,"+Base64.encodeToString(output.toByteArray(),Base64.NO_WRAP)
   } finally {if(scaled!==original)scaled.recycle()}
  } finally {original.recycle()}
 }
}
