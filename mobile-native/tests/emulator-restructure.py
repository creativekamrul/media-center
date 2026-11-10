"""Emulator-only API-key and partial-outage regression; uses fictional fixture accounts."""
import importlib.util,os,re,threading,time,sys
from pathlib import Path
from http.server import ThreadingHTTPServer
os.environ['ANDROID_SERIAL']='emulator-5554'
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,Path('mobile-native/tests')/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
p=module('spoken','device-spoken.py');music=module('music','device-playback.py');m=p.m
login_calls=[]
class Abs(p.Handler):
 def do_POST(self):
  if self.path=='/login':login_calls.append(1)
  super().do_POST()
class Music(music.Handler):
 unavailable=False
 def do_POST(self):
  if self.unavailable:
   time.sleep(15);self.send_error(503);return
  super().do_POST()
servers=[ThreadingHTTPServer(('127.0.0.1',p.PORT),Abs),ThreadingHTTPServer(('127.0.0.1',m.PORT),Music)]
for server in servers:threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{server.server_port}',f'tcp:{server.server_port}')
def scroll(label):
 for _ in range(10):
  try:
   node=m.find(label,1);bounds=list(map(int,re.findall(r"\d+",node.get("bounds"))));
   if bounds[1]>=240 and bounds[3]<=2000:return node
   m.adb('shell','input','swipe','540','1750','540','900','250')
  except AssertionError:m.adb('shell','input','swipe','540','1850','540','750','250')
 raise AssertionError(label)
def enter(label,value):
 scroll(label);m.tap(label,editable=True);m.adb('shell','input','keyevent','KEYCODE_MOVE_END');m.adb('shell','input','keyevent',*(['KEYCODE_DEL']*80));m.adb('shell','input','text',value);m.adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(.3)
def start():
 m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Menu',40)
def add(kind,name,port):
 start();m.tap('Menu');m.tap('Settings');scroll('Add '+kind);m.tap('Add '+kind);enter('Name',name);enter('Server URL',f'http://127.0.0.1:{port}')
 if kind=='Audiobookshelf':enter('API key','fixture-token')
 else:enter('Username','fixture-user');enter('Password','fixture-secret')
 scroll('Allow unencrypted HTTP');node=next(n for n in m.nodes() if n.get('class')=='android.widget.Switch');x1,y1,x2,y2=map(int,re.findall(r'\d+',node.get('bounds')));m.adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));scroll('Test & save');m.tap('Test & save');scroll('Connection tested and saved.')
try:
 if '--resume' not in sys.argv:
  add('Audiobookshelf','MC-ABS-Fixture',p.PORT);assert not login_calls,'API key unexpectedly used password login';print('PASS API-key validation without password login',flush=True)
  add('Navidrome','MC-Native-Fixture',m.PORT)
 start();scroll('Open Fixture Album');m.shot('mobile-home-restructured');m.tap('Open Fixture Album');scroll('Open Fixture Song');m.shot('mobile-album-restructured');m.tap('Open Fixture Song');time.sleep(4);assert music.state()[0]==3,music.state();m.adb('shell','cmd','media_session','dispatch','pause');m.shot('mobile-player-restructured');print('PASS music playback through concurrent I/O',flush=True)
 # A disconnected source must leave healthy shelves and navigation usable.
 Music.unavailable=True;started=time.monotonic();start();scroll('Open Fixture Book');assert time.monotonic()-started<15,'Healthy library waited for the unavailable server';m.shot('mobile-home-partial-outage');m.tap('Library');m.find('MC-ABS-Fixture');m.shot('mobile-library-restructured');m.tap('Books & podcasts');m.tap('Open Fixture Books');m.tap('Open Fixture Book');m.tap('Play / resume book');time.sleep(3);assert music.state()[0]==3;print('PASS healthy book playback with another source offline',flush=True)
 m.adb('shell','cmd','media_session','dispatch','pause');m.tap('Lock controls');m.find('Unlock controls');m.tap('Unlock controls');m.tap('Playback options');m.shot('mobile-book-options');print('PASS long-form lock controls',flush=True)
finally:
 for server in servers:server.shutdown();server.server_close()
