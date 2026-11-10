"""Exercise real onEndReached requests against 93 fictional tracks."""
import importlib.util,json,threading,time,urllib.parse
from pathlib import Path
from http.server import ThreadingHTTPServer
spec=importlib.util.spec_from_file_location('smoke',Path(__file__).with_name('device-smoke.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
offsets=[]
class Handler(m.Handler):
 def do_POST(self):
  if not self.path.endswith('/search3.view'):return super().do_POST()
  fields=urllib.parse.parse_qs(self.rfile.read(int(self.headers.get('Content-Length','0'))).decode());offset=int(fields.get('songOffset',['0'])[0]);offsets.append(offset)
  rows=[{'id':f'song{i}','title':f'Fixture Track {i:03}','artist':'Fixture Artist','duration':120} for i in range(offset+1,min(offset+40,93)+1)]
  data=json.dumps({'subsonic-response':{'status':'ok','searchResult3':{'song':rows}}}).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
def main():
 server=ThreadingHTTPServer(('127.0.0.1',m.PORT),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{m.PORT}',f'tcp:{m.PORT}')
 try:
  m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Open menu',40)
  m.tap('Open menu');m.tap('MC-Native-Fixture');m.tap('Tracks');m.find('Open Fixture Track 001')
  reached=False
  for _ in range(20):
   m.adb('shell','input','swipe','700','2450','700','700','350');time.sleep(.25)
   if any(n.get('content-desc')=='Open Fixture Track 093' for n in m.nodes()):reached=True;break
  assert reached,'Last track never loaded'
  assert offsets==[0,40,80],f'Unexpected paging requests: {offsets}'
  m.adb('shell','input','keyevent','KEYCODE_BACK');m.find('Home')
  print('PASS: 93 real list rows, automatic offsets 0/40/80, no duplicate requests, and Android Back returns Home.')
 finally:server.shutdown();m.adb('reverse','--remove',f'tcp:{m.PORT}')
if __name__=='__main__':main()
