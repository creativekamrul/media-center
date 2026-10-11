using System.Runtime.InteropServices;
using System.Text.Json;

// A true child HWND, owned by the Electron window. No top-level video window.
sealed class VideoHost : Form {
 [DllImport("user32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateWindowEx(uint ex,string cls,string title,uint style,int x,int y,int w,int h,IntPtr parent,IntPtr menu,IntPtr instance,IntPtr param);
 [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr hwnd,IntPtr after,int x,int y,int w,int h,uint flags);
 [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd,int cmd);
 [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr hwnd);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd,System.Text.StringBuilder value,int size);
 delegate bool EnumWindow(IntPtr hwnd,IntPtr param);
 [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent,EnumWindow callback,IntPtr param);
 [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd,out Rect rect);
 [StructLayout(LayoutKind.Sequential)] struct Rect {public int Left,Top,Right,Bottom;}
 public static void Inspect(IntPtr parent){var rows=new List<object>();EnumChildWindows(parent,(hwnd,param)=>{var cls=new System.Text.StringBuilder(256);GetClassName(hwnd,cls,256);GetWindowRect(hwnd,out var rect);rows.Add(new {handle=hwnd.ToInt64().ToString(),parent=GetParent(hwnd).ToInt64().ToString(),kind=cls.ToString(),regionKind=RegionKind(hwnd),visible=IsWindowVisible(hwnd),x=rect.Left,y=rect.Top,width=rect.Right-rect.Left,height=rect.Bottom-rect.Top});return true;},IntPtr.Zero);Console.WriteLine(JsonSerializer.Serialize(rows));}
 [DllImport("gdi32.dll")] static extern IntPtr CreateRectRgn(int left,int top,int right,int bottom);
 [DllImport("gdi32.dll")] static extern int CombineRgn(IntPtr dest,IntPtr a,IntPtr b,int mode);
 [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr obj);
 [DllImport("user32.dll")] static extern int GetWindowRgn(IntPtr hwnd,IntPtr region);
 static int RegionKind(IntPtr hwnd){var r=CreateRectRgn(0,0,0,0);try{return GetWindowRgn(hwnd,r);}finally{DeleteObject(r);}}
 [DllImport("user32.dll")] static extern int SetWindowRgn(IntPtr hwnd,IntPtr region,bool redraw);
 readonly IntPtr surface;
 public VideoHost(IntPtr parent){
  _=Handle;ShowInTaskbar=false;
  if(!IsWindow(parent))throw new InvalidOperationException("Invalid parent window");
  surface=CreateWindowEx(0,"STATIC","Media Center video",0x40000000|0x02000000|0x04000000,0,0,1,1,parent,IntPtr.Zero,IntPtr.Zero,IntPtr.Zero);
  if(surface==IntPtr.Zero)throw new InvalidOperationException("Cannot create video surface");
  Console.WriteLine(JsonSerializer.Serialize(new {handle=unchecked((uint)surface.ToInt64()).ToString()}));
  Task.Run(async()=>{try{while(await Console.In.ReadLineAsync() is string line){if(line.Length>2048)continue;try{var data=JsonDocument.Parse(line).RootElement.Clone();BeginInvoke(()=>Apply(data));}catch{}}}finally{BeginInvoke(()=>{Close();Application.ExitThread();});}});
 }
 protected override void SetVisibleCore(bool value){base.SetVisibleCore(false);}
 void Apply(JsonElement data){try{
  if(!data.GetProperty("visible").GetBoolean()){ShowWindow(surface,0);return;}
  int N(string key)=>Math.Clamp(data.GetProperty(key).GetInt32(),0,32768);
  // Clip the native child beneath HTML controls without moving/resizing the picture.
  if(data.TryGetProperty("occlusions",out var clips)&&clips.GetArrayLength()>0){
   var region=CreateRectRgn(0,0,N("width"),N("height"));
   foreach(var clip in clips.EnumerateArray()){
   int C(string key)=>Math.Clamp(clip.GetProperty(key).GetInt32(),-65536,65536);
   var hole=CreateRectRgn(C("x"),C("y"),C("x")+C("width"),C("y")+C("height"));
   CombineRgn(region,region,hole,4);DeleteObject(hole);
   }
   if(SetWindowRgn(surface,region,true)==0)DeleteObject(region);
  }else SetWindowRgn(surface,IntPtr.Zero,true);
  SetWindowPos(surface,IntPtr.Zero,N("x"),N("y"),Math.Max(1,N("width")),Math.Max(1,N("height")),0x0010|0x0040);
 }catch{ShowWindow(surface,0);}}
 protected override void Dispose(bool disposing){if(surface!=IntPtr.Zero)DestroyWindow(surface);base.Dispose(disposing);}
}
