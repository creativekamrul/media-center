"""Real-device MPV test with silent original WAV and fictional credentials only."""
import importlib.util,io,json,time,threading,wave,urllib.parse,re
from http.server import ThreadingHTTPServer
from pathlib import Path
spec=importlib.util.spec_from_file_location('smoke',Path(__file__).with_name('device-smoke.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
buf=io.BytesIO()
with wave.open(buf,'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes(bytes(48000*4*120))
AUDIO=buf.getvalue()
class Handler(m.Handler):
 def do_POST(self):
  if self.path.endswith('/getSong.view'):
   self.rfile.read(int(self.headers.get('Content-Length','0')))
   data=json.dumps({'subsonic-response':{'status':'ok','song':{'id':'song1','title':'Fixture Song','artist':'Fixture Artist','album':'Fixture Album','duration':120,'coverArt':'cover1'}}}).encode()
   self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data);return
  super().do_POST()
 def do_GET(self):
  if '/stream.view?' not in self.path:self.send_error(404);return
  m.requests.append('stream')
  start=0;end=len(AUDIO)-1;header=self.headers.get('Range','')
  match=re.match(r'bytes=(\d+)-(\d*)',header)
  if match:start=int(match[1]);end=int(match[2]) if match[2] else end
  self.send_response(206 if match else 200);self.send_header('Content-Type','audio/wav');self.send_header('Accept-Ranges','bytes');self.send_header('Content-Length',str(end-start+1))
  if match:self.send_header('Content-Range',f'bytes {start}-{end}/{len(AUDIO)}')
  self.end_headers()
  try:self.wfile.write(AUDIO[start:end+1])
  except (BrokenPipeError,ConnectionResetError):pass

def state():
 value=m.adb('shell','dumpsys','media_session')
 # Assert only the fixture's session. Never print other apps' playback metadata.
 pos=value.find('Media Center');section=value[pos:pos+6500] if pos>=0 else ''
 match=re.search(r'state=PlaybackState \{state=(?:[A-Z_]+\()?(\d+)\)?, position=(\d+)',section)
 return tuple(map(int,match.groups())) if match else None

def main():
 server=ThreadingHTTPServer(('127.0.0.1',m.PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{m.PORT}',f'tcp:{m.PORT}')
 try:
  m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');time.sleep(3)
  m.find('Open menu',40);m.tap('Open menu');m.tap('MC-Native-Fixture');m.tap('Open Fixture Album');m.tap('Open Fixture Song');time.sleep(5)
  assert 'stream' in m.requests,'Native engine did not request original audio'
  first=state();assert first and first[0]==3, 'MediaSession did not confirm playing'
  time.sleep(3);second=state();assert second and second[1]>first[1]+1000,'Native playback position did not advance'
  # A continuously animating seek clock prevents uiautomator's idle detector.
  # Pause through the real Android media-session transport before inspecting UI.
  m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(2);paused=state();assert paused and paused[0]==2,'Pause did not reach MediaSession'
  m.adb('shell','input','swipe','700','2400','700','1300','350');m.tap('+5 sec');time.sleep(2);seek=state();assert seek and abs(seek[1]-paused[1]-5000)<1200,'Relative seek did not synchronize'
  m.tap('Play');m.adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(4);background=state();assert background and background[0]==3 and background[1]>seek[1]+1500,'Background playback failed'
  m.adb('shell','cmd','media_session','dispatch','pause');m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.shot('native-mpv-player')
  print('PASS: embedded MPV original WAV, file-loaded, advancing clock, pause, seek synchronization and background MediaSession.')
 finally:
  server.shutdown();m.adb('reverse','--remove',f'tcp:{m.PORT}')
if __name__=='__main__':main()
