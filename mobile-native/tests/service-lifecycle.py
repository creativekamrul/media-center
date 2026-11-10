"""Real Android service restart, generated originals, dedicated QA AVD/test UID only."""
import hashlib,json,os,struct,subprocess,time,urllib.request,xml.etree.ElementTree as ET
from pathlib import Path
ADB=r'C:\Users\WALTON\AppData\Local\Android\Sdk\platform-tools\adb.exe'
SERIAL='emulator-5556';PACKAGE='local.mediacenter.library.test'
ROOT=Path(__file__).resolve().parents[2];REPORTS=ROOT/'artifacts/mobile-native-tests'
def adb(*args,binary=False):
 result=subprocess.check_output([ADB,'-s',SERIAL,*args],stderr=subprocess.STDOUT,timeout=45)
 return result if binary else result.decode('utf-8')
def preferences():
 raw=adb('shell','run-as',PACKAGE,'cat','shared_prefs/media_downloads.xml')
 return {n.get('name'):n.text or '' for n in ET.fromstring(raw)}
def jobs(p):return {r['id']:r for r in json.loads(p.get('jobs','[]'))}
def wait(test,seconds=90):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  try:
   p=preferences()
   if test(p):return p
  except subprocess.CalledProcessError:pass
  time.sleep(1)
 raise AssertionError('Native service state did not reach the expected checkpoint')
def seed():
 output=adb('shell','am','instrument','-w','-e','migrationMode','service-seed',PACKAGE+'/local.mediacenter.library.MigrationTestRunner')
 assert 'MC_RESULT=SEEDED service-seed' in output,output
def begin():
 adb('shell','am','start','-n',PACKAGE+'/local.mediacenter.library.TransferTestActivity')
 return wait(lambda p:jobs(p)['service-active']['status']=='downloading' and 'pendingFile' in p,30)
def state():return json.load(urllib.request.urlopen('http://127.0.0.1:18547/music/__state',timeout=5))
def main():
 assert adb('emu','avd','name').splitlines()[0].strip()=='Media_Center_Migration_QA'
 apk=ROOT/'mobile-native/modules/media-library/android/build/outputs/apk/androidTest/debug/media-library-debug-androidTest.apk'
 assert 'Success' in adb('install','-t','-r',str(apk))
 adb('reverse','tcp:18547','tcp:18547')
 results=[]
 try:
  seed();begin();time.sleep(2)
  old=adb('shell','pidof',PACKAGE).strip();assert old.isdigit()
  assert 'DownloadService' in adb('shell','dumpsys','activity','services',PACKAGE)
  adb('shell','run-as',PACKAGE,'/system/bin/kill','-9',old)
  print('Killed only the disposable transfer process; waiting for Android START_STICKY recovery.',flush=True)
  p=wait(lambda p:jobs(p)['service-active']['status'] in ('complete','error'),110)
  rows=jobs(p);assert rows['service-active']['status']=='complete',rows['service-active'].get('error')
  assert rows['service-paused']['status']=='paused' and rows['service-cancelled']['status']=='cancelled' and rows['service-complete']['status']=='complete'
  assert adb('shell','pidof',PACKAGE).strip()!=old
  assert 'pendingFile' not in p
  items=json.loads(p.get('items','[]'));assert len(items)==1
  relative=items[0]['path'];assert relative.startswith('Music/') and '..' not in relative
  data=adb('exec-out','run-as',PACKAGE,'cat','cache/transfer-fixture/'+relative,binary=True)
  assert len(data)==items[0]['bytes'] and hashlib.sha256(data).hexdigest()==items[0]['sha256']
  expected=bytearray(44+96000*120);struct.pack_into('<4sI4s4sIHHIIHH4sI',expected,0,b'RIFF',len(expected)-8,b'WAVE',b'fmt ',16,1,1,48000,96000,2,16,b'data',len(expected)-44)
  assert hashlib.sha256(data).digest()==hashlib.sha256(expected).digest(),'Recovered file differs from the generated original' 
  events=state()['events'];streams=[e for e in events if e.get('operation')=='stream']
  assert len(streams)>=2 and all(e['id']=='mc-ahead-current' for e in streams),streams
  results.append({'case':'real Android service/process restart','passed':True,'bytes':len(data),'streams':len(streams)})
  print('PASS native service restart, untouched paused/cancelled jobs and original-file integrity.',flush=True)
  seed();begin();time.sleep(1);adb('shell','am','force-stop',PACKAGE);time.sleep(3)
  check=subprocess.run([ADB,'-s',SERIAL,'shell','pidof',PACKAGE],capture_output=True)
  assert check.returncode!=0,'Force-stopped test app restarted itself'
  # Starting instrumentation is an explicit reopen; it must not resume a force-stopped job.
  output=adb('shell','am','instrument','-w','-e','migrationMode','service-reopen',PACKAGE+'/local.mediacenter.library.MigrationTestRunner')
  assert 'MC_RESULT=PASS service-reopen' in output,output
  p=preferences();assert jobs(p)['service-active']['status']=='paused' and jobs(p)['service-paused']['status']=='paused' and jobs(p)['service-cancelled']['status']=='cancelled'
  results.append({'case':'force-stop requires explicit resume','passed':True})
  (REPORTS/'transfer-service-acceptance.json').write_text(json.dumps({'serial':SERIAL,'package':PACKAGE,'apkSha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'cases':results},indent=2),encoding='utf-8')
  print('PASS force-stop preservation; no automatic resume on explicit reopen.',flush=True)
 finally:adb('reverse','--remove','tcp:18547')
 # Only uninstall the disposable test APK, never the actual Media Center app.
 assert 'Success' in adb('uninstall',PACKAGE)
if __name__=='__main__':main()
