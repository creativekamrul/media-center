import { createConnection, type Socket } from 'node:net'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { PlaybackState } from '../shared/types'
import type { DiscordSettings, DiscordStatus } from '../shared/daily'
import { progressKey } from '../shared/timeline'
import { Store } from './store'
import { Player } from './player'
import { Navidrome } from './providers/navidrome'
import { Audiobookshelf } from './providers/audiobookshelf'
import { LocalFiles } from './local'
import type { Handle } from './features'

export const discordDefaults: DiscordSettings = {enabled:false,applicationId:'',music:true,books:false,podcasts:false,local:false,showPaused:true,hasLastfmKey:false}
export const discordSchema=z.object({enabled:z.boolean(),applicationId:z.string().regex(/^(?:\d{15,22})?$/),music:z.boolean(),books:z.boolean(),podcasts:z.boolean(),local:z.boolean(),showPaused:z.boolean(),lastfmKey:z.string().regex(/^(?:[a-fA-F0-9]{32})?$/).optional()}).strict().refine(s=>!s.enabled||!!s.applicationId,{message:'Enter a Discord Application ID to enable presence.'})
export function rpcFrame(opcode:number,data:unknown) {const body=Buffer.from(JSON.stringify(data)),header=Buffer.alloc(8);header.writeUInt32LE(opcode,0);header.writeUInt32LE(body.length,4);return Buffer.concat([header,body])}
export function publicArtwork(value:string):string|undefined {try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&(url.hostname==='lastfm.freetls.fastly.net'||url.hostname==='lastfm-img2.akamaized.net')&&!url.pathname.includes('2a96cbd8b46e442fc41c2b86b821562f'))return url.href}catch{}return undefined}
export function presence(state:PlaybackState,settings:DiscordSettings,art?:string,now=Date.now()) {
  const allowed=state.kind==='music-track'?settings.music:state.kind==='audiobook'?settings.books:state.kind==='podcast-episode'?settings.podcasts:state.kind==='local-file'?settings.local:false
  if(!settings.enabled||!allowed||!['playing','paused'].includes(state.status)||(state.status==='paused'&&!settings.showPaused))return null
  const clean=(value:string)=>value.replace(/[\u0000-\u001f]/g,' ').slice(0,128).padEnd(2,' ')
  return {type:2,details:clean(state.title),state:clean(`${state.status==='paused'?'Paused · ':''}${state.subtitle}`),...(state.status==='playing'&&!state.buffering&&state.duration>0?{timestamps:{start:Math.floor(now/1000-state.position/state.speed),end:Math.floor(now/1000+(state.duration-state.position)/state.speed)}}:{}),...(art&&publicArtwork(art)?{assets:{large_image:art,large_text:clean(state.title)}}:{})}
}

