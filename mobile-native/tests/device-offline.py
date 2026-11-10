"""Uses the explicitly selected MediaCenterFixture folder; never real media."""
import importlib.util,threading,time,subprocess,hashlib,posixpath,shlex
from pathlib import Path
from http.server import ThreadingHTTPServer
spec=importlib.util.spec_from_file_location('play',Path(__file__).with_name('device-playback.py'));p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p);m=p.m
ROOT='/sdcard/MediaCenterFixture'
def main():
 server=ThreadingHTTPServer(('127.0.0.1',m.PORT),p.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();m.adb('reverse',f'tcp:{m.PORT}',f'tcp:{m.PORT}')
 try:
  m.adb('shell','am','force-stop',m.PACKAGE);m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity');m.find('Open menu',40)
  m.tap('Open menu');m.tap('MC-Native-Fixture');m.tap('Open Fixture Album');m.tap('Download');m.find('Saved 1 original file and a portable playlist',35)
  # Verify file bytes and relative, UTF-8 playlist paths independently of the app.
  playlist=m.adb('shell','cat',shlex.quote(ROOT+'/Playlists/Fixture Album.m3u8'))
  assert playlist.startswith('#EXTM3U\n'),'Playlist must contain real line breaks'
  lines=[line for line in playlist.splitlines() if line and not line.startswith('#')];assert len(lines)==1
  audio=posixpath.normpath(ROOT+'/Playlists/'+lines[0]);assert audio.startswith(ROOT+'/Music/')
  actual=subprocess.check_output([m.ADB,'exec-out','cat',audio]);assert hashlib.sha256(actual).digest()==hashlib.sha256(p.AUDIO).digest(),'Original audio bytes changed'
  server.shutdown();m.adb('reverse','--remove',f'tcp:{m.PORT}')
  m.tap('Play');time.sleep(4);state=p.state();assert state and state[0]==3,'Offline audio did not play without its server'
  m.adb('shell','cmd','media_session','dispatch','pause')
  print('PASS: original bytes, portable relative M3U8, and local MPV playback with fixture server disconnected.')
 finally:
  server.shutdown()
  try:m.adb('reverse','--remove',f'tcp:{m.PORT}')
  except subprocess.CalledProcessError:pass
if __name__=='__main__':main()
