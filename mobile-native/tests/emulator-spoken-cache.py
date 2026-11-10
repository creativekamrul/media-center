"""Original-file book/episode cache regression. Emulator only; fictional source."""
import importlib.util,os,time,re,threading
from pathlib import Path
from http.server import ThreadingHTTPServer
os.environ['ANDROID_SERIAL']='emulator-5554'
s=importlib.util.spec_from_file_location('spoken',Path(__file__).with_name('device-spoken.py'));p=importlib.util.module_from_spec(s);s.loader.exec_module(p);m=p.m
class Handler(p.Handler):
 def do_GET(self):
  if '/file/' in self.path:
   self.path='/audio/cache/0.wav'
  super().do_GET()
oldbook=p.book;oldshow=p.show
p.book=lambda:{**oldbook(),'media':{**oldbook()['media'],'tracks':[{'ino':str(i),'startOffset':i*60,'duration':60} for i in range(2)]}}
p.show=lambda expanded=False:{**oldshow(expanded),'media':{**oldshow(expanded)['media'],**({'episodes':[{'id':'ep1','title':'Fixture Episode','audioFile':{'ino':'ep-file','duration':60}}]} if expanded else {})}}
def labels():return [n.get('text') or n.get('content-desc') for n in m.nodes() if n.get('text') or n.get('content-desc')]
def scroll(label):
 for _ in range(12):
  for n in m.nodes():
   if label in (n.get('text'),n.get('content-desc')):
    b=list(map(int,re.findall(r'\d+',n.get('bounds'))))
    if 150<b[1]<2050 and b[3]<2200:return
  m.adb('shell','input','swipe','540','1800','540','850','220')
 raise AssertionError(label)
def enter(label,value):
 scroll(label);m.tap(label,editable=True);m.adb('shell','input','keyevent','KEYCODE_MOVE_END');m.adb('shell','input','keyevent',*(['KEYCODE_DEL']*80));m.adb('shell','input','text',value);m.adb('shell','input','keyevent','KEYCODE_BACK')
server=ThreadingHTTPServer(('127.0.0.1',p.PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{p.PORT}',f'tcp:{p.PORT}')
try:
 if not os.environ.get('REUSE_SPOKEN_CACHE_FIXTURE'):
  
  if not os.environ.get('FIXTURE_FORM_OPEN'):scroll('Add Audiobookshelf');m.tap('Add Audiobookshelf')
  enter('Name','MC-Offline-Fixture');enter('Server URL',f'http://127.0.0.1:{p.PORT}');enter('API key','fixture-token');scroll('Allow unencrypted HTTP');n=next(n for n in m.nodes() if n.get('class')=='android.widget.Switch');b=list(map(int,re.findall(r'\d+',n.get('bounds'))));m.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));scroll('Test & save');m.tap('Test & save');m.find('Connection tested and saved.',30);m.tap('Back')
 if not os.environ.get('EPISODE_ONLY'):
  m.tap('Library');scroll('Fixture Books');m.tap('Fixture Books');m.tap('Open Fixture Book');scroll('Cache book');m.tap('Cache book');time.sleep(7);scroll('Play / resume book');m.tap('Play / resume book');time.sleep(4);m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(2)
  assert p.p.state()[0] in (2,3),p.p.state()
  slider=m.find('Seek');b=list(map(int,re.findall(r'\d+',slider.get('bounds'))));m.adb('shell','input','tap',str(int(b[0]+(b[2]-b[0])*.75)),str((b[1]+b[3])//2));time.sleep(2)
  assert 83000<p.p.state()[1]<97000,p.p.state();assert not p.progress,'Cached playback unexpectedly created server progress';m.shot('v1-offline-book');print('PASS cached original multi-file book, whole-book seek, local checkpoint',flush=True)
 if not os.environ.get('EPISODE_ONLY'):m.tap('Back');m.tap('Back');m.tap('Back')
 scroll('Fixture Podcasts');m.tap('Fixture Podcasts');m.tap('Open Fixture Show');scroll('Actions for Fixture Episode');m.tap('Actions for Fixture Episode');m.tap('Cache episode on this phone');time.sleep(6);m.tap('Open Fixture Episode');time.sleep(3);m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(2);assert p.p.state()[1]<15000,p.p.state();assert not p.progress;m.shot('v1-offline-episode');print('PASS cached episode has independent progress',flush=True)
finally:server.shutdown();server.server_close()
