import { EventEmitter } from 'node:events'
import { randomUUID, createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat, realpath, lstat } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { z } from 'zod'
import type { Chapter, PlayTarget, QueueItem } from '../shared/types'
import { defaultDailySettings, type DailySettings, type DownloadEntry, type DownloadState } from '../shared/daily'
import { progressKey } from '../shared/timeline'
import { Store } from './store'
import { Navidrome } from './providers/navidrome'
import { Audiobookshelf } from './providers/audiobookshelf'
import { parseAbsItem } from './providers/abs-models'
import { serverUrl } from './providers/http'

export interface OfflineFile { name: string; startOffset: number; duration: number; bytes: number }
export interface OfflineMedia { entry: DownloadEntry; files: (OfflineFile & { path: string })[]; cover?: string }
interface RecordEntry extends DownloadEntry { manifest?:string; validators?:string[]; files: OfflineFile[]; cover?: string; partial?:{index:number;validator:string;total:number} }
interface SourceFile { url: string; headers: Record<string,string>; startOffset: number; duration: number; size: number }
const audioFile = z.object({ ino: z.union([z.string(), z.number()]), duration: z.number().nonnegative(), startOffset: z.number().nonnegative().optional(), metadata: z.object({ size: z.number().nonnegative().optional() }).passthrough().optional() }).passthrough()

export async function downloadSource(item: QueueItem, provider: Navidrome | Audiobookshelf): Promise<{ files: SourceFile[]; duration: number; chapters: Chapter[] }> {
  const target = item.target
  if (target.kind === 'music-track' && provider instanceof Navidrome) {
    const track = await provider.track(target.trackId)
    return { files: [{ url: provider.url('download', { id: track.id }).href, headers: {}, startOffset: 0, duration: track.duration, size: 0 }], duration: track.duration, chapters: [] }
  }
  if (!(provider instanceof Audiobookshelf) || (target.kind !== 'audiobook' && target.kind !== 'podcast-episode')) throw new Error('Only server music, books and episodes can be downloaded.')
  const itemId = target.kind === 'audiobook' ? target.bookId : target.showId
  const raw = await provider.get(`api/items/${encodeURIComponent(itemId)}?expanded=1`)
  const parsed = parseAbsItem(raw, target.serverId)
  let files: z.infer<typeof audioFile>[]
  if (target.kind === 'audiobook') {
    if (parsed.kind !== 'audiobook') throw new Error('The download target is not an audiobook.')
    // Expanded book tracks are ordered, included physical files with whole-book offsets.
    files = z.object({ media: z.object({ tracks: z.array(audioFile) }) }).parse(raw).media.tracks
  } else {
    if (parsed.kind !== 'podcast-show') throw new Error('The download target is not a podcast.')
    const episodes = z.object({ media: z.object({ episodes: z.array(z.object({ id: z.string(), audioFile: audioFile.nullish() })) }) }).parse(raw).media.episodes
    const episode = episodes.find(e => e.id === target.episodeId)
    if (!episode?.audioFile) throw new Error('This episode has no downloaded audio on Audiobookshelf.')
    files = [episode.audioFile]
  }
  if (!files.length) throw new Error('No original audio files are available.')
  let offset = 0
  const sources = files.map(file => { const startOffset = file.startOffset ?? offset; offset = startOffset + file.duration; return { url: serverUrl(provider.connection.url, `api/items/${encodeURIComponent(itemId)}/file/${encodeURIComponent(String(file.ino))}/download`).href, headers: provider.headers, startOffset, duration: file.duration, size: file.metadata?.size ?? 0 } })
  return { files: sources, duration: parsed.kind === 'audiobook' ? parsed.duration : offset, chapters: parsed.kind === 'audiobook' ? parsed.chapters : [] }
}

