// Run with Electron. Generates the repository cover from a real reviewed app screenshot.
const {app,BrowserWindow}=require('electron')
const {resolve}=require('node:path')
const {pathToFileURL}=require('node:url')
const {mkdirSync,writeFileSync}=require('node:fs')
app.whenReady().then(async()=>{
  const dir=resolve('artifacts/release-art');mkdirSync(dir,{recursive:true})
  const asset=name=>pathToFileURL(resolve('site/assets',name)).href
  const html=`<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:1280px;height:640px;overflow:hidden;background:#111b18;color:#f3f0e7;font-family:'Segoe UI',sans-serif}
  .edge{position:absolute;inset:24px;border:1px solid #34453e;border-radius:24px}
  .brand{position:absolute;left:62px;top:62px;display:flex;align-items:center;gap:15px;font-weight:650;font-size:26px;letter-spacing:-.8px}.brand img{width:48px;height:48px}
  .pill{position:absolute;right:64px;top:70px;font-size:12px;letter-spacing:2px;border:1px solid #5c7062;border-radius:30px;padding:10px 18px;color:#d8e2ce}
  h1{position:absolute;left:62px;top:137px;font:normal 66px/1.08 Georgia,serif;letter-spacing:-2.3px;margin:0;width:520px}h1 em{color:#e6bd9d;font-weight:normal}
  .intro{position:absolute;left:64px;top:383px;font-size:19px;line-height:1.7;color:#bfcbbf;width:450px;margin:0}
  .sources{position:absolute;left:64px;bottom:111px;display:flex;gap:10px;font-size:12px}.sources span{padding:9px 12px;border:1px solid #405247;border-radius:8px;background:#1b2821;color:#e1e8da}
  .screen{position:absolute;left:591px;top:151px;width:755px;border:1px solid #718270;border-radius:15px;overflow:hidden;box-shadow:0 30px 80px #0009;transform:rotate(-3deg);background:#17231d}.screen img{display:block;width:755px;height:auto}.chrome{height:22px;border-bottom:1px solid #435046;padding:8px 13px;display:flex;gap:5px}.chrome i{display:block;width:5px;height:5px;border-radius:50%;background:#87947e}
  .footer{position:absolute;left:64px;right:64px;bottom:53px;display:flex;justify-content:space-between;font-size:12px;color:#b6c5b6;letter-spacing:.6px}.version{display:none}
  </style><div class="edge"></div><div class="brand"><img src="${asset('icon.svg')}">Media Center</div><div class="pill">FREE & OPEN SOURCE</div><h1>A home for<br>everything<br>you <em>listen to.</em></h1><p class="intro">Music. Audiobooks. Podcasts.<br>Your collection, in one Windows app.</p><div class="sources"><span>Navidrome</span><span>Audiobookshelf</span><span>Local audio</span></div><div class="screen"><div class="chrome"><i></i><i></i><i></i></div><img src="${asset('music.png')}"></div><div class="footer"><span>creativekamrul / media-center</span><span class="version">1.0 · NATIVE MPV PLAYBACK</span></div>`
  const path=resolve(dir,'cover.html');writeFileSync(path,html)
  const win=new BrowserWindow({width:1280,height:640,useContentSize:true,show:false,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}})
  await win.loadFile(path);await win.webContents.executeJavaScript('Promise.all([...document.images].map(i=>i.decode())).then(()=>document.fonts.ready)')
  writeFileSync(resolve('site/assets/social-preview.png'),(await win.webContents.capturePage()).toPNG())
  console.log('Rendered site/assets/social-preview.png (1280 × 640).');win.destroy();app.quit()
}).catch(e=>{console.error(e);app.exit(1)})
