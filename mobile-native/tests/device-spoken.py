"""Audiobookshelf contract/device regression using fictional books and episodes."""
import importlib.util,io,json,re,threading,time,wave,urllib.parse
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
spec=importlib.util.spec_from_file_location('p',Path(__file__).with_name('device-playback.py'));p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p);m=p.m
PORT=18543;streams=[];progress=[]
buffer=io.BytesIO()
with wave.open(buffer,'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes(bytes(48000*4*60))
AUDIO=buffer.getvalue()
def book():return {'id':'book1','mediaType':'book','media':{'metadata':{'title':'Fixture Book','authorName':'Fixture Author'},'duration':120,'chapters':[{'title':'Spanning chapter','start':30,'end':90}]}}
def show(expanded=False):return {'id':'show1','mediaType':'podcast','media':{'metadata':{'title':'Fixture Show','author':'Fixture Host'},**({'episodes':[{'id':'ep1','title':'Fixture Episode','audioFile':{'duration':60}}]} if expanded else {})}}
class Handler(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def reply(self,data,status=200):
  b=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def do_POST(self):
  body=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))) or '{}')
  if self.path=='/login':
   assert self.headers.get('x-return-tokens')=='true'
   return self.reply({'user':{'accessToken':'fixture-token','refreshToken':'fixture-refresh'}} if body.get('password')=='fixture-secret' else {},200 if body.get('password')=='fixture-secret' else 401)
  if self.headers.get('Authorization')!='Bearer fixture-token':return self.reply({},401)
  if self.path.startswith('/api/session/'):
   progress.append((self.path,body));return self.reply({})
  assert body['forceDirectPlay'] is True and body['mediaPlayer']=='mpv'
  episode=self.path=='/api/items/show1/play/ep1';assert episode or self.path=='/api/items/book1/play'
  self.reply({'id':'episode-session' if episode else 'book-session','currentTime':7 if episode else 10,'duration':60 if episode else 120,'playMethod':0,'audioTracks':[{'index':i,'startOffset':i*60,'duration':60,'contentUrl':f'/audio/{"episode" if episode else "book"}/{i}.wav'} for i in range(1 if episode else 2)]})
 def do_GET(self):
  if self.headers.get('Authorization')!='Bearer fixture-token':return self.reply({},401)
  path=urllib.parse.urlsplit(self.path).path
  if path.startswith('/audio/'):
   streams.append(path);start=0;end=len(AUDIO)-1;match=re.match(r'bytes=(\d+)-(\d*)',self.headers.get('Range',''))
   if match:start=int(match[1]);end=int(match[2]) if match[2] else end
   self.send_response(206 if match else 200);self.send_header('Content-Type','audio/wav');self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes')
   if match:self.send_header('Content-Range',f'bytes {start}-{end}/{len(AUDIO)}')
   self.end_headers()
   try:self.wfile.write(AUDIO[start:end+1])
   except (ConnectionResetError,BrokenPipeError):pass
  elif path=='/api/me':self.reply({'id':'fixture-user'})
  elif path=='/api/libraries':self.reply({'libraries':[{'id':'books','name':'Fixture Books','mediaType':'book'},{'id':'pods','name':'Fixture Podcasts','mediaType':'podcast'}]})
  elif path=='/api/libraries/books/items':self.reply({'results':[book()],'total':1})
  elif path=='/api/libraries/pods/items':self.reply({'results':[show()],'total':1})
  elif path=='/api/items/book1':self.reply(book())
  elif path=='/api/items/show1':self.reply(show(True))
  else:self.reply({},404)
def main():
 server=ThreadingHTTPServer(('127.0.0.1',PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{PORT}',f'tcp:{PORT}')
 try:
  m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Open menu',40);m.tap('Open menu');m.tap('MC-ABS-Fixture');m.tap('Books & podcasts')
  m.tap('Open Fixture Books');m.tap('Open Fixture Book');
  for _ in range(5):
   if any(n.get('text')=='Play / resume book' for n in m.nodes()):break
   m.adb('shell','input','swipe','540','1800','540','800','300')
  m.tap('Play / resume book');time.sleep(3);assert p.state()[0]==3
  m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(1)
  slider=m.find('Seek');x1,y1,x2,y2=map(int,re.findall(r'\d+',slider.get('bounds')))
  m.adb('shell','input','tap',str(int(x1+(x2-x1)*.75)),str((y1+y2)//2));time.sleep(2)
  assert '/audio/book/1.wav' in streams,'Seek did not select the second physical file'
  assert 83000<p.state()[1]<97000,'Seek did not retain whole-book time'
  m.tap('Back');m.tap('Back');m.tap('Back');m.tap('Open Fixture Podcasts');m.tap('Open Fixture Show');m.tap('Open Fixture Episode');time.sleep(3)
  assert '/audio/episode/0.wav' in streams;assert 7000<p.state()[1]<15000,'Episode reused the book timeline'
  m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(2)
  assert any('book-session' in path and body['currentTime']>80 for path,body in progress)
  assert any('episode-session' in path and body['currentTime']<15 for path,body in progress)
  print('PASS: explicit book/podcast types, expanded episodes, original audio, cross-file whole-book seek and isolated server progress.')
 finally:server.shutdown();m.adb('reverse','--remove',f'tcp:{PORT}')
if __name__=='__main__':main()
