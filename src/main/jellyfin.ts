import type {VideoHost} from './video-host'
import { randomUUID, randomInt } from 'node:crypto'
import { z } from 'zod'
import { jfBrowse, jfCommand, jfId, jfRef, type JfConnection } from '../shared/jellyfin'
import { Jellyfin } from './providers/jellyfin'
import { JellyfinPlayer } from './jellyfin-player'
import { serverUrl } from './providers/http'
import type { Store } from './store'
type Handle=<T extends z.ZodTypeAny>(channel:string,schema:T,action:(input:z.infer<T>)=>unknown)=>void
export function registerJellyfin(handle:Handle,store:Store,pauseOther:()=>Promise<void>,video?:VideoHost,isPrivate:()=>boolean=()=>false){
 const connections=()=>store.get<JfConnection[]>('jellyfin:connections')??[]
 const provider=(id:string)=>{const c=connections().find(c=>c.id===id);if(!c)throw Error('Jellyfin connection was removed.');const token=store.secret(`jellyfin:${id}`);if(!token)throw Error('Reconnect to Jellyfin in Settings.');return new Jellyfin(c,token,store.get<string>('deviceId')!)}
 const player=new JellyfinPlayer(store,provider,pauseOther,undefined,video,isPrivate)
 handle('jellyfin:pointer-active',z.undefined(),()=>video?.pointerActive()??false)
 handle('jellyfin:video-bounds',z.object({x:z.number().finite().min(0).max(32768),y:z.number().finite().min(0).max(32768),width:z.number().finite().min(0).max(32768),height:z.number().finite().min(0).max(32768),visible:z.boolean(),occlusions:z.array(z.object({x:z.number().finite().min(0).max(32768),y:z.number().finite().min(0).max(32768),width:z.number().finite().min(0).max(32768),height:z.number().finite().min(0).max(32768)}).strict()).max(8).optional()}).strict(),bounds=>{video?.update(bounds);if(!bounds.visible){video?.fullscreen(false);player.setFullscreen(false)}})
 handle('jellyfin:connections',z.undefined(),connections)
 handle('jellyfin:connect',z.object({id:jfId.optional(),name:z.string().trim().max(100),url:z.string().url().max(2000),username:z.string().trim().min(1).max(200),password:z.string().max(1000)}).strict(),async input=>{
  const url=serverUrl(input.url,'').href;const editing=input.id?connections().find(c=>c.id===input.id):undefined
  if(input.id&&!editing)throw Error('This server was removed. Refresh Settings.')
  if(editing&&!input.password&&(url!==editing.url||input.username!==editing.username))throw Error('Enter the password again when changing the address or username.')
  let result
  if(editing&&!input.password){await provider(editing.id).libraries();result={token:store.secret('jellyfin:'+editing.id),userId:editing.userId,username:editing.username,version:editing.version,serverName:editing.name}}
  else result=await Jellyfin.login(url,input.username,input.password,store.get<string>('deviceId')!)
  if(editing&&editing.userId!==result.userId)throw Error('This is a different account. Add it as a new connection to keep library identities separate.')
  const previous=connections().find(c=>c.url===url&&c.userId===result.userId)
  const c:JfConnection={id:editing?.id??previous?.id??randomUUID(),name:input.name||result.serverName||'Jellyfin',url,username:result.username,userId:result.userId,version:result.version}
  if(editing&&player.state.queue[player.state.index]?.serverId===c.id)await player.command({action:'stop'});
  store.cacheClear(`jellyfin:${c.id}:`);store.setSecret(`jellyfin:${c.id}`,result.token);store.set('jellyfin:connections',[...connections().filter(x=>x.id!==c.id),c]);return c
 })
 handle('jellyfin:test',jfId,async id=>{const libraries=await provider(id).libraries();return `Connection successful · ${libraries.length} supported libraries.`})
 handle('jellyfin:remove',jfId,async id=>{if(player.state.queue[player.state.index]?.serverId===id)await player.command({action:'stop'});store.set('jellyfin:connections',connections().filter(c=>c.id!==id));store.set(`secret:jellyfin:${id}`,'');store.cacheClear(`jellyfin:${id}:`)})
 handle('jellyfin:libraries',jfId,id=>provider(id).libraries())
 handle('jellyfin:browse',jfBrowse,input=>provider(input.serverId).browse(input))
 handle('jellyfin:related',jfRef,i=>provider(i.serverId).related(i.itemId))
 handle('jellyfin:next-up',jfRef,i=>provider(i.serverId).nextUp(i.itemId))
 handle('jellyfin:detail',jfRef,i=>provider(i.serverId).detail(i.itemId))
 handle('jellyfin:cover',jfRef.extend({image:z.enum(['Primary','Backdrop','Logo']).optional()}),async i=>{const key=`jellyfin:${i.serverId}:cover:${i.image??'Primary'}:${i.itemId}`;const cached=store.cache<string>(key);if(cached&&Date.now()-cached.updated<86400000)return cached.value;const data=await provider(i.serverId).cover(i.itemId,i.image);if(data)store.cacheSet(key,data);return data})
 handle('jellyfin:mark',jfRef.extend({field:z.enum(['favorite','played']),value:z.boolean()}),i=>provider(i.serverId).mark(i.itemId,i.field,i.value))
 handle('jellyfin:play',z.object({serverId:jfId,itemIds:z.array(jfId).min(1).max(5000),index:z.number().int().min(0),restart:z.boolean().optional()}).strict(),async i=>{
  if(i.index>=i.itemIds.length)throw Error('Queue position is out of bounds.')
  const p=provider(i.serverId);const items:import('../shared/jellyfin').JfItem[]=[];for(const id of i.itemIds)items.push(await p.detail(id))
  if(items.length===1&&items[0].kind==='Episode'&&items[0].seriesId){const episodes=await p.episodes(items[0].seriesId);const index=episodes.findIndex(e=>e.id===items[0].id);if(index>=0)return player.play(episodes,index,i.restart)}
  await player.play(items,i.index,i.restart)
 })
 handle('jellyfin:collection',jfBrowse.extend({shuffle:z.boolean().optional(),index:z.number().int().min(0).max(4999).optional()}),async q=>{const items=await provider(q.serverId).collection(q);if(q.shuffle)for(let i=items.length-1;i>0;i--){const j=randomInt(i+1);[items[i],items[j]]=[items[j],items[i]]}await player.play(items,q.index??0)})
 handle('jellyfin:get',z.undefined(),()=>structuredClone(player.state))
 handle('jellyfin:command',jfCommand,c=>player.command(c))
 return player
}
