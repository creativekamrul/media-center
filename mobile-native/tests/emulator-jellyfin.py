"""Fictional Jellyfin 10.11.11 contract and original-video playback on emulator only."""
import os,importlib.util,threading,time,json,struct,io,re,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from PIL import Image,ImageDraw
os.environ['ANDROID_SERIAL']='emulator-5554'
spec=importlib.util.spec_from_file_location('m',Path(__file__).with_name('device-smoke.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
PORT=18545;calls=[];reports=[]
def chunk(tag,data):return tag+struct.pack('<I',len(data))+data+(b'\0' if len(data)%2 else b'')
def group(tag,data):return chunk(b'LIST',tag+data)
def movie():
 frames=[]
 for i in range(120):
  im=Image.new('RGB',(320,180),(15,40,80));d=ImageDraw.Draw(im);d.rectangle((i*2,60,i*2+50,110),fill=(90,230,180));d.text((20,20),'MEDIA CENTER VIDEO FIXTURE',fill='white');out=io.BytesIO();im.save(out,'JPEG');frames.append(out.getvalue())
 avih=struct.pack('<14I',100000,0,0,16,120,0,1,max(map(len,frames)),320,180,0,0,0,0)
 strh=struct.pack('<4s4sIHHIIIIIIIIhhhh',b'vids',b'MJPG',0,0,0,0,1,10,0,120,max(map(len,frames)),0xffffffff,0,0,0,320,180)
 strf=struct.pack('<IiiHH4sIiiII',40,320,180,1,24,b'MJPG',320*180*3,0,0,0,0)
 data=b'';index=b'';offset=4
 for f in frames:
  c=chunk(b'00dc',f);index+=struct.pack('<4sIII',b'00dc',16,offset,len(f));data+=c;offset+=len(c)
 body=b'AVI '+group(b'hdrl',chunk(b'avih',avih)+group(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))+group(b'movi',data)+chunk(b'idx1',index)
 return chunk(b'RIFF',body)
VIDEO=movie()
ITEM={'Id':'movie1','Name':'Fixture Movie','Type':'Movie','RunTimeTicks':120000000,'Overview':'A generated test pattern, not user media.','UserData':{'PlaybackPositionTicks':20000000}}
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def send(self,data,status=200,mime='application/json'):
  b=json.dumps(data).encode() if mime=='application/json' else data;self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_POST(self):
  body=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))) or '{}');calls.append(self.path)
  if self.path=='/Users/AuthenticateByName':
   assert body=={'Username':'fixture-user','Pw':'fixture-secret'};self.send({'AccessToken':'fixture-token','User':{'Id':'user1'}})
  elif self.path.startswith('/Sessions/Playing'):reports.append((self.path,body));self.send({})
  else:self.send({},404)
 def do_GET(self):
  path=urllib.parse.urlparse(self.path).path;calls.append(path)
  if path=='/System/Info/Public':self.send({'Version':'10.11.11'});return
  assert 'fixture-token' in (self.headers.get('Authorization','')+self.headers.get('X-Emby-Token',''))
  if path=='/Users/Me':self.send({'Id':'user1'})
  elif path=='/Users/user1/Views':self.send({'Items':[{'Id':'movies','Name':'Fixture Cinema','Type':'CollectionFolder'}]})
  elif path=='/Items' or path.endswith('/Resume'):self.send({'Items':[ITEM],'TotalRecordCount':1})
  elif path=='/Users/user1/Items/movie1':self.send(ITEM)
  elif path=='/Items/movie1/PlaybackInfo':self.send({'PlaySessionId':'session1','MediaSources':[{'Id':'source1','Protocol':'File','Container':'avi'}]})
  elif '/Images/Primary' in path:
   self.send((Path('src/renderer/public/assets/prints/v1/tide-0.jpg')).read_bytes(),mime='image/jpeg')
  elif path=='/Videos/movie1/stream':
   assert urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('Static')==['true'];self.send(VIDEO,mime='video/x-msvideo')
  else:self.send({},404)
def scroll(label):
 for _ in range(12):
  try:
   n=m.find(label,1);b=list(map(int,re.findall(r'\d+',n.get('bounds'))))
   if b[1]>150 and b[3]<2100:return n
  except AssertionError:pass
  m.adb('shell','input','swipe','540','1800','540','800','220')
 raise AssertionError(label)
def enter(label,value):
 scroll(label);m.tap(label,editable=True);m.adb('shell','input','keyevent','KEYCODE_MOVE_END');m.adb('shell','input','keyevent',*(['KEYCODE_DEL']*80));m.adb('shell','input','text',value);m.adb('shell','input','keyevent','KEYCODE_BACK')
server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{PORT}',f'tcp:{PORT}')
try:
 m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Menu',40)
 if not os.environ.get('REUSE_JELLYFIN_FIXTURE'):
  m.tap('Menu');m.tap('Settings');scroll('Add Jellyfin');m.tap('Add Jellyfin');enter('Name','MC-Jellyfin-Fixture');enter('Server URL',f'http://127.0.0.1:{PORT}');enter('Username','fixture-user');enter('Password','fixture-secret');scroll('Allow unencrypted HTTP');m.tap('Allow unencrypted HTTP');scroll('Test & save');m.tap('Test & save');scroll('Connection tested and saved.');m.tap('Back')
 m.tap('Library');scroll('Movies, series & music');m.tap('Movies, series & music');m.tap('Open Fixture Cinema');m.tap('Open Fixture Movie');scroll('Resume');m.tap('Resume');time.sleep(4)
 
 for n in m.nodes():
  if n.get('text')=='Got it':
   b=list(map(int,re.findall(r'\d+',n.get('bounds'))));m.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
 m.shot('jellyfin-native-video');assert '/Videos/movie1/stream' in calls,'No original video requested';assert any(p=='/Sessions/Playing' for p,b in reports),'No file-loaded session start'
 
 try:m.tap('Pause')
 except AssertionError:pass
 m.tap('-5s');m.tap('+5s');time.sleep(1);assert any(b.get('PositionTicks',0)>=65000000 for p,b in reports),'Seek failed to report absolute position';n=m.find('Video position');b=list(map(int,re.findall(r'\d+',n.get('bounds'))));m.adb('shell','input','tap',str(b[0]+int((b[2]-b[0])*.72)),str((b[1]+b[3])//2));time.sleep(1);assert any(80000000<=body.get('PositionTicks',0)<=100000000 for path,body in reports),'Absolute scrub position not synchronized';m.shot('jellyfin-native-video');m.tap('CC');m.adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(1)
 print('PASS Jellyfin login, libraries, details, original native MPV video, resume and 5-second seek',flush=True)
finally:server.shutdown();server.server_close()