export class Downloads extends EventEmitter {
  private entries: RecordEntry[]
  private running?: { id: string; controller: AbortController; done: Promise<void>; remove: boolean }
  private actionTail: Promise<unknown> = Promise.resolve()
  private editing = false
  private stopped = false
  constructor(private root: string, private store: Store, private provider: (id: string) => Navidrome | Audiobookshelf) {
    super(); this.entries = store.get<RecordEntry[]>('downloads') ?? []
    for (const e of this.entries) if (e.status === 'downloading' || e.status === 'queued') { e.status = 'paused'; e.error = 'Interrupted by app exit. Resume to continue downloading.' }
    this.persist()
  }
  private publicEntry({ files: _files, cover: _cover, partial:_partial,manifest:_manifest,validators:_validators, ...entry }: RecordEntry): DownloadEntry { return entry }
  snapshot(): DownloadState { return { entries: this.entries.map(e => this.publicEntry(e)), usedBytes: this.entries.reduce((n,e) => n+e.bytes,0), limitBytes: (this.store.get<DailySettings>('dailySettings')?.downloadLimitGB ?? defaultDailySettings.downloadLimitGB) * 1024 ** 3 } }
  private persist() { this.store.set('downloads', this.entries); this.emit('state', this.snapshot()) }
  async add(items: QueueItem[]) {
    for (const item of items) {
      if (!['music-track','audiobook','podcast-episode'].includes(item.target.kind)) continue
      if (this.entries.some(e => progressKey(e.item.target) === progressKey(item.target))) continue
      if (this.entries.length >= 1000) throw new Error('Remove some downloads before adding more (1,000 item limit).')
      this.entries.push({ id: randomUUID(), item, status: 'queued', bytes: 0, total: 0, createdAt: Date.now(), duration: item.duration ?? 0, chapters: [], files: [] })
    }
    this.persist(); void this.pump()
  }
  private folder(id: string) { if (!/^[\da-f-]{36}$/i.test(id)) throw new Error('Invalid download ID.'); return join(this.root, id) }
  private async clearFiles(id: string) {
    const dir = this.folder(id), actual = await realpath(dir).catch(() => null)
    if (!actual) return
    const root = await realpath(this.root)
    // Canonicalize the configured root too: Windows short paths/junctions may name the same folder.
    // The item itself must still resolve to its exact child directory, never a redirected target.
    if (join(root, id).toLowerCase() !== actual.toLowerCase()) throw new Error('Download directory escapes its storage folder.')
    await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
  async action(id: string, action: 'pause' | 'retry' | 'remove') {
    const result = await this.batch([id], action)
    if (result.failed.length) throw new Error('Could not change this download. Stop playback and check that its files are not in use.')
  }
  batch(ids: string[], action: 'pause' | 'retry' | 'remove'): Promise<{ completed: number; failed: string[] }> {
    const operation = this.actionTail.then(async () => {
      this.editing = true
      const result = { completed: 0, failed: [] as string[] }
      try {
        // Hold the worker while changing the whole selection, so Pause all cannot start another item.
        for (const id of new Set(ids)) try { await this.change(id, action); result.completed++ } catch { result.failed.push(id) }
        return result
      } finally { this.editing = false; this.persist(); void this.pump() }
    })
    this.actionTail = operation.catch(() => {})
    return operation
  }
  private async change(id: string, action: 'pause' | 'retry' | 'remove') {
    const entry = this.entries.find(e => e.id === id); if (!entry) return
    if (this.running?.id === id) {
      const running = this.running
      if (action === 'remove') running.remove = true
      entry.status = 'paused'; running.controller.abort()
      this.persist(); await running.done
      if (action === 'remove' && this.entries.some(e => e.id === id)) throw new Error('Download files could not be removed.')
      if (action !== 'retry') return
    }
    if (action === 'remove') { await this.clearFiles(id); this.store.set(`download-cover:${id}`,null); this.entries = this.entries.filter(e => e.id !== id) }
    else if (action === 'retry' && entry.status !== 'ready') { entry.status = 'queued'; entry.error = undefined }
    else if (action === 'pause' && entry.status === 'queued') entry.status = 'paused'
    this.persist()
  }
  private async pump() {
    if (this.running || this.stopped || this.editing) return
    const entry = this.entries.find(e => e.status === 'queued'); if (!entry) return
    const controller = new AbortController()
    let finish!: () => void
    const running = { id: entry.id, controller, done: new Promise<void>(resolve => { finish = resolve }), remove: false }
    this.running = running
    entry.status = 'downloading'; entry.error = undefined; this.persist()
    try {
      await mkdir(this.folder(entry.id), { recursive: true })
      const provider = this.provider(entry.item.target.serverId), source = await downloadSource(entry.item, provider)
      const directory=this.folder(entry.id),canonical=await realpath(directory),root=await realpath(this.root)
      if(canonical.toLowerCase()!==join(root,entry.id).toLowerCase())throw Error('Download directory escapes its storage folder.')
      const manifest=createHash('sha256').update(JSON.stringify(source.files.map(f=>[new URL(f.url).pathname,f.startOffset,f.duration,f.size]))).digest('hex')
      let unchanged=!entry.manifest||entry.manifest===manifest
      if(unchanged)for(const [i,complete]of entry.files.entries()){if(!complete)continue;const file=source.files[i],validator=entry.validators?.[i];if(!file||!validator){unchanged=false;break}const response=await fetch(file.url,{method:'HEAD',headers:file.headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]),redirect:'error'});const etag=response.headers.get('etag'),current=etag&&!etag.startsWith('W/')?etag:response.headers.get('last-modified');await response.body?.cancel();if(!response.ok||current!==validator){unchanged=false;break}}
      if(!unchanged){await this.clearFiles(entry.id);await mkdir(directory);entry.files=[];entry.validators=[];entry.partial=undefined;entry.bytes=0}
      entry.manifest=manifest
      entry.duration = source.duration; entry.chapters = source.chapters; entry.total = source.files.reduce((n,f) => n+f.size,0)
      let lastUpdate = 0
      for (const [index, file] of source.files.entries()) {
        controller.signal.throwIfAborted()
        const destination = join(this.folder(entry.id), `${index}.audio`)
        for(const path of [destination,destination+'.part'])if((await lstat(path).catch(()=>null))?.isSymbolicLink())throw Error('A download file redirects outside its storage folder.')
        const complete=entry.files[index]
        if(complete&&complete.startOffset===file.startOffset&&complete.duration===file.duration&&(await stat(destination).catch(()=>null))?.size===complete.bytes)continue
        let offset=(await stat(destination+'.part').catch(()=>null))?.size??0
        const partial=entry.partial?.index===index?entry.partial:undefined
        if(!partial?.validator||!partial.total||offset>=partial.total)offset=0
        let response=await fetch(file.url,{headers:{...file.headers,...(offset?{Range:`bytes=${offset}-`,'If-Range':partial!.validator}:{})},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30*60*1000)]),redirect:'error'})
        if(response.status===416){await response.body?.cancel();offset=0;response=await fetch(file.url,{headers:file.headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30*60*1000)]),redirect:'error'})}
        if(!response.ok||!response.body)throw Error(`Download refused (HTTP ${response.status}). Check download permissions.`)
        if(/text\/html|application\/json/.test(response.headers.get('content-type')??''))throw Error('The server returned a page instead of original audio.')
        const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')??'')
        if(response.status===206&&(!offset||!range||Number(range[1])!==offset||Number(range[2])!==Number(range[3])-1||Number(range[3])!==partial?.total)){await response.body.cancel();throw Error('Download resume response did not match the saved file. Remove this download and try again.')}
        if(response.status!==206)offset=0
        const remaining=Number(response.headers.get('content-length'))||0,length=response.status===206?Number(range![3]):remaining||file.size
        entry.bytes=entry.files.reduce((n,f)=>n+f.bytes,0)+offset
        entry.total=Math.max(entry.total,entry.files.reduce((n,f)=>n+f.bytes,0)+length)
        const etag=response.headers.get('etag'),validator=etag&&!etag.startsWith('W/')?etag:response.headers.get('last-modified')??''
        if(response.status===206&&validator&&validator!==partial?.validator){await response.body.cancel();throw Error('The server changed this file while resuming. Remove it and download again.')}
        entry.partial={index,validator:validator||(response.status===206?partial!.validator:''),total:length};this.persist()
        if(this.snapshot().usedBytes+Math.max(0,length-offset)>this.snapshot().limitBytes){await response.body.cancel();throw Error('Download storage limit reached. Increase the limit or remove downloads.')}
        let bytes=offset
        const meter = new Transform({ transform: (chunk, _encoding, callback) => {
          bytes += chunk.length; entry.bytes += chunk.length
          if (this.snapshot().usedBytes > this.snapshot().limitBytes) return callback(new Error('Download storage limit reached.'))
          if (Date.now()-lastUpdate > 500) { lastUpdate = Date.now(); this.persist() }
          callback(null, chunk)
        } })
        const output = createWriteStream(destination+'.part',{flags:offset?'a':'w'})
        const closed = new Promise<void>(resolve => output.once('close', resolve))
        try { await pipeline(Readable.fromWeb(response.body as never), meter, output, { signal: controller.signal }) }
        finally { await closed } // On cancellation, Windows may still hold the file after pipeline rejects.
        if (!bytes || (length && bytes !== length)) throw new Error('Download was incomplete. Resume to continue downloading.')
        await rename(destination+'.part', destination)
        entry.files[index]={ name: `${index}.audio`, startOffset: file.startOffset, duration: file.duration, bytes };entry.validators??=[];entry.validators[index]=validator;entry.partial=undefined;this.persist()
      }
      const target = entry.item.target
      const coverId = entry.item.cover ?? (target.kind === 'audiobook' ? target.bookId : target.kind === 'podcast-episode' ? target.showId : target.kind === 'music-track' ? target.trackId : '')
      const cover=await provider.cover(coverId).catch(()=>null)
      if(cover && cover.length<=1024*1024){this.store.set(`download-cover:${entry.id}`,cover);entry.cover='cached';for(const old of this.entries.filter(e=>e.cover&&e.id!==entry.id).sort((a,b)=>b.createdAt-a.createdAt).slice(31)){this.store.set(`download-cover:${old.id}`,null);old.cover=undefined}}
      controller.signal.throwIfAborted(); entry.status = 'ready'; entry.total = entry.bytes
    } catch (error) {
      if(running.remove){
        try{await this.clearFiles(entry.id);this.store.set(`download-cover:${entry.id}`,null);this.entries=this.entries.filter(e=>e.id!==entry.id)}catch{entry.status='error';entry.error='Download files are in use. Close other players and remove this download again.'}
      }else{
        const partialBytes=entry.partial?(await stat(join(this.folder(entry.id),`${entry.partial.index}.audio.part`)).catch(()=>null))?.size??0:0
        entry.bytes=entry.files.reduce((n,f)=>n+f.bytes,0)+partialBytes
        entry.status=controller.signal.aborted?'paused':'error';entry.error=controller.signal.aborted?'Paused. Resume continues where supported by the server.':error instanceof Error&&/Download|download|original audio|episode|audiobook|podcast/.test(error.message)?error.message:'Download failed. Check the server connection and available disk space.'
      }
    } finally { this.running = undefined; this.persist(); finish(); if (!this.stopped) void this.pump() }
  }
  async ready(target: PlayTarget): Promise<OfflineMedia | undefined> {
    const e = this.entries.find(e => e.status === 'ready' && progressKey(e.item.target) === progressKey(target)); if (!e) return
    const files = e.files.map(file => ({ ...file, path: join(this.folder(e.id), file.name) }))
    const root=await realpath(this.root)
    if (!files.length || !(await Promise.all(files.map(async f => {if(!/^[0-9]+\.audio$/.test(f.name))return false;const actual=await realpath(f.path).catch(()=>null);return !!actual&&actual.toLowerCase().startsWith((root+sep).toLowerCase())&&(await stat(actual)).size===f.bytes}))).every(Boolean)) throw new Error('Downloaded audio is missing or incomplete. Remove it and download it again.')
    return { entry: this.publicEntry(e), files, cover: e.cover==='cached'?this.store.get<string>(`download-cover:${e.id}`):e.cover }
  }
  cover(serverId: string, id: string) { const e=this.entries.find(e => e.status === 'ready' && e.item.target.serverId === serverId && (e.item.cover === id || (e.item.target.kind === 'audiobook' ? e.item.target.bookId === id : e.item.target.kind === 'podcast-episode' ? e.item.target.showId === id : e.item.target.kind === 'music-track' && e.item.target.trackId === id)));return e?.cover==='cached'?this.store.get<string>(`download-cover:${e.id}`):e?.cover }

  async stop() { this.stopped = true; this.running?.controller.abort(); await this.actionTail; await this.running?.done }
}
