import {app,screen,type BrowserWindow} from 'electron'
import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process'
import {createInterface} from 'node:readline'
import {join} from 'node:path'

export interface VideoBounds {x:number;y:number;width:number;height:number;visible:boolean;occlusions?:{x:number;y:number;width:number;height:number}[]}
export class VideoHost {
 private lastMessage?:string
 private child?:ChildProcessWithoutNullStreams
 private ready?:Promise<string>
 private bounds:VideoBounds={x:0,y:0,width:1,height:1,visible:false}
 private lastPointer?:{x:number;y:number}
 pointerActive(){const w=this.window();if(!w||w.isDestroyed()||!w.isFocused()||!this.bounds.visible)return false;const p=screen.getCursorScreenPoint(),b=w.getContentBounds(),previous=this.lastPointer;this.lastPointer=p;return p.x>=b.x&&p.y>=b.y&&p.x<b.x+b.width&&p.y<b.y+b.height&&(!previous||p.x!==previous.x||p.y!==previous.y)}
 constructor(private window:()=>BrowserWindow|undefined){}
 async handle():Promise<string>{
  if(this.ready)return this.ready
  const w=this.window();if(!w||w.isDestroyed()||process.platform!=='win32')throw Error('Embedded video requires the Windows desktop window.')
  const path=app.isPackaged?join(process.resourcesPath,'smtc/MediaCenter.MediaControls.exe'):join(__dirname,'../../artifacts/smtc/MediaCenter.MediaControls.exe')
  this.ready=new Promise<string>((resolve,reject)=>{
   const child=spawn(path,['--video-host',String(w.getNativeWindowHandle().readUInt32LE())],{windowsHide:true,stdio:'pipe'});this.child=child;this.lastMessage=undefined
   const timer=setTimeout(()=>{child.kill();reject(Error('The embedded video surface did not start.'))},10000)
   const lines=createInterface({input:child.stdout});child.stderr.resume();child.stdin.on('error',()=>{})
   lines.on('line',line=>{try{const data=JSON.parse(line);if(typeof data.handle==='string'&&/^[1-9][0-9]{0,9}$/.test(data.handle)){clearTimeout(timer);this.update(this.bounds);resolve(data.handle)}}catch{}})
   child.once('error',()=>{clearTimeout(timer);this.ready=undefined;reject(Error('The embedded video helper is unavailable. Reinstall Media Center.'))})
   child.once('exit',()=>{clearTimeout(timer);if(this.child===child){this.child=undefined;this.ready=undefined}reject(Error('The embedded video surface closed.'))})
  });return this.ready
 }
 update(bounds:VideoBounds){
  this.bounds=bounds;const w=this.window();if(!w||w.isDestroyed())return
  const scale=screen.getDisplayMatching(w.getBounds()).scaleFactor*w.webContents.getZoomFactor()
  const size=w.getContentSize().map(n=>n/w.webContents.getZoomFactor());const x=Math.max(0,Math.min(bounds.x,size[0])),y=Math.max(0,Math.min(bounds.y,size[1]))
  const occlusions=bounds.occlusions?.map(clip=>({x:Math.round((clip.x-x)*scale),y:Math.round((clip.y-y)*scale),width:Math.round(clip.width*scale),height:Math.round(clip.height*scale)}))
  const packet=JSON.stringify({occlusions,visible:bounds.visible&&bounds.width>0&&bounds.height>0,x:Math.round(x*scale),y:Math.round(y*scale),width:Math.round(Math.min(bounds.width,Math.max(0,size[0]-x))*scale),height:Math.round(Math.min(bounds.height,Math.max(0,size[1]-y))*scale)})
  if(this.child&&packet!==this.lastMessage){this.lastMessage=packet;this.child.stdin.write(packet+'\n')}
 }
 fullscreen(value:boolean){const w=this.window();if(w&&!w.isDestroyed())w.setFullScreen(value)}
 hide(){this.update({...this.bounds,visible:false});this.fullscreen(false)}
 close(){this.hide();const child=this.child;this.child=undefined;this.ready=undefined;child?.stdin.end();if(child)setTimeout(()=>{if(child.exitCode===null)child.kill()},1500).unref()}
}
