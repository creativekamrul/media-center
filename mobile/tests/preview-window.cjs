const {app,BrowserWindow}=require('electron')
const {resolve}=require('node:path')
app.whenReady().then(()=>{
  const win=new BrowserWindow({width:390,height:844,show:false,webPreferences:{sandbox:true}})
  win.webContents.setBackgroundThrottling(false)
  win.loadFile(resolve('mobile/dist/Media-Center-Mobile.html'))
})
