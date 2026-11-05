import type {JfItem} from '../../shared/jellyfin'
import {api} from './actions'
import {JfArt} from './Jellyfin'
import {Rail} from './JellyfinHub'
import {libraryQuery,openJellyfin,type MediaLibrary} from './media-discovery'
import {useSourceShelves} from './useExploreSources'

interface Entry {library:MediaLibrary;item:JfItem;recent:boolean}
async function fetchVideo(serverId:string){
  const libraries=(await api.jfLibraries(serverId)).filter(l=>l.kind!=='music')
  const warnings:string[]=[]
  const chunks=await Promise.all(libraries.flatMap(l=>[false,true].map(async recent=>{
    const library={...l,serverId,serverName:''}
    try{
      const response=await api.jfBrowse({...libraryQuery(library),view:recent?'all':'continue'})
      return response.items.slice(0,12).map(item=>({library,item,recent}))
    }catch{warnings.push(l.name+' unavailable.');return []}
  })))
  return {items:chunks.flat(),warnings:[...new Set(warnings)]}
}
export function ExploreCinema({revision,watchOnly}:{revision:number;watchOnly:boolean}){
  const {items,sources,busy,error,retry}=useSourceShelves<Entry>(revision,api.jfConnections,fetchVideo)
  const cards=(recent:boolean)=>items.filter(e=>e.recent===recent).map(({library,item})=>{
    const serverName=sources.find(s=>s.id===library.serverId)?.name??library.name
    return <article className="jf-hub-card" key={JSON.stringify([library.serverId,library.id,item.id])}><button className="jf-card-open" onClick={()=>openJellyfin({item,library:{...library,serverName}})}><JfArt item={item}/><strong>{item.title}</strong><span>{serverName} · {library.name}</span>{item.position>0&&item.duration>0&&<progress max={item.duration} value={item.position}/>}</button></article>
  })
  const continuing=cards(false),recent=cards(true)
  return <>{error&&<p role="status">{error}</p>}{sources.filter(s=>s.warnings.length).map(s=><p key={s.id}>{s.name}: {s.warnings.join(' ')} <button disabled={s.pending} onClick={()=>retry(s.id)}>Retry {s.name}</button></p>)}
    {items.length>0&&<section className="explore-cinema"><div className="explore-cinema-heading"><h2>Make a night of it.</h2></div>{continuing.length>0&&<Rail title="Continue watching">{continuing}</Rail>}{recent.length>0&&<Rail title="Recently added on Jellyfin">{recent}</Rail>}</section>}
    {watchOnly&&busy&&<p role="status">Loading video libraries…</p>}{watchOnly&&!busy&&!items.length&&<p>No video suggestions available.</p>}</>
}
