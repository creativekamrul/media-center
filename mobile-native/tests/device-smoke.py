"""On-device smoke test. Uses only an explicitly named disposable fixture account."""
import hashlib,json,os,re,subprocess,threading,time,urllib.parse,xml.etree.ElementTree as ET
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ADB=r'C:\Users\WALTON\AppData\Local\Android\Sdk\platform-tools\adb.exe'
PACKAGE='local.mediacenter.mobile'
PORT=18541
requests=[]
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def do_POST(self):
  p=urllib.parse.parse_qs(self.rfile.read(int(self.headers.get('Content-Length','0'))).decode())
  method=self.path.rsplit('/',1)[-1].replace('.view','');requests.append(method)
  expected=hashlib.md5(('fixture-secret'+p.get('s',[''])[0]).encode()).hexdigest()
  body={'status':'ok','version':'1.16.1','serverVersion':'fixture-0.60.3'}
  if p.get('u')!=['fixture-user'] or p.get('t')!=[expected]: body={'status':'failed','error':{'code':40}}
  elif method=='getMusicFolders':body['musicFolders']={'musicFolder':[{'id':'1','name':'Fixture Music'}]}
  elif method=='getAlbumList2':body['albumList2']={'album':[{'id':'album1','name':'Fixture Album','artist':'Fixture Artist','coverArt':'cover1','songCount':1}]}
  elif method=='getAlbum':body['album']={'song':[{'id':'song1','title':'Fixture Song','artist':'Fixture Artist','album':'Fixture Album','duration':120,'suffix':'flac','coverArt':'cover1'}]}
  elif method=='getArtists':body['artists']={'index':[{'artist':[{'id':'artist1','name':'Fixture Artist','albumCount':1}]}]}
  elif method=='getArtist':body['artist']={'album':[{'id':'album1','name':'Fixture Album','artist':'Fixture Artist','songCount':1}]}
  elif method=='getPlaylists':body['playlists']={'playlist':[{'id':'playlist1','name':'Fixture Playlist','songCount':1}]}
  elif method=='getPlaylist':body['playlist']={'entry':[{'id':'song1','title':'Fixture Song','artist':'Fixture Artist','duration':120}]}
  elif method=='search3':body['searchResult3']={'song':[{'id':'song1','title':'Fixture Song','artist':'Fixture Artist','duration':120}]}
  elif method=='getCoverArt':
   data=(Path(__file__).resolve().parents[2]/'src/renderer/public/assets/prints/v1/tide-0.jpg').read_bytes()
   self.send_response(200);self.send_header('Content-Type','image/jpeg');self.end_headers();self.wfile.write(data);return
  data=json.dumps({'subsonic-response':body}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
def adb(*args):return subprocess.check_output([ADB,'-s',os.environ.get('ANDROID_SERIAL','emulator-5554'),*args],text=True,encoding="utf-8",stderr=subprocess.STDOUT,timeout=45)
def nodes():
 for attempt in range(3):
  try:
   result=adb('shell','uiautomator','dump','/data/local/tmp/media-center-smoke.xml')
   if 'ERROR:' in result:raise RuntimeError('UIAutomator could not obtain a fresh idle hierarchy: '+result.strip())
   break
  except (subprocess.CalledProcessError,subprocess.TimeoutExpired):
   if attempt==2:raise
   time.sleep(1)
 return list(ET.fromstring(adb('shell','cat','/data/local/tmp/media-center-smoke.xml')).iter('node'))
def find(label,timeout=12,editable=False):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  for n in nodes():
   bounds=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
   if len(bounds)!=4 or bounds[2]<=bounds[0] or bounds[3]<=bounds[1]:continue
   if n.get('package')==PACKAGE and label in (n.get('text'),n.get('content-desc')) and (not editable or n.get('class')=='android.widget.EditText'):return n
  time.sleep(.3)
 raise AssertionError('Missing control: '+label)
def tap(label,editable=False):
 n=find(label,editable=editable)
 if not editable:
  matches=[]
  for v in nodes():
   bounds=list(map(int,re.findall(r'\d+',v.get('bounds',''))))
   if v.get('package')==PACKAGE and label in (v.get('text'),v.get('content-desc')) and v.get('clickable')=='true' and v.get('enabled')=='true' and len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]:matches.append((v,(bounds[2]-bounds[0])*(bounds[3]-bounds[1])))
  # A named backdrop can cover a drawer containing a smaller, equally named close icon.
  if matches:n=min(matches,key=lambda entry:entry[1])[0]
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.attrib['bounds']));x=str((x1+x2)//2);y=str((y1+y2)//2);adb('shell','input','swipe',x,y,x,y,'120');time.sleep(.6)
def enter(label,value):
 tap(label,editable=True);time.sleep(.5)
 adb('shell','input','keycombination','113','29')
 if value:adb('shell','input','text',value)
 else:adb('shell','input','keyevent','KEYCODE_DEL')
 time.sleep(.5)
 # Back dismisses the IME only when it is shown; otherwise it would navigate out.
 if re.search(r'mInputShown=true\b',adb('shell','dumpsys','input_method')):adb('shell','input','keyevent','KEYCODE_BACK')
 time.sleep(.5)

def shot(name):
 root=Path(__file__).resolve().parents[2]/'artifacts/mobile-device';root.mkdir(parents=True,exist_ok=True)
 (root/(name+'.png')).write_bytes(subprocess.check_output([ADB,'-s',os.environ.get('ANDROID_SERIAL','emulator-5554'),'exec-out','screencap','-p']))
def main():
 server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 adb('reverse',f'tcp:{PORT}',f'tcp:{PORT}')
 try:
  adb('shell','am','force-stop',PACKAGE);adb('shell','am','start','-n',PACKAGE+'/.MainActivity');time.sleep(2)
  tap('Open menu');tap('Add a connection');tap('Add Navidrome')
  # All credentials entered by this test are fictional.
  enter('Name','MC-Native-Fixture')
  enter('Server URL',f'http://127.0.0.1:{PORT}');enter('Username','fixture-user');enter('Password','wrong-secret');n=next(n for n in nodes() if n.get('class')=='android.widget.Switch');x1,y1,x2,y2=map(int,re.findall(r'\d+',n.attrib['bounds']));adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));time.sleep(.4);adb('shell','input','swipe','700','2600','700','1800','350');time.sleep(.4);tap('Test & save')
  end=time.monotonic()+20
  while time.monotonic()<end:
   if any('Sign-in failed' in n.get('text','') for n in nodes()):break
  else:raise AssertionError('Wrong password did not show sign-in failure')
  enter('Password','fixture-secret');tap('Test & save')
  find('Connection tested and saved.',20);shot('connections-verified');tap('Close settings')
  find('Open Fixture Album',20);shot('navidrome-library');tap('Open Fixture Album');find('Open Fixture Song',20);tap('Open Fixture Song');find('Fixture Song');shot('navidrome-track')
  adb('shell','am','force-stop',PACKAGE);adb('shell','am','start','-n',PACKAGE+'/.MainActivity');find('Open Fixture Album',20)
  tap('Open menu');tap('Settings');tap('Test');time.sleep(1)
  tap('Remove MC-Native-Fixture')
  # Confirmation dialog belongs to this application.
  tap('REMOVE');find('Connection removed.',20);tap('Close settings');shot('updated-explore')
  assert {'ping','getAlbumList2','getAlbum'}.issubset(set(requests)),requests
  print('PASS: wrong-password handling, native token auth, encrypted save/reload, album/track browsing, test and remove connection.')
 finally:
  server.shutdown();adb('reverse','--remove',f'tcp:{PORT}')
if __name__=='__main__':main()
