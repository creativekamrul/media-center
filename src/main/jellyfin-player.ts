import {PlaybackTime} from '../shared/playback-time'
import {StatePublisher} from './state-publisher'
import { EventEmitter } from 'node:events'
import { emptyJfState, jfVideoPreferences, type JfState, type JfItem, type JfCommand } from '../shared/jellyfin'
import type { Store } from './store'
import type { Jellyfin } from './providers/jellyfin'
import { JellyfinRelay } from './jellyfin-relay'
import { Mpv } from './mpv'

export class JellyfinPlayer extends EventEmitter {
 state:JfState={...emptyJfState,tracks:[],chapters:[],queue:[]}
 private chain:Promise<unknown>=Promise.resolve()
 private active?:{provider:Jellyfin;item:JfItem;sourceId:string;sessionId?:string}
 private relay=new JellyfinRelay()
 private loading=false
 private timer:NodeJS.Timeout
 private nextTimer?:NodeJS.Timeout
 private ticks=0
 private closing=false
 private finishing=false
 private listening=new PlaybackTime()
 private listened=0
 constructor(private store:Store,private provider:(id:string)=>Jellyfin,private pauseOther:()=>Promise<void>,private mpv=new Mpv(),private embedded?:{handle:()=>Promise<string>;fullscreen:(value:boolean)=>void;hide:()=>void;close:()=>void},private isPrivate:()=>boolean=()=>false){
  super();this.state.preferences=jfVideoPreferences.parse(store.get('jellyfin:video-preferences')??{});this.state.autoNext=store.get<boolean>('jellyfin:auto-next')??true
  const saved=store.get<{queue:JfItem[];index:number;position:number;duration:number}>('jellyfin:session');if(saved?.queue?.length&&saved.index>=0&&saved.index<saved.queue.length)this.state={...this.state,...saved,status:'idle'}
  mpv.on('event',event=>this.event(event));mpv.on('failure',()=>{if(!this.closing&&this.active){this.state.status='error';this.state.error='The playback window closed or MPV disconnected. Retry to resume.';this.emitState();void this.serial(()=>this.finish())}})
  this.timer=setInterval(()=>{this.sampleListening();if(this.active&&!this.loading){if(++this.ticks%5===0){this.flushListening();this.checkpoint()}if(this.ticks%15===0)void this.serial(()=>this.report('Progress'));}},1000)
 }
 private sampleListening(){this.listened+=this.listening.sample(this.state.position,!!this.active&&!this.loading&&!this.finishing&&this.state.status==='playing'&&!this.state.buffering&&!this.isPrivate())}
 private flushListening(){if(this.active&&this.listened>0)this.store.recordJellyfinListening(this.active.item,this.listened);this.listened=0}
 private serial<T>(work:()=>Promise<T>):Promise<T>{const result=this.chain.then(work);this.chain=result.catch(()=>{});return result}
 private publisher=new StatePublisher(()=>this.emit('state',structuredClone(this.state)),500)
 private emitState(telemetry=false){this.publisher.publish(telemetry)}
 private key(item:JfItem){return `jellyfin:progress:${item.serverId}:${item.kind}:${item.id}`}
 private checkpoint(){this.store.set('jellyfin:session',{queue:this.state.queue,index:this.state.index,position:this.state.position,duration:this.state.duration});if(this.active)this.store.set(this.key(this.active.item),{position:this.state.position,duration:this.state.duration,updatedAt:Date.now(),pending:!!this.state.syncError})}
 private async report(event:'Playing'|'Progress'|'Stopped'){
  const a=this.active;if(!a)return
  try{await a.provider.send(`Sessions/Playing${event==='Playing'?'':`/${event}`}`,{ItemId:a.item.id,MediaSourceId:a.sourceId,PlaySessionId:a.sessionId,PositionTicks:Math.round(this.state.position*1e7),IsPaused:this.state.status!=='playing',IsMuted:this.state.volume===0,VolumeLevel:Math.round(this.state.volume),CanSeek:true,PlayMethod:'DirectPlay',EventName:event==='Progress'?'TimeUpdate':undefined});this.state.syncError=undefined}
  catch{this.state.syncError='Jellyfin progress could not sync. Your position is saved on this computer.'}
  this.checkpoint();this.emitState()
 }
 private async finish(){this.sampleListening();this.flushListening();this.listening.reset();this.finishing=true;try{if(this.active){this.checkpoint();await this.report('Stopped');this.active=undefined}await this.relay.close()}finally{this.finishing=false;this.listening.reset()}}
 play(items:JfItem[],index=0,restart=false){return this.serial(async()=>{if(!items.length||index<0||index>=items.length||items.some(i=>!['Audio','Movie','Episode'].includes(i.kind)))throw Error('Choose a playable track, movie or episode.');this.cancelNext();await this.finish();this.state.queue=items;this.state.index=index;await this.load(restart)})}
 private cancelNext(){if(this.nextTimer)clearInterval(this.nextTimer);this.nextTimer=undefined;this.state.nextIn=undefined}
 private async appearance(){const p=this.state.preferences;for(const [name,value] of [['sub-scale',p.subtitleScale],['sub-back-color',p.subtitleBackground?'#B3000000':'#00000000']] as const)await this.mpv.command(['set_property',name,value])}
 private async load(restart=false,override?:number){
  this.cancelNext();
  const item=this.state.queue[this.state.index];if(!item)return
  this.loading=true;this.state={...this.state,status:'loading',position:override??item.position,duration:item.duration,error:undefined,syncError:undefined,tracks:[],chapters:[],codec:'',video:'',hwdec:'',buffering:false};this.emitState()
  try{
   await this.pauseOther();this.state.foreground=true;this.emitState();const p=this.provider(item.serverId);const fresh=await p.detail(item.id)
   // A local checkpoint is used only by the user's explicit Retry/Resume action.
   const position=override??(restart?0:fresh.position)
   this.state.position=position
   const info=await p.playback(item.id,position);const stream=await this.relay.open(p,item,info.source)
   const volume=this.state.volume
   await this.mpv.start(this.store.settings().mpvPath,true,await this.embedded?.handle())
   await this.mpv.command(['set_property','audio-device',this.store.settings().audioDevice])
   await this.mpv.command(['set_property','audio-exclusive',this.store.settings().exclusive])
   await this.mpv.command(['set_property','volume',volume])
   await this.mpv.command(['set_property','pause',false]);await this.appearance();
   const preference=this.state.preferences;
   await this.mpv.command(['set_property','alang',preference.audioLanguage]);await this.mpv.command(['set_property','slang',preference.subtitleLanguage]);await this.mpv.command(['set_property','aid','auto']);await this.mpv.command(['set_property','sid',preference.subtitles==='off'?'no':'auto'])
   await this.mpv.load(stream.url,{start:String(position),vid:item.kind==='Audio'?'no':'auto','force-media-title':`${item.title} — Media Center`})
   const audio=info.source.MediaStreams.find(s=>s.Type==='Audio'),video=info.source.MediaStreams.find(s=>s.Type==='Video')
   this.state.quality=[video?.Codec?.toUpperCase(),audio?.Codec?.toUpperCase(),audio?.SampleRate?String(audio.SampleRate/1000)+' kHz':'',audio?.BitDepth?String(audio.BitDepth)+' bit':'',info.source.Bitrate?String((info.source.Bitrate/1e6).toFixed(1))+' Mbps':''].filter(Boolean).join(' · ')
   this.active={provider:p,item,sourceId:info.source.Id,sessionId:info.sessionId};this.state.position=position;this.state.duration=this.state.duration||item.duration;this.state.status='playing'
   for(const s of stream.subtitles)await this.mpv.command(['sub-add',s.url,'auto',s.title,s.language]).catch(()=>{})
   if(this.state.preferences.subtitles==='off')await this.mpv.command(['set_property','sid','no']);
   await this.report('Playing')
  }catch(e){this.state.status='error';this.state.error=e instanceof Error?e.message:'Could not start original-file playback.';await this.relay.close();throw e}
  finally{this.loading=false;this.emitState()}
 }
 private event(e:{event:string;name?:string;data?:any;reason?:string}){
  if(e.event==='end-file'&&!this.loading&&this.active){
   if(e.reason==='eof'){const ended=this.active;void this.serial(async()=>{if(this.active!==ended)return;this.state.position=this.state.duration;await this.finish();if(this.state.autoNext&&this.state.index+1<this.state.queue.length){if(ended.item.kind!=='Audio'&&this.state.preferences.nextDelay>0){this.state.status='paused';this.state.nextIn=this.state.preferences.nextDelay;this.emitState();this.nextTimer=setInterval(()=>{if(this.state.nextIn===undefined)return;this.state.nextIn--;this.emitState();if(this.state.nextIn<=0){clearInterval(this.nextTimer);const pending=this.nextTimer;void this.serial(async()=>{if(this.nextTimer!==pending||this.state.nextIn!==0)return;this.cancelNext();this.state.index++;await this.load(true)}).catch(()=>{})}},1000)}else{this.state.index++;await this.load(true)}}else{this.state.status='idle';this.emitState()}}).catch(()=>{})}
   else if(e.reason==='error'){this.state.status='error';this.state.error='Playback stopped. Check the connection or retry from the saved position.';this.checkpoint();this.emitState()}
  }
  if(e.event!=='property-change')return
  if(e.name==='time-pos'&&typeof e.data==='number')this.state.position=e.data
  if(e.name==='duration'&&typeof e.data==='number')this.state.duration=e.data
  if(e.name==='pause'&&!this.loading&&this.active&&this.state.status!=='error'){this.state.status=e.data?'paused':'playing';if(!e.data)void this.pauseOther().catch(()=>{});void this.serial(()=>this.report('Progress'))}
  if(e.name==='volume'&&typeof e.data==='number')this.state.volume=e.data
  if(e.name==='paused-for-cache')this.state.buffering=!!e.data
  if(e.name==='fullscreen'&&!this.embedded)this.state.fullscreen=!!e.data
  if(e.name==='audio-codec-name')this.state.codec=String(e.data??'')
  if(e.name==='video-params'&&e.data)this.state.video=`${e.data.w??''} × ${e.data.h??''} · ${e.data.pixelformat??''}`
  if(e.name==='hwdec-current')this.state.hwdec=String(e.data??'')
  if(e.name==='track-list'&&Array.isArray(e.data))this.state.tracks=e.data.filter(t=>t.type==='audio'||t.type==='sub').map(t=>({id:t.id,type:t.type,title:t.title||`${t.type==='audio'?'Audio':'Subtitle'} ${t.id}`,language:t.lang,selected:!!t.selected}))
  if(e.name==='chapter-list'&&Array.isArray(e.data))this.state.chapters=e.data.map((c,i)=>({title:c.title||`Chapter ${i+1}`,time:c.time}))
  this.emitState(e.name==='time-pos')
 }
 pause(){return this.serial(async()=>{if(this.active&&this.state.status==='playing'){await this.mpv.command(['set_property','pause',true]);this.state.status='paused';await this.report('Progress')}})}
 command(c:JfCommand){return this.serial(async()=>{
  if(c.action==='preferences'){if(this.active){const previous=this.state.preferences;this.state.preferences=c.value;try{await this.appearance()}catch(e){this.state.preferences=previous;throw e}}else this.state.preferences=c.value;this.store.set('jellyfin:video-preferences',c.value);this.emitState();return}
  if(c.action==='cancelNext'){if(this.state.nextIn===undefined)return;this.cancelNext();this.state.status='idle';this.embedded?.hide();this.state.fullscreen=false;this.emitState();return}
  if(c.action==='queueIndex'){if(c.value>=this.state.queue.length)throw Error('Queue position is out of bounds.');this.cancelNext();await this.finish();this.state.index=c.value;await this.load();return}
  if(c.action==='autoNext'){this.state.autoNext=c.value;this.store.set('jellyfin:auto-next',c.value);if(!c.value&&this.state.nextIn!==undefined){this.cancelNext();this.state.status='idle';this.embedded?.hide();this.state.fullscreen=false;}this.emitState();return}
  if(c.action==='stop'){this.cancelNext();await this.finish();await this.mpv.stop();this.embedded?.hide();this.state.fullscreen=false;this.state.status='idle';this.emitState();return}
  if(c.action==='retry'){this.cancelNext();const position=this.state.position;await this.finish();await this.mpv.stop();await this.load(false,position);return}
  if(c.action==='next'||c.action==='previous'){this.cancelNext();const next=this.state.index+(c.action==='next'?1:-1);if(next<0||next>=this.state.queue.length)return;await this.finish();this.state.index=next;await this.load(true);return}
  if(c.action==='volume'&&!this.active){this.state.volume=c.value;this.emitState();return}
  if(c.action==='toggle'&&this.state.nextIn!==undefined){this.cancelNext();this.state.index++;await this.load(true);return}
  if(!this.active)throw Error('Start Jellyfin playback first.')
  if(c.action==='sync'){await this.report('Progress');return}
  if(c.action==='toggle'){const paused=this.state.status==='playing';if(!paused){await this.pauseOther();this.state.foreground=true}await this.mpv.command(['set_property','pause',paused]);this.state.status=paused?'paused':'playing';await this.report('Progress')}
  if(c.action==='seek'||c.action==='seekRelative'){const position=Math.max(0,c.action==='seekRelative'?this.state.position+c.value:c.value);this.sampleListening();this.listening.reset();await this.mpv.command(['seek',Math.min(position,this.state.duration||position),'absolute+exact']);this.state.position=Math.min(position,this.state.duration||position);await this.report('Progress')}
  if(c.action==='volume'){await this.mpv.command(['set_property','volume',c.value]);this.state.volume=c.value}
  if(c.action==='fullscreen'){if(this.embedded){this.state.fullscreen=!this.state.fullscreen;this.embedded.fullscreen(this.state.fullscreen)}else await this.mpv.command(['cycle','fullscreen'])}
  if(c.action==='audio'||c.action==='subtitle'){const type=c.action==='audio'?'audio':'sub';if(c.value!==-1&&!this.state.tracks.some(t=>t.type===type&&t.id===c.value))throw Error('That media track is no longer available.');await this.mpv.command(['set_property',c.action==='audio'?'aid':'sid',c.value===-1?'no':c.value])}
  this.emitState()
 })}
 background(){if(this.state.foreground){this.state.foreground=false;this.emitState()}}
 setFullscreen(value:boolean){this.state.fullscreen=value;this.emitState()}
 async shutdown(){this.cancelNext();this.publisher.cancel();clearInterval(this.timer);this.closing=true;await this.serial(async()=>{await this.finish();await this.mpv.stop();this.embedded?.close()})}
}
