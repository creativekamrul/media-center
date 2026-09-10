import {spawn,type ChildProcessWithoutNullStreams} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync} from 'node:fs'
import {app,nativeImage} from 'electron'
import {join} from 'node:path'
import type {Player} from './player'
import type {QueueItem} from '../shared/types'
import {progressKey} from '../shared/timeline'
/** A Windows-owned SMTC session. The helper never opens or plays audio. */
export class WindowsMedia {
 private child?:ChildProcessWithoutNullStreams;private key='';private art='';private ready=false;private timer?:ReturnType<typeof setTimeout>;private closed=false;private last=0
 constructor(private player:Player,private cover:(item:QueueItem)=>Promise<string|null>,private available:(ready:boolean)=>void){if(process.platform!=='win32')return;const path=app.isPackaged?join(process.resourcesPath,'smtc/MediaCenter.MediaControls.exe'):join(__dirname,'../../artifacts/smtc/MediaCenter.MediaControls.exe');if(!existsSync(path)){available(false);return}this.child=spawn(path,[],{windowsHide:true,stdio:'pipe'});const lines=createInterface({input:this.child.stdout});lines.on('line',line=>{try{const value=JSON.parse(line);if(value.ready){this.ready=true;available(true);this.publish();return}const action=value.action;if(action==='seek'&&Number.isFinite(value.value)&&value.value>=0&&value.value<=player.state.duration)void player.command({action:'seek',value:value.value}).catch(()=>{});else if(action==='play'&&['paused','idle'].includes(player.state.status)&&player.state.queue.length>0||action==='pause'&&player.state.status==='playing')void player.command({action:'toggle'}).catch(()=>{});else if(['next','previous','stop'].includes(action))void player.command({action}).catch(()=>{})}catch{}});this.child.stderr.resume();this.child.stdin.on('error',()=>{});const lost=()=>{this.ready=false;if(!this.closed)available(false)};this.child.on('error',lost);this.child.on('exit',lost);player.on('state',this.update);this.update()}
 private update=()=>{const item=this.player.state.queue[this.player.state.queueIndex],key=item?progressKey(item.target):'';if(key!==this.key){this.key=key;this.art='';if(item)void this.cover(item).then(data=>{if(this.key!==key||this.closed)return;if(data){const image=nativeImage.createFromDataURL(data);if(!image.isEmpty())this.art=image.resize({width:400}).toPNG().toString('base64')}this.publish()}).catch(()=>{})}const elapsed=Date.now()-this.last;if(elapsed>=1000)this.publish();else if(!this.timer)this.timer=setTimeout(()=>{this.timer=undefined;this.publish()},1000-elapsed)}
 private publish(){if(!this.ready||!this.child||this.closed)return;this.last=Date.now();const s=this.player.state;this.child.stdin.write(JSON.stringify({title:s.title,artist:s.subtitle,status:s.status,position:s.position,duration:s.duration,art:this.art})+'\n')}
 stop(){this.closed=true;clearTimeout(this.timer);this.player.off('state',this.update);this.child?.stdin.end();const child=this.child;if(child)setTimeout(()=>{if(child.exitCode===null)child.kill()},2000).unref()}
}
