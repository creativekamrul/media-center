import { recapRangeSchema } from '../shared/recap'
import { dialog, nativeImage, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { z } from 'zod'
import { defaultDailySettings, type SavedQueue, type ListeningNote, type SmartPlaylist, type InboxEpisode, type HomeData } from '../shared/daily'
import type { QueueItem, MusicTrack, MusicAlbum } from '../shared/types'
import { progressKey } from '../shared/timeline'
import { Store } from './store'
import { Player } from './player'
import { Downloads } from './downloads'
import { Navidrome } from './providers/navidrome'
import { Audiobookshelf } from './providers/audiobookshelf'
import { parseAbsItem } from './providers/abs-models'
import { id, queueItemSchema, spokenTarget, preferenceSchema, type Handle } from './features'

export const dailySchema = z.object({ downloadLimitGB: z.number().min(1).max(10000), smartRewind: z.boolean(), shortRewind: z.number().min(0).max(60), longRewind: z.number().min(0).max(120), gapless: z.boolean(), dailyGoalMinutes: z.number().int().min(0).max(1440) }).strict()
const name = z.string().trim().min(1).max(200), position = z.number().finite().nonnegative()
const savedQueueSchema = z.object({ id, name, items: z.array(queueItemSchema).min(1).max(5000), index: z.number().int().nonnegative(), position, updatedAt: position }).strict().refine(q => q.index < q.items.length)
const noteInput = z.object({ id: id.optional(), item: queueItemSchema, position, title: name, text: z.string().max(10000) }).strict()
const noteSchema = noteInput.extend({ id, updatedAt: position })
const ruleInput = z.object({ id: id.optional(), name, serverId: id, libraryId: id, favorite: z.boolean(), minRating: z.number().int().min(0).max(5), genre: z.string().max(500), artist: z.string().max(500), neverPlayed: z.boolean(), minYear: z.number().int().min(0).max(3000), maxYear: z.number().int().min(0).max(3000), order: z.enum(['title','artist','random']), limit: z.number().int().min(1).max(5000) }).strict()
const ruleSchema = ruleInput.extend({ id })
const planSchema = z.object({ id, item: queueItemSchema, due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(5000), done: z.boolean(), createdAt: position }).strict()
export const backupSchema = z.object({ format: z.literal('media-center-personal'), version: z.literal(1), preferences: preferenceSchema, dailySettings: dailySchema, servers: z.array(z.object({ id, provider: z.enum(['navidrome','audiobookshelf']), name, url: z.string().url().max(2048), username: z.string().max(256) }).strict()).max(100), folders: z.array(z.object({ id, name, path: z.string().max(4096) }).strict()).max(100), queues: z.array(savedQueueSchema).max(100), notes: z.array(noteSchema).max(10000), plans: z.array(planSchema).max(10000), rules: z.array(ruleSchema).max(100) }).strict()
export function trackQueue(t: MusicTrack): QueueItem { return { target: { kind: 'music-track', serverId: t.serverId, trackId: t.id }, title: t.title, subtitle: t.artist, context: t.album, cover: t.cover, duration: t.duration } }
export function matchesRule(t: MusicTrack, r: SmartPlaylist) { return (!r.favorite || t.starred) && (t.rating ?? 0) >= r.minRating && (!r.genre || t.genre?.toLowerCase() === r.genre.toLowerCase()) && (!r.artist || t.artist.toLowerCase().includes(r.artist.toLowerCase())) && (!r.neverPlayed || !t.playCount) && (!r.minYear || (t.year ?? 0) >= r.minYear) && (!r.maxYear || (t.year ?? 9999) <= r.maxYear) }

export function registerDaily(handle: Handle, store: Store, player: Player, downloads: Downloads, provider: (id: string) => Navidrome | Audiobookshelf, window: () => BrowserWindow) {
  const nav = (id: string) => { const p = provider(id); if (!(p instanceof Navidrome)) throw new Error('Choose a Navidrome server.'); return p }
  const get = <T>(key: string): T[] => store.get<T[]>(key) ?? []
  const put = <T extends { id: string }>(key: string, value: T, max: number) => { const all = get<T>(key).filter(x => x.id !== value.id); if (all.length >= max) throw new Error(`This collection is limited to ${max} entries.`); store.set(key, [value,...all]); return value }
  const remove = (key: string, id: string) => store.set(key, get<{id:string}>(key).filter(x => x.id !== id))
  handle('daily:get', z.undefined(), () => ({ ...defaultDailySettings, ...store.get('dailySettings') as object }))
  handle('daily:save', dailySchema, i => store.set('dailySettings', i))
  handle('downloads:list', z.undefined(), () => downloads.snapshot())
  handle('downloads:batch', z.object({ ids: z.array(z.string().uuid()).min(1).max(1000), action: z.enum(['pause','retry','remove']) }).strict(), async i => {
    const current = player.state.queue[player.state.queueIndex]
    if (i.action === 'remove' && current && player.state.status !== 'idle' && downloads.snapshot().entries.some(e => i.ids.includes(e.id) && progressKey(e.item.target) === progressKey(current.target))) throw new Error('Stop playback before removing the selected download that is playing.')
    return downloads.batch(i.ids, i.action)
  })
  handle('downloads:add', z.array(queueItemSchema).min(1).max(1000), i => downloads.add(i))
  handle('downloads:action', z.object({ id, action: z.enum(['pause','retry','remove']) }).strict(), async i => {
    const entry = downloads.snapshot().entries.find(e => e.id === i.id), current = player.state.queue[player.state.queueIndex]
    if (i.action === 'remove' && entry && current && progressKey(current.target) === progressKey(entry.item.target) && player.state.status !== 'idle') throw new Error('Stop playback before removing this download.')
    await downloads.action(i.id, i.action)
  })
  let progressPreview: {token:string;target:z.infer<typeof spokenTarget>;position:number;duration:number;serverPosition:number;serverUpdatedAt?:number;localUpdatedAt:number;expires:number}|undefined
  const remoteProgress=async(target:z.infer<typeof spokenTarget>)=>{const p=provider(target.serverId);if(!(p instanceof Audiobookshelf))throw new Error('Choose spoken audio.');const map=await p.progressMap();return {provider:p,progress:map.get(JSON.stringify([target.kind==='audiobook'?target.bookId:target.showId,target.kind==='podcast-episode'?target.episodeId:null]))}}
  handle('offline:preview',id,async id=>{
    const entry=downloads.snapshot().entries.find(e=>e.id===id);if(!entry)throw new Error('Download was removed.');const target=spokenTarget.parse(entry.item.target),current=player.state.queue[player.state.queueIndex]
    if(current&&progressKey(current.target)===progressKey(target))await player.command({action:'stop'})
    const local=store.get<{position:number;duration:number;updatedAt:number}>(`offlineResume:${progressKey(target)}`);if(!local)throw new Error('No offline listening position is saved yet.')
    const {progress}=await remoteProgress(target),token=randomUUID();progressPreview={token,target,position:local.position,duration:local.duration,serverPosition:progress?.position??0,serverUpdatedAt:progress?.updatedAt,localUpdatedAt:local.updatedAt,expires:Date.now()+120000};return {token,localPosition:local.position,serverPosition:progress?.position??0,serverUpdatedAt:progress?.updatedAt}
  })
  handle('offline:sync',id,async token=>{
    const preview=progressPreview;if(!preview||preview.token!==token||preview.expires<Date.now())throw new Error('Preview the server position again before syncing.')
    const {provider:p,progress}=await remoteProgress(preview.target)
    if((progress?.position??0)!==preview.serverPosition||progress?.updatedAt!==preview.serverUpdatedAt)throw new Error('Server progress changed since the preview. Preview again before replacing it.')
    const local=store.get<{updatedAt:number}>(`offlineResume:${progressKey(preview.target)}`);if(local?.updatedAt!==preview.localUpdatedAt)throw new Error('Offline progress changed since the preview. Preview again before syncing.');
    progressPreview=undefined;await p.saveCheckpoint(preview.target,preview.position,preview.duration);store.set(`offlineResume:${progressKey(preview.target)}`,{position:preview.position,duration:preview.duration,updatedAt:Date.now(),syncPending:false});player.acknowledgeOffline(preview.target);store.cacheClear()
  })
  handle('saved-queues:list', z.undefined(), () => get<SavedQueue>('savedQueues'))
  handle('saved-queues:save', z.object({ id: id.optional(), name }).strict(), i => { if (!player.state.queue.length) throw new Error('Add items to the play queue first.'); return put('savedQueues', { id: i.id ?? randomUUID(), name: i.name, items: structuredClone(player.state.queue), index: player.state.queueIndex, position: player.state.position, updatedAt: Date.now() },100) })
  handle('saved-queues:load', z.object({ id, play: z.boolean() }).strict(), async i => { const q = get<SavedQueue>('savedQueues').find(q => q.id === i.id); if (!q) throw new Error('Saved queue was removed.'); if (i.play) await player.play(q.items,q.index,q.position); else await player.restoreQueue(q.items,q.index) })
  handle('saved-queues:delete', id, i => remove('savedQueues',i))
  handle('notes:list', z.undefined(), () => get<ListeningNote>('notes'))
  handle('notes:save', noteInput, i => put('notes', { ...i, id: i.id ?? randomUUID(), updatedAt: Date.now() },10000))
  handle('notes:delete', id, i => remove('notes',i))
  handle('rules:list', z.undefined(), () => get<SmartPlaylist>('smartPlaylists'))
  handle('rules:save', ruleInput, i => { nav(i.serverId); return put('smartPlaylists',{ ...i, id: i.id ?? randomUUID() },100) })
  handle('rules:delete', id, i => remove('smartPlaylists',i))
  handle('rules:run', id, async id => {
    const r = get<SmartPlaylist>('smartPlaylists').find(r => r.id === id); if (!r) throw new Error('Rule playlist was removed.')
    const p = nav(r.serverId), tracks: MusicTrack[] = []
    for (let page=0; ;page++) { const result = await p.catalog({ serverId:r.serverId,libraryId:r.libraryId,view:'songs',search:'',page }); tracks.push(...result.items.filter((t): t is MusicTrack => t.kind === 'music-track')); if (!result.hasMore) break; if (page >= 1666) throw new Error('Rule evaluation supports up to 100,000 tracks. Choose a smaller music library.') }
    const selected = tracks.filter(t => matchesRule(t,r))
    if (r.order === 'random') for (let i=selected.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [selected[i],selected[j]]=[selected[j],selected[i]] }
    else selected.sort((a,b) => (r.order === 'artist' ? a.artist.localeCompare(b.artist) : 0) || a.title.localeCompare(b.title))
    return selected.slice(0,r.limit).map(trackQueue)
  })
  handle('recap:get',recapRangeSchema,i=>store.listeningRecap(i))
  handle('recap:export',z.object({range:recapRangeSchema,png:z.string().max(16000000).startsWith('data:image/png;base64,')}).strict(),async i=>{
    const bytes=Buffer.from(i.png.slice('data:image/png;base64,'.length),'base64')
    if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Invalid recap image.')
    // Check dimensions before asking Electron to decode untrusted image bytes.
    if(bytes.length<24||bytes.readUInt32BE(16)!==1080||bytes.readUInt32BE(20)!==1440)throw new Error('Invalid recap image dimensions.')
    const picture=nativeImage.createFromBuffer(bytes);if(picture.isEmpty())throw new Error('Could not read the recap image.')
    const result=await dialog.showSaveDialog(window(),{title:'Save your listening recap',defaultPath:`Media-Center-recap-${i.range.start}-to-${i.range.end}.png`,filters:[{name:'PNG image',extensions:['png']}]})
    if(result.canceled||!result.filePath)return false
    await writeFile(result.filePath,picture.toPNG());return true
  })
  handle('stats:get', z.undefined(), () => store.listeningStats())

  let inboxWork: Promise<InboxEpisode[]> | undefined
  let inboxWarnings: string[] = []
  const refreshInbox = () => inboxWork ??= (async () => {
    const episodes: InboxEpisode[] = []; inboxWarnings = []
    for (const c of store.connections().filter(c => c.provider === 'audiobookshelf')) {
      try {
        const p = provider(c.id) as Audiobookshelf, libraries = (await p.libraries()).filter(l => l.kind === 'podcasts'), progress = await p.progressMap()
        for (const library of libraries) for (let page=0; ;page++) {
          const result = await p.browse(library,page,'')
          // Expanded shows are fetched in bounded batches; one progress snapshot covers every episode.
          for (let i=0;i<result.items.length;i+=4) {
            const batch = await Promise.allSettled(result.items.slice(i,i+4).map(async summary => {
              const show = parseAbsItem(await p.get(`api/items/${encodeURIComponent(summary.id)}?expanded=1`),c.id)
              if (show.kind !== 'podcast-show') throw new Error('Unexpected media type in podcast library.')
              return show.episodes.map(episode => ({ episode: { ...episode, progress: progress.get(JSON.stringify([show.id,episode.id])) }, showTitle: show.title, item: { target:{kind:'podcast-episode' as const,serverId:c.id,showId:show.id,episodeId:episode.id},title:episode.title,subtitle:show.title,cover:show.id,duration:episode.duration } }))
            }))
            for (const r of batch) if (r.status === 'fulfilled') episodes.push(...r.value); else inboxWarnings.push(`${c.name}: a show could not be refreshed.`)
          }
          if (!result.hasMore) break
          if (episodes.length > 100000 || page >= 1666) throw new Error('Podcast index exceeds the 100,000 episode limit.')
        }
      } catch { inboxWarnings.push(`${c.name}: inbox refresh was incomplete. Check the server connection.`) }
    }
    if (!inboxWarnings.length) store.cacheSet('podcast-inbox',episodes)
    return episodes
  })().finally(() => { inboxWork = undefined })
  const inbox = async (refresh=false) => { const cached=store.cache<InboxEpisode[]>('podcast-inbox'); if (!cached || refresh) return refreshInbox(); if (Date.now()-cached.updated>300000) void refreshInbox().catch(()=>{}); return cached.value.filter(e => store.connections().some(c=>c.id===e.item.target.serverId)) }
  handle('inbox:list', z.object({ page:z.number().int().min(0),search:z.string().max(500),status:z.enum(['all','unfinished','in-progress','finished']),sort:z.enum(['newest','oldest','show']),refresh:z.boolean().optional() }).strict(), async i => {
    const rows=(await inbox(i.refresh)).filter(e => `${e.episode.title} ${e.showTitle}`.toLowerCase().includes(i.search.toLowerCase()) && (i.status==='all' || (i.status==='unfinished' ? e.episode.progress?.status!=='finished' : e.episode.progress?.status===i.status)))
    rows.sort((a,b)=>i.sort==='show'?a.showTitle.localeCompare(b.showTitle)||(b.episode.publishedAt??0)-(a.episode.publishedAt??0):((b.episode.publishedAt??0)-(a.episode.publishedAt??0))*(i.sort==='oldest'?-1:1))
    return { items:rows.slice(i.page*60,(i.page+1)*60),total:rows.length,page:i.page,updatedAt:store.cache('podcast-inbox')?.updated??Date.now(),warnings:inboxWarnings }
  })
  handle('inbox:status', z.object({targets:z.array(spokenTarget).min(1).max(100),finished:z.boolean()}).strict(), async i => {
    let updated=0,failed=0
    for (const target of i.targets) try { const p=provider(target.serverId); if (!(p instanceof Audiobookshelf)) throw new Error(); const current=player.state.queue[player.state.queueIndex]; if(current && progressKey(current.target)===progressKey(target)) await player.command({action:'stop'}); await p.setProgress(target,i.finished?'finished':'unfinished'); updated++ } catch { failed++ }
    store.cacheClear(); return {updated,failed}
  })
  handle('home:get', z.boolean().optional(), async refresh => {
    const data:HomeData={continuing:[],albums:[],episodes:[],warnings:[]}
    const results=await Promise.allSettled(store.connections().map(async c => { const p=provider(c.id); if(p instanceof Audiobookshelf) data.continuing.push(...await p.continuing()); else { const result=await p.catalog({serverId:c.id,libraryId:'all',view:'recent',page:0,search:''}); data.albums.push(...result.items.filter((i):i is MusicAlbum=>i.kind==='album').slice(0,8)) } }))
    results.forEach((r,i)=>{if(r.status==='rejected') data.warnings.push(`${store.connections()[i]?.name}: could not refresh Home.`)})
    data.continuing.sort((a,b)=>(b.progress.updatedAt??0)-(a.progress.updatedAt??0))
    data.episodes=(await inbox(refresh)).filter(e=>e.episode.progress?.status!=='finished').sort((a,b)=>(b.episode.publishedAt??0)-(a.episode.publishedAt??0)).slice(0,12);data.warnings.push(...inboxWarnings)
    return data
  })
  const jsonFile = async (title:string) => { const d=await dialog.showOpenDialog(window(),{title,properties:['openFile'],filters:[{name:'Media Center JSON',extensions:['json']}]}); if(d.canceled||!d.filePaths[0]) return null; if((await stat(d.filePaths[0])).size>25*1024*1024) throw new Error('File exceeds the 25 MB import limit.'); return JSON.parse(await readFile(d.filePaths[0],'utf8')) as unknown }
  const saveFile = async (title:string,defaultPath:string,value:unknown) => {const d=await dialog.showSaveDialog(window(),{title,defaultPath,filters:[{name:'Media Center JSON',extensions:['json']}]});if(d.canceled||!d.filePath)return false;await writeFile(d.filePath,JSON.stringify(value,null,2),'utf8');return true}
  handle('playlist:export',z.object({serverId:id,id}).strict(),async i=>{const p=nav(i.serverId),d=await p.collection('playlist',i.id);return saveFile('Export playlist','playlist.json',{format:'media-center-playlist',version:1,name:d.title,server:p.connection.url,tracks:d.tracks.map(t=>({id:t.id,title:t.title,artist:t.artist,album:t.album}))})})
  handle('playlist:import',z.object({serverId:id}).strict(),async i=>{const raw=await jsonFile('Import a Media Center playlist');if(!raw)return null;const data=z.object({format:z.literal('media-center-playlist'),version:z.literal(1),name,server:z.string().url(),tracks:z.array(z.object({id,title:z.string(),artist:z.string(),album:z.string()}).strict()).max(5000)}).strict().parse(raw),p=nav(i.serverId);if(data.server!==p.connection.url)throw new Error('This playlist belongs to a different server. Track IDs cannot be transferred between servers.');for(const t of data.tracks)await p.track(t.id);await p.savePlaylist({name:data.name,comment:'Imported from Media Center',public:false,songIds:data.tracks.map(t=>t.id)});store.cacheClear();return{name:data.name,count:data.tracks.length}})
  let pendingBackup: {token:string,data:z.infer<typeof backupSchema>,expires:number}|undefined
  handle('backup:export',z.undefined(),()=>saveFile('Export personal backup','media-center-backup.json',backupSchema.parse({format:'media-center-personal',version:1,preferences:store.preferences(),dailySettings:{...defaultDailySettings,...store.get('dailySettings') as object},servers:store.connections(),folders:store.get('localRoots')??[],queues:get('savedQueues'),notes:get('notes'),plans:store.laterList(),rules:get('smartPlaylists')})))
  const mappings = (data:z.infer<typeof backupSchema>) => ({ servers:new Map(data.servers.map(s=>[s.id,store.connections().find(c=>c.provider===s.provider&&c.url===s.url&&c.username===s.username)?.id])),folders:new Map(data.folders.map(f=>[f.id,get<{id:string,path:string}>('localRoots').find(r=>r.path.toLowerCase()===f.path.toLowerCase())?.id])) })
  handle('backup:preview',z.undefined(),async()=>{const raw=await jsonFile('Preview personal backup');if(!raw)return null;const data=backupSchema.parse(raw),m=mappings(data),token=randomUUID();pendingBackup={token,data,expires:Date.now()+600000};return{token,queues:data.queues.length,notes:data.notes.length,plans:data.plans.length,rules:data.rules.length,unmatchedServers:[...m.servers.values()].filter(x=>!x).length,unmatchedFolders:[...m.folders.values()].filter(x=>!x).length}})
  handle('backup:restore',id,async token=>{if(!pendingBackup||pendingBackup.token!==token||pendingBackup.expires<Date.now())throw new Error('Preview the backup again before restoring.');const {data}=pendingBackup,m=mappings(data);if([...m.servers.values(),...m.folders.values()].some(x=>!x))throw new Error('Connect the missing servers and add the original local folders before restoring.');const remap=(q:QueueItem):QueueItem=>({...q,target:q.target.kind==='local-file'?{...q.target,rootId:m.folders.get(q.target.rootId)!}:{...q.target,serverId:m.servers.get(q.target.serverId)!}});for(const q of [...data.queues.flatMap(q=>q.items),...data.notes.map(n=>n.item),...data.plans.map(p=>p.item)])if(q.target.kind==='local-file'?!m.folders.get(q.target.rootId):!m.servers.get(q.target.serverId))throw new Error('Backup contains an unknown media source.');for(const r of data.rules)if(!m.servers.get(r.serverId))throw new Error('Backup contains an unknown playlist source.');await player.command({action:'stop'});store.restorePersonal({preferences:data.preferences,dailySettings:data.dailySettings,savedQueues:data.queues.map(q=>({...q,items:q.items.map(remap)})),notes:data.notes.map(n=>({...n,item:remap(n.item)})),listenLater:data.plans.map(p=>({...p,item:remap(p.item)})),smartPlaylists:data.rules.map(r=>({...r,serverId:m.servers.get(r.serverId)!}))});pendingBackup=undefined})
}
