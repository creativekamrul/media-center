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
import { LastfmArtwork, publicArtwork, type ArtworkMetadata, type ArtworkResult } from './lastfm'
export { publicArtwork } from './lastfm'

export const discordDefaults: DiscordSettings = {enabled:false,applicationId:'',music:true,books:false,podcasts:false,local:false,showPaused:true,hasLastfmKey:false}
export const defaultDiscordArtwork='https://raw.githubusercontent.com/creativekamrul/media-center/v1.1.0/src/renderer/public/assets/default-cover.png'
export const discordSchema=z.object({defaultCoverAsset:z.boolean().optional(),enabled:z.boolean(),applicationId:z.string().regex(/^(?:\d{15,22})?$/),music:z.boolean(),books:z.boolean(),podcasts:z.boolean(),local:z.boolean(),showPaused:z.boolean(),lastfmKey:z.string().regex(/^(?:[a-fA-F0-9]{32})?$/).optional()}).strict().refine(s=>!s.enabled||!!s.applicationId,{message:'Enter a Discord Application ID to enable presence.'})
export function rpcFrame(opcode:number,data:unknown) {const body=Buffer.from(JSON.stringify(data)),header=Buffer.alloc(8);header.writeUInt32LE(opcode,0);header.writeUInt32LE(body.length,4);return Buffer.concat([header,body])}
export function presence(state:PlaybackState,settings:DiscordSettings,art?:string,now=Date.now()) {
  const allowed=state.kind==='music-track'?settings.music:state.kind==='audiobook'?settings.books:state.kind==='podcast-episode'?settings.podcasts:state.kind==='local-file'?settings.local:false
  if(state.privateListening||!settings.enabled||!allowed||!['playing','paused'].includes(state.status)||(state.status==='paused'&&!settings.showPaused))return null
  const clean=(value:string)=>value.replace(/[\u0000-\u001f]/g,' ').slice(0,128).padEnd(2,' ')
  return {type:2,details:clean(state.title),state:clean(`${state.status==='paused'?'Paused · ':''}${state.subtitle}`),...(state.status==='playing'&&!state.buffering&&state.duration>0?{timestamps:{start:Math.floor(now/1000-state.position/state.speed),end:Math.floor(now/1000+(state.duration-state.position)/state.speed)}}:{}),...(['music-track','local-file'].includes(state.kind??'')?{assets:{large_image:(art&&publicArtwork(art))||defaultDiscordArtwork,large_text:clean(state.title)}}:{})}
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
  private metadataKey=''
  private metadata?:ArtworkMetadata
  private artworkClient:LastfmArtwork
  private refreshArtwork=true
  private busy=false
  private pending?:{nonce:string;sent:number}
  private timer:NodeJS.Timeout
  status:DiscordStatus={connected:false,message:'Discord presence is disabled.',artwork:false}
  private wasPrivate=false
  private privacyChanged=()=>{const enabled=!!this.player.state.privateListening;if(enabled&&!this.wasPrivate){this.generation++;this.clear();this.status.artwork=false;this.status.artworkMessage='Private listening is on.'}this.wasPrivate=enabled}
  constructor(private store:Store,private player:Player,private provider:(id:string)=>Navidrome|Audiobookshelf,private local:LocalFiles) {this.artworkClient=new LastfmArtwork(store);player.on('state',this.privacyChanged);this.timer=setInterval(()=>void this.tick(),3000);void this.tick()}
  settings():DiscordSettings {return {...discordDefaults,...this.store.get<DiscordSettings>('discordSettings'),hasLastfmKey:!!this.store.secret('lastfm')}}
  save(input:z.infer<typeof discordSchema>) {const {lastfmKey,...settings}=input;if(lastfmKey!==undefined)this.store.setSecret('lastfm',lastfmKey);this.store.set('discordSettings',settings);this.generation++;this.clear();this.socket?.destroy();this.socket=undefined;this.status.connected=false;this.nextConnect=0;this.metadataKey='';this.refreshArtwork=true;this.artworkClient.reset();void this.tick()}
  correct(artist:string,album:string){const item=this.player.state.queue[this.player.state.queueIndex];if(!item||!['music-track','local-file'].includes(item.target.kind))throw new Error('Play a music track before correcting its artwork.');const key=progressKey(item.target),all=this.store.get<Record<string,{artist:string;album:string}>>('artworkOverrides')??{};if(!artist&&!album)delete all[key];else all[key]={artist,album};if(Object.keys(all).length>1000)throw new Error('Artwork corrections are limited to 1,000 tracks.');this.store.set('artworkOverrides',all);this.retryArtwork()}
  private write(op:number,data:unknown){if(this.socket&&!this.socket.destroyed)this.socket.write(rpcFrame(op,data))}
  private clear(){if(this.status.connected)this.write(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity:null},nonce:randomUUID()});this.signature='';this.pending=undefined}
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
        if(data.nonce===this.pending?.nonce){this.pending=undefined;if(data.evt==='ERROR'){this.status.message='Discord rejected the activity. Check your Application ID and activity-sharing settings.';this.status.artwork=false;this.signature=''}else this.status.message='Connected to Discord.'}
      }catch{this.socket?.destroy();return}
    }
  }
  retryArtwork(){this.generation++;this.metadataKey='';this.refreshArtwork=true;this.signature='';this.status.artwork=false;this.status.artworkMessage='Waiting to look up the current track...';void this.tick()}
  private async artwork(state:PlaybackState):Promise<ArtworkResult>{
    const item=state.queue[state.queueIndex]
    if(!item||!['music-track','local-file'].includes(item.target.kind))return {message:'Audiobooks and podcasts use text-only Discord presence.'}
    const custom=this.store.get<string>('personal-cover-source:'+progressKey(item.target));if(custom&&publicArtwork(custom))return {url:custom,message:'Using your chosen album artwork.'}
    if(!this.store.secret('lastfm'))return {message:'Add a Last.fm API key to look up album covers.'}
    const targetKey=progressKey(item.target),generation=this.generation
    let metadata=this.metadataKey===targetKey?this.metadata:undefined
    if(!metadata){
      const correction=this.store.get<Record<string,{artist:string;album:string}>>('artworkOverrides')?.[targetKey]
      if(correction)metadata={...correction,title:state.title,corrected:true}
      else if(item.target.kind==='music-track'){
        const p=this.provider(item.target.serverId)
        if(p instanceof Navidrome){const t=await p.track(item.target.trackId).catch(()=>{throw new Error('Music metadata could not be loaded. Check the server connection and retry artwork.')});metadata={artist:t.artist,album:t.album,title:t.title}}
      }else if(item.target.kind==='local-file'){
        const t=await this.local.metadata(item.target.rootId,item.target.fileId).catch(()=>{throw new Error('Local audio tags could not be loaded. Check that the file is available and retry artwork.')});metadata={artist:t.artist,album:t.album,title:t.title}
      }
      if(generation!==this.generation)return {message:'Track changed; waiting for artwork.'}
      this.metadata=metadata;this.metadataKey=targetKey
    }
    if(!metadata)return {message:'No music metadata is available for artwork matching.'}
    const refresh=this.refreshArtwork;this.refreshArtwork=false
    return this.artworkClient.lookup(metadata,refresh)
  }
  private async tick(){
    if(this.busy||this.stopped)return;this.busy=true
    try{
      const settings=this.settings();if(!settings.enabled||!settings.applicationId){this.status={connected:false,message:settings.enabled?'Add your Discord Application ID.':'Discord presence is disabled.',artwork:false};return}
      if(!this.socket){if(Date.now()>=this.nextConnect)await this.connect(settings.applicationId);return}if(!this.status.connected)return
      if(this.pending){if(Date.now()-this.pending.sent>15000){this.socket.destroy();this.pending=undefined}return}
      const state=structuredClone(this.player.state),generation=this.generation
      let art:string|undefined,artworkMessage='Start a shared music track to look up its artwork.'
      if(presence(state,settings))try{const result=await this.artwork(state);art=result.url;artworkMessage=result.message}catch(e){artworkMessage=e instanceof Error?e.message:'Music metadata could not be loaded for artwork matching.'}
      if(generation!==this.generation||this.stopped)return
      // Never publish an old lookup after the user changed or hid the current media.
      const current=this.player.state;if(JSON.stringify(current.queue[current.queueIndex]?.target)!==JSON.stringify(state.queue[state.queueIndex]?.target)||current.status!==state.status)return
      this.status.artworkMessage=artworkMessage+(!art&&presence(current,settings)?.assets?' Sending the public Media Center default cover.':'')
      const activity=presence(current,settings,art),signature=JSON.stringify([activity?.details,activity?.state,art,activity===null,current.speed,current.buffering,Math.round(current.position/10)])
      const immediate=activity===null||signature!==this.signature&&Date.now()-this.sentAt>=5000
      if(signature===this.signature||(!immediate&&Date.now()-this.sentAt<15000))return
      const nonce=randomUUID();this.pending={nonce,sent:Date.now()};this.write(1,{cmd:'SET_ACTIVITY',args:{pid:process.pid,activity},nonce});this.signature=signature;this.sentAt=Date.now();this.status.artwork=!!activity?.assets
    }catch{this.status.message='Discord integration is unavailable. Check its settings.'}finally{this.busy=false}
  }
  stop(){this.stopped=true;this.generation++;clearInterval(this.timer);this.player.removeListener('state',this.privacyChanged);this.clear();this.socket?.end();this.socket?.destroy();this.socket=undefined}
}
export function registerDiscord(handle:Handle,rpc:DiscordPresence){handle('discord:get',z.undefined(),()=>rpc.settings());handle('discord:save',discordSchema,i=>rpc.save(i));handle('discord:status',z.undefined(),()=>rpc.status);handle('discord:retry-artwork',z.undefined(),()=>rpc.retryArtwork());handle('discord:artwork',z.object({artist:z.string().trim().max(500),album:z.string().trim().max(500)}).strict(),i=>rpc.correct(i.artist,i.album))}