export class DiscordPresence {
  private socket?: Socket
  private buffer=Buffer.alloc(0)
  private connecting=false
  private stopped=false
  private generation=0
  private nextConnect=0
  private sentAt=0
  private signature=''
  private lookupKey=''
  private art?:string
  private metadataKey=''
  private metadata?:{artist:string;album:string}
  private busy=false
  private pending?:{nonce:string;sent:number}
  private timer:NodeJS.Timeout
  status:DiscordStatus={connected:false,message:'Discord presence is disabled.',artwork:false}
  constructor(private store:Store,private player:Player,private provider:(id:string)=>Navidrome|Audiobookshelf,private local:LocalFiles) {this.timer=setInterval(()=>void this.tick(),3000);void this.tick()}
  settings():DiscordSettings {return {...discordDefaults,...this.store.get<DiscordSettings>('discordSettings'),hasLastfmKey:!!this.store.secret('lastfm')}}
  save(input:z.infer<typeof discordSchema>) {const {lastfmKey,...settings}=input;if(lastfmKey!==undefined)this.store.setSecret('lastfm',lastfmKey);this.store.set('discordSettings',settings);this.generation++;this.clear();this.socket?.destroy();this.socket=undefined;this.status.connected=false;this.nextConnect=0;this.lookupKey='';this.metadataKey='';void this.tick()}
  correct(artist:string,album:string){const item=this.player.state.queue[this.player.state.queueIndex];if(!item||!['music-track','local-file'].includes(item.target.kind))throw new Error('Play a music track before correcting its artwork.');const key=progressKey(item.target),all=this.store.get<Record<string,{artist:string;album:string}>>('artworkOverrides')??{};if(!artist&&!album)delete all[key];else all[key]={artist,album};if(Object.keys(all).length>1000)throw new Error('Artwork corrections are limited to 1,000 tracks.');this.store.set('artworkOverrides',all);this.lookupKey='';this.metadataKey='';this.art=undefined;this.signature='';void this.tick()}
  private write(op:number,data:unknown){if(this.socket&&!this.socket.destroyed)this.socket.write(rpcFrame(op,data))}
  private clear(){if(this.status.connected)this.write(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity:null},nonce:randomUUID()});this.signature='';this.art=undefined;this.pending=undefined}
  private async connect(applicationId:string){
    if(this.connecting||this.stopped)return;this.connecting=true;const generation=this.generation
    try{for(let i=0;i<10&&!this.stopped&&generation===this.generation;i++){
      const socket=await new Promise<Socket|undefined>(resolve=>{const s=createConnection(`\\\\?\\pipe\\discord-ipc-${i}`),timer=setTimeout(()=>{s.destroy();resolve(undefined)},350);s.once('error',()=>{clearTimeout(timer);s.destroy();resolve(undefined)});s.once('connect',()=>{clearTimeout(timer);resolve(s)})})
      if(!socket)continue
      if(this.stopped||generation!==this.generation){socket.destroy();return}
      this.socket=socket;this.buffer=Buffer.alloc(0);this.status={connected:false,message:'Connecting to Discord…',artwork:false}
      const handshake=setTimeout(()=>{if(!this.status.connected)socket.destroy()},8000)
      socket.on('data',chunk=>this.receive(Buffer.from(chunk)));socket.on('error',()=>{});socket.on('close',()=>{clearTimeout(handshake);if(this.socket===socket){this.socket=undefined;this.status={connected:false,message:'Waiting for the Discord desktop app.',artwork:false};this.pending=undefined;this.nextConnect=Date.now()+15000}})
      this.write(0,{v:1,client_id:applicationId});return
    }this.status={connected:false,message:'Open the Discord desktop app to connect.',artwork:false};this.nextConnect=Date.now()+15000}finally{this.connecting=false}
  }
  private receive(chunk:Buffer){
    this.buffer=Buffer.concat([this.buffer,chunk]);if(this.buffer.length>1024*1024){this.socket?.destroy();return}
    while(this.buffer.length>=8){const op=this.buffer.readUInt32LE(0),length=this.buffer.readUInt32LE(4);if(length>1024*1024){this.socket?.destroy();return}if(this.buffer.length<length+8)return;const body=this.buffer.subarray(8,length+8);this.buffer=this.buffer.subarray(length+8)
      try{const data=JSON.parse(body.toString());if(op===3){this.write(4,data);continue}if(op===2){this.socket?.destroy();return}if(op!==1)continue
        if(data.evt==='READY'){this.status={connected:true,message:'Connected to Discord.',artwork:false};this.signature='';void this.tick()}
        if(data.nonce===this.pending?.nonce){this.pending=undefined;if(data.evt==='ERROR'){this.status.message='Discord rejected the activity. Check your Application ID and activity-sharing settings.';this.signature=''}else this.status.message='Connected to Discord.'}
      }catch{this.socket?.destroy();return}
    }
  }
  private async artwork(state:PlaybackState){
    const item=state.queue[state.queueIndex];if(!item||!['music-track','local-file'].includes(item.target.kind)||!this.store.secret('lastfm'))return undefined
    const targetKey=progressKey(item.target)
    if(this.metadataKey!==targetKey){this.metadataKey=targetKey;this.metadata=undefined;const correction=this.store.get<Record<string,{artist:string;album:string}>>('artworkOverrides')?.[targetKey];if(correction)this.metadata=correction;else if(item.target.kind==='music-track'){const p=this.provider(item.target.serverId);if(p instanceof Navidrome){const t=await p.track(item.target.trackId);this.metadata={artist:t.artist,album:t.album}}}else if(item.target.kind==='local-file'){const t=await this.local.metadata(item.target.rootId,item.target.fileId);this.metadata={artist:t.artist,album:t.album}}}
    if(!this.metadata?.artist||!this.metadata.album)return undefined
    const key=`lastfm:${JSON.stringify([this.metadata.artist.toLowerCase(),this.metadata.album.toLowerCase()])}`
    if(this.lookupKey===key)return this.art
    this.lookupKey=key;this.art=undefined
    const cached=this.store.cache<{url?:string}>(key);if(cached&&Date.now()-cached.updated<(cached.value.url?7*86400000:3600000))return this.art=cached.value.url?publicArtwork(cached.value.url):undefined
    const url=new URL('https://ws.audioscrobbler.com/2.0/');url.search=new URLSearchParams({method:'album.getinfo',api_key:this.store.secret('lastfm'),artist:this.metadata.artist,album:this.metadata.album,autocorrect:'1',format:'json'}).toString()
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),redirect:'error'});if(!response.ok)throw new Error('Last.fm artwork lookup failed.')
    const raw=z.object({error:z.number().optional(),album:z.object({image:z.array(z.object({'#text':z.string(),size:z.string()})).default([])}).optional()}).parse(await response.json())
    if(raw.error)throw new Error('Last.fm rejected the API key or album request.')
    this.art=raw.album?.image.map(i=>publicArtwork(i['#text'])).filter((v):v is string=>!!v).at(-1);this.store.cacheSet(key,{url:this.art});return this.art
  }
  private async tick(){
    if(this.busy||this.stopped)return;this.busy=true
    try{
      const settings=this.settings();if(!settings.enabled||!settings.applicationId){this.status={connected:false,message:settings.enabled?'Add your Discord Application ID.':'Discord presence is disabled.',artwork:false};return}
      if(!this.socket){if(Date.now()>=this.nextConnect)await this.connect(settings.applicationId);return}if(!this.status.connected)return
      if(this.pending){if(Date.now()-this.pending.sent>15000){this.socket.destroy();this.pending=undefined}return}
      const state=structuredClone(this.player.state),generation=this.generation
      let art:string|undefined
      if(presence(state,settings))try{art=await this.artwork(state)}catch{this.status.message='Connected; Last.fm artwork is unavailable. Check the key or album match.'}
      if(generation!==this.generation||this.stopped)return
      // Never publish an old lookup after the user changed or hid the current media.
      const current=this.player.state;if(JSON.stringify(current.queue[current.queueIndex]?.target)!==JSON.stringify(state.queue[state.queueIndex]?.target)||current.status!==state.status)return
      const activity=presence(current,settings,art),signature=JSON.stringify([activity?.details,activity?.state,art,activity===null,current.speed,current.buffering,Math.round(current.position/10)])
      const immediate=activity===null||signature!==this.signature&&Date.now()-this.sentAt>=5000
      if(signature===this.signature||(!immediate&&Date.now()-this.sentAt<15000))return
      const nonce=randomUUID();this.pending={nonce,sent:Date.now()};this.write(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity},nonce});this.signature=signature;this.sentAt=Date.now();this.status.artwork=!!art
    }catch{this.status.message='Discord integration is unavailable. Check its settings.'}finally{this.busy=false}
  }
  stop(){this.stopped=true;this.generation++;clearInterval(this.timer);this.clear();this.socket?.end();this.socket?.destroy();this.socket=undefined}
}
export function registerDiscord(handle:Handle,rpc:DiscordPresence){handle('discord:get',z.undefined(),()=>rpc.settings());handle('discord:save',discordSchema,i=>rpc.save(i));handle('discord:status',z.undefined(),()=>rpc.status);handle('discord:artwork',z.object({artist:z.string().trim().max(500),album:z.string().trim().max(500)}).strict(),i=>rpc.correct(i.artist,i.album))}
