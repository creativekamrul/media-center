import { createHash } from 'node:crypto'
import { z } from 'zod'
import { APP_VERSION } from '../shared/version'
import { parseLrc, type LyricsRecord, type LyricsSignature } from '../shared/lyrics'
import type { Store } from './store'
const responseSchema=z.object({instrumental:z.boolean(),plainLyrics:z.string().max(200000).nullable().optional(),syncedLyrics:z.string().max(200000).nullable().optional(),duration:z.number().finite().nonnegative()})
export type LyricsContent={status:'found'|'missing'|'instrumental';plain:string;lines:ReturnType<typeof parseLrc>}
const recordSchema=responseSchema.extend({id:z.number().int().positive().safe(),trackName:z.string().max(2000),artistName:z.string().max(2000),albumName:z.string().max(2000)})
const contentOf=(data:z.infer<typeof responseSchema>):LyricsContent=>{const lines=parseLrc(data.syncedLyrics??''),plain=data.plainLyrics?.trim()??'';return data.instrumental?{status:'instrumental',plain:'',lines:[]}:lines.length||plain?{status:'found',plain,lines}:missing}
const recordOf=(data:z.infer<typeof recordSchema>):LyricsRecord=>({id:data.id,title:data.trackName,artist:data.artistName,album:data.albumName,duration:data.duration,...contentOf(data)})
const bindingKey=(key:string)=>'lyrics-binding:'+createHash('sha256').update(key).digest('hex')
const missing:LyricsContent={status:'missing',plain:'',lines:[]}
export class LyricsClient {
  private tail:Promise<unknown>=Promise.resolve()
  private pending=new Map<string,Promise<LyricsContent>>()
  private next=0
  private queued=0
  constructor(private store:Store,private fetcher:typeof fetch=(...args)=>fetch(...args)){}
  lookup(signature:LyricsSignature,refresh=false):Promise<LyricsContent>{
    if(!signature.title.trim()||!signature.artist.trim())return Promise.resolve(missing)
    const key='lyrics:'+createHash('sha256').update(JSON.stringify(signature)).digest('hex'),cached=this.store.cache<LyricsContent>(key)
    if(!refresh&&cached&&Date.now()-cached.updated<(cached.value.status==='missing'?3600000:604800000))return Promise.resolve(cached.value)
    const existing=this.pending.get(key);if(existing)return existing
    if(this.pending.size>=8)return Promise.reject(new Error('Lyrics requests are busy. Try again shortly.'))
    const work=this.schedule(async()=>{
        const url=new URL('https://lrclib.net/api/get');url.searchParams.set('track_name',signature.title);url.searchParams.set('artist_name',signature.artist)
        if(signature.album)url.searchParams.set('album_name',signature.album)
        if(signature.duration>=1&&signature.duration<=3600)url.searchParams.set('duration',String(signature.duration))
        const raw=await this.request(url)
        if(raw===null){this.store.cacheSet(key,missing);return missing}
        const data=responseSchema.parse(raw)
        if(signature.duration>=1&&signature.duration<=3600&&Math.abs(data.duration-signature.duration)>2){this.store.cacheSet(key,missing);return missing}
        const content=contentOf(data)
        this.store.cacheSet(key,content);return content
    }).finally(()=>this.pending.delete(key))
    this.pending.set(key,work);return work
  }
  saved(key:string){const record=this.store.get<LyricsRecord|null>(bindingKey(key))??undefined;if(record)this.store.set(bindingKey(key).replace('lyrics-binding:','lyrics-identity:'),key);return record}
  save(key:string,record:LyricsRecord){this.store.set(bindingKey(key),record);this.store.set(bindingKey(key).replace('lyrics-binding:','lyrics-identity:'),key)}
  clear(key:string){this.store.set(bindingKey(key),null)}
  search(query:string):Promise<LyricsRecord[]>{
    return this.schedule(async()=>{const url=new URL('https://lrclib.net/api/search');url.searchParams.set('q',query);const data=await this.request(url,4194304);return data===null?[]:z.array(recordSchema).max(100).parse(data).slice(0,20).map(recordOf)})
  }
  get(id:number):Promise<LyricsRecord>{
    return this.schedule(async()=>{const data=await this.request(new URL(`https://lrclib.net/api/get/${id}`));if(data===null)throw new Error('This lyrics record is no longer available. Search again.');const record=recordOf(recordSchema.parse(data));if(record.id!==id)throw new Error('LRCLIB returned a different lyrics record.');return record})
  }
  private async request(url:URL,limit=524288):Promise<unknown>{
    const response=await this.fetcher(url,{headers:{'User-Agent':`MediaCenter/${APP_VERSION} (https://github.com/creativekamrul/media-center)`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)})
    if(response.status===429){const raw=response.headers.get('retry-after')??'60',numeric=Number(raw);const delay=Number.isFinite(numeric)?Math.max(1,numeric)*1000:Math.max(1000,Date.parse(raw)-Date.now()||60000);this.store.set('lyricsRetryAfter',Date.now()+delay);await response.body?.cancel();throw new Error('LRCLIB is rate limiting requests. Please try again later.')}
    if(response.status===404){await response.body?.cancel();return null}
    if(!response.ok){await response.body?.cancel();throw new Error(`LRCLIB could not provide lyrics (HTTP ${response.status}).`)}
    const reader=response.body?.getReader();if(!reader)throw new Error('LRCLIB returned an empty response.')
    const chunks:Uint8Array[]=[];let size=0
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('LRCLIB response is too large.')}chunks.push(value)}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }
  private schedule<T>(action:()=>Promise<T>):Promise<T>{
    if(this.queued>=8)return Promise.reject(new Error('Lyrics requests are busy. Try again shortly.'))
    this.queued++
    const work=this.tail.catch(()=>{}).then(async()=>{
      const until=this.store.get<number>('lyricsRetryAfter')??0
      if(until>Date.now())throw new Error(`LRCLIB asked us to wait. Try again in ${Math.ceil((until-Date.now())/1000)} seconds.`)
      if(this.next>Date.now())await new Promise(resolve=>setTimeout(resolve,this.next-Date.now()))
      try{return await action()
      }catch(e){if(e instanceof z.ZodError||e instanceof SyntaxError)throw new Error('LRCLIB returned an unsupported lyrics response.');if(e instanceof Error&&['TimeoutError','AbortError','TypeError'].includes(e.name))throw new Error('Could not reach LRCLIB. Check your connection and try again.');throw e}
      finally{this.next=Date.now()+250}
    }).finally(()=>this.queued--)
    this.tail=work;return work
  }
}
