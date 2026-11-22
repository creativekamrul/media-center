import {randomUUID} from 'node:crypto'
import type {Store} from './store'
import type {Player} from './player'
import type {Downtify,DtRecord} from './providers/downtify'
import type {PlaybackState} from '../shared/types'
type Report={serverId:string;track_id:string;play_id:string;played_at:string}
/** Only completed listening time counts; seeking forwards cannot create a listen. */
export function trackDowntifyListening(player:Player,store:Store,provider:(id:string)=>Downtify){
 let context:{key:string;play:string;elapsed:number;at:number;playing:boolean;sent:boolean}|undefined,busy=false,lastActivity=0,lastState=''
 const key='downtify:listen-outbox'
 const flush=async()=>{if(busy||store.get<{scrobble?:boolean}>('preferences')?.scrobble===false)return;busy=true;try{for(const report of store.get<Report[]>(key)??[]){try{await provider(report.serverId).json('api/discover/listens',{}, {track_id:report.track_id,play_id:report.play_id,played_at:report.played_at});store.set(key,(store.get<Report[]>(key)??[]).filter(r=>r.play_id!==report.play_id))}catch{break}}}finally{busy=false}}
 const update=(state:PlaybackState)=>{const item=state.queue[state.queueIndex],target=item?.target,now=Date.now();if(state.privateListening||store.get<{scrobble?:boolean}>('preferences')?.scrobble===false||target?.kind!=='downtify-track'){context=undefined;return}const record=store.get<DtRecord>(`downtify:track:${target.serverId}:${target.trackId}`);if(!record?.remoteId)return
  const identity=JSON.stringify([target.serverId,target.trackId,state.queueIndex]);if(!context||context.key!==identity||state.status==='loading')context={key:identity,play:randomUUID(),elapsed:0,at:now,playing:false,sent:false}
  if(context.playing&&!state.buffering)context.elapsed+=Math.min(2,Math.max(0,(now-context.at)/1000));context.at=now;context.playing=state.status==='playing'&&!state.buffering
  if(!context.sent&&state.duration>0&&context.elapsed>=Math.min(240,state.duration/2)){context.sent=true;const rows=store.get<Report[]>(key)??[];if(rows.length<500)store.set(key,[...rows,{serverId:target.serverId,track_id:record.remoteId,play_id:context.play,played_at:new Date().toISOString()}]);void flush()}
  const status=state.status==='playing'?'playing':state.status==='paused'?'paused':'stopped';if(now-lastActivity>30000||lastState!==identity+status){lastActivity=now;lastState=identity+status;void provider(target.serverId).json('api/activity/playback',{}, {player:store.get<string>('deviceId'),state:status,track:{track_id:record.remoteId,title:item.title,artist:item.subtitle,album:item.context??'',duration:state.duration},position:state.position}).catch(()=>{})}
 }
 player.on('state',update);const timer=setInterval(()=>void flush(),30000);return()=>{clearInterval(timer);player.off('state',update)}
}
