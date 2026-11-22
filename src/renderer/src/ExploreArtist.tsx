import {useEffect,useState} from 'react'
import {ArrowLeft,ArrowUpRight,Play} from 'lucide-react'
import type {SearchResult} from '../../shared/search-presentation'
import {searchName} from '../../shared/search-presentation'
import type {SearchCollection} from '../../shared/experience'
import {api,songQueue,ListenActions} from './actions'
import {Art,message} from './ui'
import {CollectionHeader} from './CollectionHeader'
import {TrackArtwork} from './Artwork'
import {JfArt} from './Jellyfin'
import {libraryQuery,openJellyfin} from './media-discovery'
import {dtQueue} from './Downtify'
type ArtistResult=Extract<SearchResult,{kind:'collection'|'jellyfin'}>
type Release={key:string;title:string;subtitle:string;source:string;art:SearchCollection|Extract<SearchResult,{kind:'jellyfin'}>;open:()=>void}
export function ExploreArtist({title,sources,back,open,error}:{title:string;sources:ArtistResult[];back:()=>void;open:(c:SearchCollection)=>void;error:(text:string)=>void}){
 const [releases,setReleases]=useState<Release[]>([]),[tracks,setTracks]=useState<{source:string;items:import('../../shared/types').QueueItem[]}[]>([]),[notes,setNotes]=useState<string[]>([]),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0),[limit,setLimit]=useState(24)
 useEffect(()=>{let live=true;setBusy(true);setReleases([]);setTracks([]);setNotes([])
  const load=async(source:ArtistResult)=>{
   const albums:Release[]=[],items:import('../../shared/types').QueueItem[]=[]
   const album=(c:SearchCollection)=>albums.push({key:JSON.stringify([c.provider,c.sourceId,c.id]),title:c.title,subtitle:c.subtitle,source:source.source,art:c,open:()=>open(c)})
   if(source.kind==='collection'){
    const c=source.collection
    if(c.provider==='navidrome'){
     const artist=await api.musicDetail({serverId:c.sourceId,id:c.id,kind:'artist'});artist.albums.forEach(a=>album({provider:'navidrome',kind:'album',sourceId:a.serverId,id:a.id,title:a.title,subtitle:a.subtitle,cover:a.cover}))
     // Full discography is visible. A small song sample avoids fetching every album on open.
     const sample=await Promise.allSettled(artist.albums.slice(0,4).map(a=>api.musicDetail({serverId:a.serverId,id:a.id,kind:'album'})));for(const r of sample)if(r.status==='fulfilled')items.push(...songQueue(r.value.tracks,r.value.title));else if(live)setNotes(n=>[...n,source.source+': some album tracks are unavailable.'])
     if(artist.albums.length>4&&live)setNotes(n=>[...n,source.source+': track sample covers the first four albums. Open any release for its full list.'])
    }else if(c.provider==='downtify'){
     const saved=await api.dtWorkspace({serverId:c.sourceId,mode:'saved'});const matching=saved.tracks.filter(t=>(t.artists??[t.artist]).some(name=>searchName(name)===searchName(title)));items.push(...matching.map(dtQueue));const ids=new Set(matching.map(t=>t.albumId));const names=new Set(matching.map(t=>JSON.stringify([t.artist,t.album])));saved.albums.filter(a=>ids.has(a.id)||names.has(JSON.stringify([a.artist,a.title]))).forEach(a=>album({provider:'downtify',kind:'album',sourceId:c.sourceId,id:a.id,title:a.title,subtitle:a.artist,cover:a.coverId}))
    }else{
     const result=await api.localLibrary({rootId:c.sourceId,view:'albums',search:title,sort:'title',page:0});result.groups.filter(a=>searchName(a.subtitle)===searchName(title)).forEach(a=>album({provider:'local',kind:'album',sourceId:c.sourceId,id:a.id,title:a.title,subtitle:a.subtitle,cover:a.fileId}));if(result.total>result.groups.length&&live)setNotes(n=>[...n,source.source+': showing the first page of matching local albums.'])
    }
   }else{
    const result=await api.jfBrowse({...libraryQuery(source.library),parentId:source.item.id,view:'all',sort:'SortName',descending:false});for(const item of result.items.filter(i=>i.kind==='MusicAlbum')){const entry={...source,item,title:item.title};albums.push({key:JSON.stringify(['jellyfin',item.serverId,item.id]),title:item.title,subtitle:item.subtitle,source:source.source,art:entry,open:()=>openJellyfin({library:source.library,item})})}if(result.total>result.items.length&&live)setNotes(n=>[...n,source.source+': open the source artist for additional releases.'])
   }
   if(live){setReleases(old=>[...old,...albums]);if(items.length)setTracks(old=>[...old,{source:source.source,items}])}
  }
  void Promise.allSettled(sources.map(async source=>{try{await load(source)}catch(e){if(live)setNotes(n=>[...n,source.source+': '+message(e)])}})).finally(()=>{if(live)setBusy(false)});return()=>{live=false}
 },[title,sources,revision])
 const first=sources[0],art=first?.kind==='collection'?<Art item={{id:first.collection.cover??first.collection.id,serverId:first.collection.sourceId,title,kind:'collection'}}/>:first?.kind==='jellyfin'?<JfArt item={first.item}/>:null
 return <section className="explore-artist-page"><button className="text-button back" onClick={back}><ArrowLeft size={16}/>Back to results</button><CollectionHeader className="artist-profile">{art}<div className="detail-heading"><p className="eyebrow">ARTIST · YOUR LIBRARIES</p><h1>{title}</h1><p>{sources.length} library {sources.length===1?'match':'matches'} · {releases.length} available {releases.length===1?'release':'releases'}</p><p className="muted">Artists with this name in your libraries. Choose a source or release to explore.</p></div></CollectionHeader><div className="explore-artist-sources">{sources.map(s=><button className="secondary" key={s.key} onClick={()=>s.kind==='collection'?open(s.collection):openJellyfin({library:s.library,item:s.item})}>{s.source}<ArrowUpRight size={14}/></button>)}</div>{busy&&<p role="status">Loading available releases…</p>}{notes.map((n,i)=><p className="muted" role="status" key={i}>{n}</p>)}{!busy&&notes.length>0&&<button className="secondary" onClick={()=>setRevision(n=>n+1)}>Retry artist sources</button>}<h2>Discography in your libraries</h2><div className="search-result-cards">{releases.slice(0,limit).map(r=><button className="search-cover-card" key={r.key} onClick={r.open}>{'item' in r.art?<JfArt item={r.art.item}/>:<Art item={{id:r.art.cover??r.art.id,serverId:r.art.sourceId,title:r.title,kind:'collection'}}/>}<strong>{r.title}</strong><span>{r.subtitle}</span><small>{r.source}</small></button>)}</div>{releases.length>limit&&<button className="secondary" onClick={()=>setLimit(n=>n+24)}>More releases</button>}{!busy&&!releases.length&&<p>No available releases were found in these sources.</p>}{tracks.map((group,i)=><section className="explore-artist-tracks" key={i}><header><h2>Tracks · {group.source}</h2><ListenActions items={group.items} error={error}/></header>{group.items.slice(0,20).map((item,index)=><div className="unified-result" key={index}><TrackArtwork item={item}/><div><strong>{item.title}</strong><small>{item.context}</small></div><button className="icon-button" aria-label={'Play '+item.title} onClick={()=>void api.play({queue:group.items,index}).catch(e=>error(message(e)))}><Play size={16}/></button></div>)}</section>)}</section>
}
