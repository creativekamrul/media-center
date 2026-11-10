"""Read-only navigation smoke test on the connected, unlocked S23 Ultra.
Uses the selected library; never prints titles, credentials or changes server data.
"""
import importlib.util,time
spec=importlib.util.spec_from_file_location('smoke',str(__import__('pathlib').Path(__file__).with_name('device-smoke.py')))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.adb('shell','am','start','-n',m.PACKAGE+'/.MainActivity')
m.find('Open menu',20)
m.tap('Library');time.sleep(1)
m.tap('Albums');time.sleep(2)
rows=[n for n in m.nodes() if n.get('package')==m.PACKAGE and n.get('content-desc','').startswith('Open ') and n.get('content-desc') not in ['Open menu','Open player']]
assert rows,'No album available for navigation check'
m.tap(rows[0].get('content-desc'));m.find('Back to library',20)
assert not any(n.get('content-desc')=='Open menu' for n in m.nodes()),'Root header still visible inside album'
m.adb('shell','input','keyevent','KEYCODE_BACK');m.find('Open menu',20)
m.adb('shell','input','keyevent','KEYCODE_BACK');m.find('Home',20)
assert m.adb('shell','pidof',m.PACKAGE).strip(),'Back closed the app'
print('PASS: album uses a separate header; Android Back returns to library then Home.')
