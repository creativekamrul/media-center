const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {resolve}=require('node:path')
const exited=child=>new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error('Installer exit request timed out')),20000)
 if(child.exitCode!==null){clearTimeout(timer);resolve(child.exitCode);return}
 child.once('exit',code=>{clearTimeout(timer);resolve(code)});child.once('error',error=>{clearTimeout(timer);reject(error)})
})
module.exports=async({desktop,page,profileArg})=>{
 const executable=await desktop.evaluate(({app})=>app.getPath('exe'))
 await page.evaluate(async()=>{const api=window.mediaCenter;await api.savePreferences({...await api.preferences(),closeToTray:true});await api.windowControl('close')})
 const args=[...(process.env.MEDIA_CENTER_EXECUTABLE?[]:[resolve('out/main/index.js')]),profileArg,'--quit-for-install']
 const stopped=exited(desktop.process()),request=spawn(executable,args,{windowsHide:true,stdio:'ignore',env:{...process.env,MEDIA_CENTER_SMOKE:'1'}})
 try{assert.equal(await exited(request),0);assert.equal(await stopped,0)}finally{if(request.exitCode===null)request.kill()}
 const idle=spawn(executable,args,{windowsHide:true,stdio:'ignore',env:{...process.env,MEDIA_CENTER_SMOKE:'1'}})
 try{assert.equal(await exited(idle),0)}finally{if(idle.exitCode===null)idle.kill()}
 console.log('Installer exit passed: tray-hidden app exits gracefully; an idle exit request never launches a window.')
}
