import {z} from 'zod'
import {mixDefinitionSchema,sourceKey,selectMix,type MixSource,type MixTrack} from '../shared/mixes'
import {personalStateSchema} from '../shared/personal-library'
import {progressKey} from '../shared/timeline'
import type {Store} from './store'
import type {LocalFiles} from './local'
import type {LocalLibrary} from './local-library'
import type {Handle} from './features'
import {Navidrome} from './providers/navidrome'
import {Audiobookshelf} from './providers/audiobookshelf'

export function registerMixes(handle:Handle,store:Store,local:LocalFiles,index:LocalLibrary,provider:(id:string)=>Navidrome|Audiobookshelf){
  const cache=new Map<string,{at:number;tracks:MixTrack[];warnings:string[]}>()
  let busy=false
  handle('mix:sources',z.undefined(),()=>[
    ...store.connections().filter(c=>c.provider==='navidrome').map(c=>({source:{kind:'navidrome' as const,serverId:c.id,libraryId:'all'},name:c.name+' · Navidrome'})),
    ...local.roots().map(r=>({source:{kind:'local' as const,rootId:r.id},name:r.name+' · Local music'})),
  ])
  async function load(source:MixSource,refresh:boolean){
    const key=sourceKey(source)
    // Validate live sources even when a catalog is cached.
    const p=source.kind==='navidrome'?provider(source.serverId):undefined
    if(source.kind==='navidrome'&&!(p instanceof Navidrome))throw Error('Mixes require a music source.')
    if(source.kind==='local'&&!local.roots().some(r=>r.id===source.rootId))throw Error('Local folder is no longer connected.')
    const cached=cache.get(key)
    if(cached&&!refresh&&Date.now()-cached.at<120000)return cached
    const tracks:MixTrack[]=[],warnings:string[]=[]
    if(source.kind==='local'){
      const data=await index.index(source.rootId,refresh)
      warnings.push(...data.warnings)
      for(const f of data.files){if(f.error)continue;tracks.push({title:f.title,artist:f.artist,album:f.album,genre:f.genre,format:f.codec,year:f.year,duration:f.duration,favorite:false,item:{target:{kind:'local-file',serverId:'local',rootId:source.rootId,fileId:f.id},title:f.title,subtitle:f.artist,duration:f.duration,context:f.album}})}
    }else if(p instanceof Navidrome){
      const seen=new Set<string>()
      for(let page=0;page<250;page++){
        const result=await p.catalog({serverId:source.serverId,libraryId:source.libraryId,view:'songs',search:'',page})
        let added=0
        for(const t of result.items){if(t.kind!=='music-track'||seen.has(t.id))continue;seen.add(t.id);added++;tracks.push({title:t.title,artist:t.artist,album:t.album,genre:t.genre,format:t.codec,year:t.year,duration:t.duration,rating:t.rating,playCount:t.playCount,favorite:!!t.starred,item:{target:{kind:'music-track',serverId:t.serverId,trackId:t.id},title:t.title,subtitle:t.artist,context:t.album,cover:t.cover,duration:t.duration}})}
        if(!result.hasMore)break
        if(!added){warnings.push('The server repeated a catalog page; only unique songs already received were evaluated.');break}
        if(page===249)warnings.push('Catalog preview reached 15,000 songs for this server. Only the scanned songs were evaluated.')
      }
    }
    const result={at:Date.now(),tracks,warnings}
    if(cache.size>=3)cache.delete(cache.keys().next().value!)
    cache.set(key,result);return result
  }
  handle('mix:preview',z.object({mix:mixDefinitionSchema,refresh:z.boolean().optional()}).strict(),async({mix,refresh})=>{
    if(busy)throw Error('A mix is already being built. Wait for it to finish.')
    busy=true
    try{
      const tracks:MixTrack[]=[],warnings:string[]=[]
      const personal=personalStateSchema.parse(store.get('personal-library')??{})
      const favorites=new Map(local.roots().map(r=>[r.id,new Set(store.get<string[]>(`local-favorites:${r.id}`)??[])]))
      for(const source of mix.sources){
        if(tracks.length>=100000){warnings.push('Preview reached 100,000 songs across sources. Select fewer sources to evaluate the remaining music.');break}
        try{const result=await load(source,!!refresh);warnings.push(...result.warnings);const remaining=100000-tracks.length;tracks.push(...result.tracks.slice(0,remaining));if(result.tracks.length>remaining)warnings.push('Preview reached 100,000 songs across sources. Select fewer sources to evaluate the remaining music.')}
        catch{warnings.push(source.kind==='local'?'A selected local music source could not be read. Reconnect it and refresh.':'A selected Navidrome source could not be read. Check its connection and refresh.')}
      }
      const display=tracks.map(t=>{const m=personal.metadata[progressKey(t.item.target)],target=t.item.target;const next={...t,...(m?.title?{title:m.title}:{}),...(m?.artist?{artist:m.artist}:{}),...(m?.album?{album:m.album}:{}),...(m?.genre?{genre:m.genre}:{}),...(m?.year!==undefined?{year:m.year}:{}),favorite:target.kind==='local-file'?!!favorites.get(target.rootId)?.has(target.fileId):t.favorite};return {...next,item:{...t.item,title:next.title,subtitle:next.artist,context:next.album}}})
      const artists=[...new Set(display.map(t=>t.artist).filter(Boolean))].sort().slice(0,1000)
      const genres=[...new Set(display.map(t=>t.genre).filter((v):v is string=>!!v))].sort().slice(0,1000)
      return {...selectMix(display,mix),warnings:[...new Set(warnings)],artists,genres}
    }finally{busy=false}
  })
}
