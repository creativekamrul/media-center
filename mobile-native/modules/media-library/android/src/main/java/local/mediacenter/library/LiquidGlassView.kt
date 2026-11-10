package local.mediacenter.library

import android.content.Context
import android.graphics.*
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/** Captures only the underlying content strip, not the dock or controls. No blur layer. */
class LiquidGlassView(context:Context,appContext:AppContext):ExpoView(context,appContext),ViewTreeObserver.OnPreDrawListener {
 var targetTag=0
 var tone=Color.BLACK
 var light=.25f
 var tintAmount=.26f
 var refraction=.7f
 private var lastCapture=0L
 private var image:Bitmap?=null;private var scratch:Bitmap?=null;private var capturing=false
 private val paint=Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
 private val effect=if(Build.VERSION.SDK_INT>=33)RuntimeShader("""
  uniform shader scene;
  uniform float2 size;
  uniform float radius;
  uniform float light;
  uniform float tintAmount;
  uniform float refraction;
  uniform float density;
  layout(color) uniform half4 tone;
  half4 main(float2 p) {
   float2 center=size*.5;
   float2 q=abs(p-center)-(center-float2(radius));
   float distance=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
   float rim=1.0-smoothstep(0.0,18.0*density,-distance);
   float2 corner=max(q,0.0);
   float2 normal=sign(p-center)*normalize(corner+float2(.001));
   if(q.x<0.0 || q.y<0.0) normal=q.x>q.y?float2(sign(p.x-center.x),0.0):float2(0.0,sign(p.y-center.y));
   float2 sampleAt=clamp(center+(p-center)*(1.0-.025*refraction)-normal*sin(rim*1.5708)*refraction*15.0*density,float2(0.0),size-float2(1.0));
   half4 color=scene.eval(sampleAt*.5);
   color.rgb=mix(color.rgb,tone.rgb,tintAmount*(1.0-rim*.35));
   color.rgb+=half3(sin(rim*3.14159)*.045*refraction);
   float gleam=pow(max(0.0,dot(normal,normalize(float2(light*2.0-1.0,-.8)))),8.0);
   float edge=1.0-smoothstep(.0,1.2*density,-distance);
   color.rgb+=half3(edge*(.08+.32*gleam));
   return half4(color.rgb,1.0);
  }
 """) else null
 init {setWillNotDraw(false)}
 override fun onAttachedToWindow(){super.onAttachedToWindow();viewTreeObserver.addOnPreDrawListener(this)}
 override fun onDetachedFromWindow(){viewTreeObserver.removeOnPreDrawListener(this);image?.recycle();scratch?.recycle();image=null;scratch=null;super.onDetachedFromWindow()}
 override fun onPreDraw():Boolean {
  if(capturing||width<=0||height<=0||visibility!=VISIBLE||targetTag==0)return true
  val now=android.os.SystemClock.uptimeMillis()
  if(!isShown||now-lastCapture<66)return true
  lastCapture=now
  val target=rootView.findViewById<View>(targetTag)?:return true
  val w=(width/2).coerceAtLeast(1);val h=(height/2).coerceAtLeast(1)
  if(scratch?.width!=w||scratch?.height!=h){scratch?.recycle();image?.recycle();scratch=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);image=null}
  val bitmap=scratch?:return true;val here=IntArray(2);val there=IntArray(2);getLocationInWindow(here);target.getLocationInWindow(there)
  capturing=true
  try{bitmap.eraseColor(tone);val canvas=Canvas(bitmap);canvas.scale(.5f,.5f);canvas.clipRect(0f,0f,width.toFloat(),height.toFloat());canvas.translate((there[0]-here[0]).toFloat(),(there[1]-here[1]).toFloat());target.draw(canvas)
   if(image==null||!bitmap.sameAs(image)){val previous=image;image=bitmap;scratch=previous?:Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);invalidate()}
  }catch(_:Exception){/* A protected/hardware-only layer keeps the readable tint fallback. */}finally{capturing=false}
  return true
 }
 override fun onDraw(canvas:Canvas){super.onDraw(canvas);val bitmap=image;val radius=minOf(height/2f,24*resources.displayMetrics.density)
  paint.shader=null;paint.color=tone
  if(bitmap!=null){val source=BitmapShader(bitmap,Shader.TileMode.CLAMP,Shader.TileMode.CLAMP)
   if(Build.VERSION.SDK_INT>=33&&effect!=null){effect.setInputShader("scene",source);effect.setFloatUniform("size",width.toFloat(),height.toFloat());effect.setFloatUniform("radius",radius);effect.setFloatUniform("light",light);effect.setFloatUniform("density",resources.displayMetrics.density);effect.setFloatUniform("tintAmount",tintAmount);effect.setFloatUniform("refraction",refraction);effect.setColorUniform("tone",tone);paint.shader=effect}
   else{source.setLocalMatrix(Matrix().apply{setScale(2f,2f)});paint.shader=source}
  }
  canvas.drawRoundRect(0f,0f,width.toFloat(),height.toFloat(),radius,radius,paint)
 }
}
