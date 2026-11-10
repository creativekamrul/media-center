"""Emulator regression. Requires the explicitly named MC-Native-Fixture test connection."""
import importlib.util,threading,time,os,re
from pathlib import Path
from http.server import ThreadingHTTPServer
os.environ['ANDROID_SERIAL']='emulator-5554'
spec=importlib.util.spec_from_file_location('p',Path(__file__).with_name('device-playback.py'));p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p);m=p.m
server=ThreadingHTTPServer(('127.0.0.1',m.PORT),p.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{m.PORT}',f'tcp:{m.PORT}')
try:
 m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Open menu',40);m.tap('Open menu');m.tap('MC-Native-Fixture');m.tap('Open Fixture Album');m.tap('Open Fixture Song');time.sleep(5)
 assert p.state() and p.state()[0]==3,p.state()
 m.adb('shell','cmd','media_session','dispatch','pause');time.sleep(2);m.shot('mobile-player-fixed')
 labels=[n.get('content-desc','') for n in m.nodes()]
 assert all(x in labels for x in ['Seek','Play','Open queue','Open lyrics'])
 assert not any(n.get('scrollable')=='true' for n in m.nodes()),'Main player scrolls'
 m.tap('Open queue');m.find('Queue');m.shot('mobile-player-queue');m.adb('shell','input','keyevent','KEYCODE_BACK');m.find('Open queue')
 m.tap('Playback options');m.find('+5 sec');before=p.state()[1];m.tap('+5 sec');time.sleep(1);assert abs(p.state()[1]-before-5000)<1200
 m.tap('Close panel');m.shot('mobile-player-fixed');print('PASS: native playback, fixed player, queue sheet, Back dismissal, options seek',flush=True)
finally:
 server.shutdown();m.adb('reverse','--remove',f'tcp:{m.PORT}')
