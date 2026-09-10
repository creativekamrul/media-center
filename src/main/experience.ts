import {UndoJournal,assertUnchanged} from './undo'
import {dialog,type BrowserWindow} from 'electron'
import {z} from 'zod'
import {experienceSchema,navigationChangeSchema,type SearchGroup} from '../shared/experience'
import type {QueueItem,MusicTrack} from '../shared/types'
import type {InboxEpisode} from '../shared/daily'
import type {LocalPlaylist} from '../shared/local-library'
import {progressKey} from '../shared/timeline'
import {queueItemSchema,id,type Handle} from './features'
import type {Store} from './store'
import type {Player} from './player'
import type {Downloads} from './downloads'
import type {LocalFiles} from './local'
import type {LocalLibrary} from './local-library'
import {Navidrome} from './providers/navidrome'
import {Audiobookshelf} from './providers/audiobookshelf'
import {playlistFile} from './local-playlist-file'
import {trackQueue} from './daily'
import {musicMixItems} from './home-mixes'
export function registerExperience(handle:Handle,store:Store,player:Player,downloads:Downloads,local:LocalFiles,index:LocalLibrary,provider:(id:string)=>Navidrome|Audiobookshelf,window:()=>BrowserWindow,inbox:()=>Promise<InboxEpisode[]>,changed:()=>void,reset:()=>Promise<void>,undo?:UndoJournal){
 const prefs=()=>experienceSchema.parse(store.get('experience')??{})
 const localQueue=(rootId:string,f:{id:string;title:string;artist:string;name:string;duration:number;album:string}):QueueItem=>({target:{kind:'local-file',serverId:'local',rootId,fileId:f.id},title:f.title,subtitle:f.artist||f.name,duration:f.duration,context:f.album})
 handle('experience:get',z.undefined(),prefs)
 handle('navigation:save',navigationChangeSchema,i=>{const current=prefs();store.set('experience',{...current,navigation:i.action==='collections'?{...current.navigation,collections:i.collections}:{...current.navigation,[i.action==='sidebar'?'sidebarCollapsed':'listeningCollapsed']:i.collapsed}});changed()})
 handle('experience:save',experienceSchema,i=>{const assigned=Object.values(i.shortcuts).filter(Boolean).map(s=>s.toLowerCase());if(new Set(assigned).size!==assigned.length)throw Error('Assign each shortcut only once.');store.set('experience',{...i,navigation:prefs().navigation});changed()})
 handle('local:playlist-contents',z.object({rootId:id,id}).strict(),i=>{if(!local.roots().some(r=>r.id===i.rootId))throw Error('Source not found.');const p=(store.get<LocalPlaylist[]>('local-playlists:'+i.rootId)??[]).find(p=>p.id===i.id);if(!p)throw Error('Playlist not found.');return p})
 handle('local:playlist-file',z.object({rootId:id,action:z.enum(['import','export']),id:id.optional()}).strict(),i=>playlistFile(i,local,index,store,window()))
 handle('lyrics:offset',z.object({key:z.string().min(1).max(10000),seconds:z.number().finite().min(-30).max(30).optional()}).strict(),i=>{const item=player.state.queue[player.state.queueIndex];if(!item||!['music-track','local-file'].includes(item.target.kind)||progressKey(item.target)!==i.key)throw Error('The playing song changed.');if(i.seconds!==undefined)store.set('lyric-offset:'+i.key,i.seconds);return store.get<number>('lyric-offset:'+i.key)??0})
 handle('media:details',queueItemSchema,async item=>{
  const t=item.target
  if(t.kind==='music-track'){const p=provider(t.serverId);if(!(p instanceof Navidrome))throw Error('Choose music.');const f=await p.track(t.trackId);return{item:trackQueue(f),favorite:f.starred,details:{Artist:f.artist,Album:f.album,Format:f.codec??'Original',Duration:String(f.duration)+' seconds',Quality:`${f.sampleRate??'?'} Hz · ${f.bitDepth??'?'} bit`,Source:p.connection.name}}}
  if(t.kind==='local-file'){const f=await local.metadata(t.rootId,t.fileId);return{item:localQueue(t.rootId,f),favorite:(store.get<string[]>(`local-favorites:${t.rootId}`)??[]).includes(t.fileId),details:{Artist:f.artist,Album:f.album,Format:f.codec??'Original',File:f.id,Source:local.roots().find(r=>r.id===t.rootId)?.name??'Local'}}}
  return{item,details:{Type:t.kind,Title:item.title,Creator:item.subtitle,Duration:String(item.duration??0)+' seconds'}}
 })
 const lists=async(item:QueueItem)=>{const t=item.target;if(t.kind==='local-file')return(store.get<LocalPlaylist[]>(`local-playlists:${t.rootId}`)??[]).map(p=>({id:p.id,title:p.name}));if(t.kind==='music-track'){const p=provider(t.serverId);if(p instanceof Navidrome)return(await p.catalog({serverId:t.serverId,libraryId:'all',view:'playlists',page:0,search:''})).items.filter(v=>v.kind==='playlist'&&!v.readonly).map(v=>({id:v.id,title:v.title}))}return[]}
 handle('media:playlists',queueItemSchema,lists)
 handle('media:add-playlist',z.object({item:queueItemSchema,id}).strict(),async({item,id})=>{const t=item.target;if(t.kind==='local-file'){const p=(store.get<LocalPlaylist[]>(`local-playlists:${t.rootId}`)??[]).find(p=>p.id===id);if(!p)throw Error('Playlist not found.');const key='local-playlists:'+t.rootId,before=store.get(key);await index.playlist({action:'update',rootId:t.rootId,id,name:p.name,files:[...p.files,t.fileId]});const after=store.get(key);undo?.add('playlist addition',async()=>{assertUnchanged(after,store.get(key));store.set(key,before)})}else if(t.kind==='music-track'){const p=provider(t.serverId);if(!(p instanceof Navidrome))throw Error('Choose music.');const d=await p.collection('playlist',id);if(d.playlist?.readonly)throw Error('This playlist is read only.');await p.savePlaylist({id,name:d.title,comment:d.playlist?.comment??'',public:d.playlist?.public??false,songIds:[...d.tracks.map(t=>t.id),t.trackId]});store.cacheClear();const after=await p.collection('playlist',id);undo?.add('playlist addition',async()=>{const now=await p.collection('playlist',id);assertUnchanged({name:after.title,playlist:after.playlist,tracks:after.tracks.map(t=>t.id)},{name:now.title,playlist:now.playlist,tracks:now.tracks.map(t=>t.id)});await p.savePlaylist({id,name:d.title,comment:d.playlist?.comment??'',public:d.playlist?.public??false,songIds:d.tracks.map(t=>t.id)});store.cacheClear()})}else throw Error('Only music can be added to these playlists.')})
 handle('mix:save',z.object({name:z.string().trim().min(1).max(200),items:z.array(queueItemSchema).min(1).max(500)}).strict(),async({name,items})=>{
  const first=items[0].target
  if(first.kind==='music-track'&&items.every(q=>q.target.kind==='music-track'&&q.target.serverId===first.serverId)){const p=provider(first.serverId);if(!(p instanceof Navidrome))throw Error('Choose music.');await p.savePlaylist({name,comment:'Saved mix',public:false,songIds:items.map(q=>q.target.kind==='music-track'?q.target.trackId:'')});store.cacheClear();return'Saved as a Navidrome playlist.'}
  if(first.kind==='local-file'&&items.every(q=>q.target.kind==='local-file'&&q.target.rootId===first.rootId)){await index.playlist({action:'create',rootId:first.rootId,name,files:items.map(q=>q.target.kind==='local-file'?q.target.fileId:'')});return'Saved as a local playlist.'}
  // Cross-source playlists use the existing named queue format; never transfer IDs across servers.
  const queues=store.get<import('../shared/daily').SavedQueue[]>('savedQueues')??[];if(queues.length>=100)throw Error('Remove a saved queue first.');store.set('savedQueues',[{id:crypto.randomUUID(),name,items,index:0,position:0,updatedAt:Date.now()},...queues]);return'Saved as a cross-source queue in Play queue.'
 })
 handle('home:pins',z.undefined(),async()=>{const result=[];for(const pin of prefs().pins)try{let items:QueueItem[]=[];if(pin.kind==='music'){const p=provider(pin.source);if(p instanceof Navidrome)items=(await p.collection('playlist',pin.id)).tracks.slice(0,500).map(trackQueue)}else{const p=(store.get<LocalPlaylist[]>(`local-playlists:${pin.source}`)??[]).find(p=>p.id===pin.id);if(p)items=await Promise.all(p.files.slice(0,500).map(async id=>localQueue(pin.source,await local.metadata(pin.source,id))))}result.push({pin,items})}catch{result.push({pin,items:[]})}return result})
 handle('search:all',z.string().trim().min(2).max(500),async query=>{
  const groups:SearchGroup[]=[],warnings:string[]=[]
  await Promise.allSettled(store.connections().map(async c=>{try{const p=provider(c.id);if(p instanceof Navidrome){const r=await p.catalog({serverId:c.id,libraryId:'all',view:'songs',page:0,search:query});groups.push({name:c.name+' · Music',items:r.items.filter((t):t is MusicTrack=>t.kind==='music-track').map(trackQueue)})}else for(const library of(await p.libraries()).filter(l=>l.kind==='audiobooks')){const r=await p.catalog({library,page:0,search:query,sort:'media.metadata.title',descending:false,status:'all'});groups.push({name:c.name+' · '+library.name,items:r.items.filter(t=>t.kind==='audiobook').map(t=>({target:{kind:'audiobook',serverId:c.id,bookId:t.id},title:t.title,subtitle:t.subtitle,cover:t.cover,duration:t.duration}))})}}catch{warnings.push(c.name+': search unavailable.')}}))
  for(const root of local.roots())try{const r=await index.query({rootId:root.id,view:'songs',page:0,search:query,sort:'title'});groups.push({name:root.name+' · Local music',items:r.tracks.map(t=>localQueue(root.id,t))})}catch{warnings.push(root.name+': source unavailable.')}
  try{const rows=(await inbox()).filter(e=>(e.item.title+' '+e.showTitle).toLowerCase().includes(query.toLowerCase())).slice(0,100);groups.push({name:'Podcast episodes',items:rows.map(e=>e.item),unavailable:rows.filter(e=>!e.episode.downloaded).map(e=>progressKey(e.item.target))})}catch{warnings.push('Podcast episode search unavailable.')}
  return{groups:groups.sort((a,b)=>a.name.localeCompare(b.name)),warnings}
 })
 player.autoplay=async current=>{if(!prefs().autoplay||!['music-track','local-file'].includes(current.target.kind))return[];let pool:QueueItem[]=[];if(current.target.kind==='local-file'){const r=await index.query({rootId:current.target.rootId,view:'songs',page:0,search:'',sort:'title'});pool=r.tracks.map(t=>localQueue(current.target.kind==='local-file'?current.target.rootId:'',t))}else if(current.target.kind==='music-track'){const p=provider(current.target.serverId);if(p instanceof Navidrome){const t=await p.track(current.target.trackId);const r=await p.catalog({serverId:current.target.serverId,libraryId:'all',view:'songs',page:0,search:t.artist});pool=r.items.filter((t):t is MusicTrack=>t.kind==='music-track').map(trackQueue)}}const used=new Set(player.state.queue.map(q=>progressKey(q.target)));const candidates=musicMixItems(pool.filter(q=>!used.has(progressKey(q.target))));for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}return candidates.slice(0,20)}
 handle('data:reset',z.enum(['cache','personal','all']),async scope=>{const labels={cache:'Clear cached artwork, metadata and library indexes? They will be rebuilt. Saved listening data and original media are kept.',personal:'Remove local history, statistics, notes, plans, queues, local favorites/playlists, lyric matches, personal shelves, offline plans, custom metadata/artwork, show preferences and list views? Server accounts, preferences, original files and server data are kept.',all:'Reset Media Center and remove its saved accounts, keys, preferences, personal data and downloaded copies? The app will restart. Original local files and server data are kept.'};const answer=await dialog.showMessageBox(window(),{type:'warning',title:'Reset Media Center',message:labels[scope],buttons:['Cancel','Remove data'],defaultId:0,cancelId:0,noLink:true});if(answer.response!==1)return false
  if(scope==='all'){await reset();return true}
  if(scope==='personal'){undo?.clear();await player.command({action:'stop'});await player.edit({action:'clear'});store.resetData('personal')}else store.resetData('cache')
  changed();return true
 })
}
