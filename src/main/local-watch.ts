import {watch,type FSWatcher} from 'node:fs'
import type {LocalFiles} from './local'
import type {LocalLibrary} from './local-library'
import type {Store} from './store'
import {experienceSchema} from '../shared/experience'
export class LocalWatcher {
 private watchers=new Map<string,FSWatcher>();private pending=new Map<string,ReturnType<typeof setTimeout>>();private stopped=false
 private timer:ReturnType<typeof setInterval>
 constructor(private local:LocalFiles,private index:LocalLibrary,private store:Store,private changed:()=>void){this.refresh();this.timer=setInterval(()=>this.refresh(),15000);this.timer.unref()}
 refresh(){if(this.stopped)return;const enabled=experienceSchema.parse(this.store.get('experience')??{}).watchLocal,roots=enabled?this.local.roots():[]
  for(const [id,w]of this.watchers)if(!roots.some(r=>r.id===id)){w.close();this.watchers.delete(id);clearTimeout(this.pending.get(id));this.pending.delete(id)}
  for(const root of roots)if(!this.watchers.has(root.id))try{
   const w=watch(root.path,{recursive:true,persistent:false},()=>this.schedule(root.id));w.on('error',()=>{w.close();this.watchers.delete(root.id)});this.watchers.set(root.id,w)
  }catch{/* An unavailable drive is retried at the next refresh. */}
 }
 private schedule(id:string){clearTimeout(this.pending.get(id));this.pending.set(id,setTimeout(()=>{this.pending.delete(id);void this.index.index(id,true).then(()=>{if(!this.stopped)this.changed()}).catch(()=>{})},1800))}
 stop(){this.stopped=true;clearInterval(this.timer);for(const w of this.watchers.values())w.close();for(const t of this.pending.values())clearTimeout(t);this.watchers.clear()}
}
