using System.Text.Json;
using System.Runtime.InteropServices;
using Windows.Media;
using Windows.Storage.Streams;
class Host : Form {
 [DllImport("shell32.dll", CharSet=CharSet.Unicode)] static extern int SetCurrentProcessExplicitAppUserModelID(string id);
 readonly SystemMediaTransportControls controls;
 InMemoryRandomAccessStream? artworkStream;
 string lastArt="";
 int revision;
 public Host(){SetCurrentProcessExplicitAppUserModelID("local.mediacenter.desktop");Text="Media Center";ShowInTaskbar=false;Opacity=0;Width=1;Height=1;
 controls=SystemMediaTransportControlsInterop.GetForWindow(Handle);
 controls.IsEnabled=true;controls.IsPlayEnabled=true;controls.IsPauseEnabled=true;controls.IsNextEnabled=true;controls.IsPreviousEnabled=true;controls.IsStopEnabled=true;
 controls.ButtonPressed+=(s,e)=>Send(new {action=e.Button.ToString().ToLowerInvariant()});
 controls.PlaybackPositionChangeRequested+=(s,e)=>Send(new {action="seek",value=e.RequestedPlaybackPosition.TotalSeconds});
 Send(new {ready=true});
 Task.Run(async()=>{try{while(await Console.In.ReadLineAsync() is string line){if(line.Length>6000000)continue;try{var payload=JsonDocument.Parse(line).RootElement.Clone();BeginInvoke(()=>Apply(payload));}catch{}}}finally{BeginInvoke(()=>{controls.IsEnabled=false;Close();Application.ExitThread();});}});
 }
 static void Send(object value){lock(typeof(Host)){Console.WriteLine(JsonSerializer.Serialize(value));}}
 protected override void SetVisibleCore(bool value){base.SetVisibleCore(false);}
 async void Apply(JsonElement data){try{
 int current=revision;string TextValue(string key)=>data.TryGetProperty(key,out var v)?v.GetString()??"":"";
 double Number(string key)=>data.TryGetProperty(key,out var v)?v.GetDouble():0;
 var status=TextValue("status");controls.PlaybackStatus=status=="playing"?MediaPlaybackStatus.Playing:status=="paused"?MediaPlaybackStatus.Paused:MediaPlaybackStatus.Stopped;
 controls.DisplayUpdater.Type=MediaPlaybackType.Music;controls.DisplayUpdater.MusicProperties.Title=TextValue("title");controls.DisplayUpdater.MusicProperties.Artist=TextValue("artist");
 double duration=Math.Max(0,Number("duration")),position=Math.Clamp(Number("position"),0,duration);
 controls.UpdateTimelineProperties(new SystemMediaTransportControlsTimelineProperties{StartTime=TimeSpan.Zero,EndTime=TimeSpan.FromSeconds(duration),MinSeekTime=TimeSpan.Zero,MaxSeekTime=TimeSpan.FromSeconds(duration),Position=TimeSpan.FromSeconds(position)});
 var art=TextValue("art");if(art!=lastArt){lastArt=art;current=++revision;controls.DisplayUpdater.Thumbnail=null;if(art.Length>0){var bytes=Convert.FromBase64String(art);var stream=new InMemoryRandomAccessStream();using(var writer=new DataWriter(stream.GetOutputStreamAt(0))){writer.WriteBytes(bytes);await writer.StoreAsync();}stream.Seek(0);if(current!=revision){stream.Dispose();return;}controls.DisplayUpdater.Thumbnail=RandomAccessStreamReference.CreateFromStream(stream);artworkStream?.Dispose();artworkStream=stream;}}
 controls.DisplayUpdater.Update();
 }catch(Exception e){Send(new {error=e.GetType().Name});}}
 protected override void Dispose(bool disposing){if(disposing){controls.IsEnabled=false;artworkStream?.Dispose();}base.Dispose(disposing);}
}
static class Program {[STAThread] static void Main(string[] args){if(args.Contains("--inspect")){Task.Run(async()=>{var manager=await Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager.RequestAsync();var rows=new List<object>();foreach(var session in manager.GetSessions()){var props=await session.TryGetMediaPropertiesAsync();rows.Add(new {source=session.SourceAppUserModelId,title=props.Title,artist=props.Artist,thumbnail=props.Thumbnail!=null,status=session.GetPlaybackInfo().PlaybackStatus.ToString(),position=session.GetTimelineProperties().Position.TotalSeconds});}Console.WriteLine(JsonSerializer.Serialize(rows));}).GetAwaiter().GetResult();return;}try{ApplicationConfiguration.Initialize();Application.Run(new Host());}catch(Exception e){Console.Error.WriteLine(e.GetType().Name);Environment.ExitCode=1;}}}
