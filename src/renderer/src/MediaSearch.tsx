import {useEffect,useState} from 'react'
import {Play,ArrowUpRight,Search} from 'lucide-react'
import {api,Modal,ListenActions} from './actions'
import {TrackArtwork} from './Artwork'
import {JfArt} from './Jellyfin'
import type {SearchGroup} from '../../shared/experience'
import {progressKey} from '../../shared/timeline'
import {discoverJellyfin,openJellyfin} from './media-discovery'
import {message} from './ui'
type Discovery=Awaited<ReturnType<typeof discoverJellyfin>>
export function MediaSearch({close,error}:{close:()=>void;error:(s:string)=>void}){
 const [query,setQuery]=useState(''),[groups,setGroups]=useState<SearchGroup[]>([]),[jf,setJf]=useState<Discovery['entries']>([]),[warnings,setWarnings]=useState<string[]>([]),[pending,setPending]=useState(0),[type,setType]=useState('all'),[source,setSource]=useState('all'),[playing,setPlaying]=useState(false)
 useEffect(()=>{let live=true;setGroups([]);setJf([]);setWarnings([]);setPending(0);if(query.trim().length<2)return;setPending(2)
  const timer=setTimeout(()=>{
   void api.unifiedSearch(query).then(r=>{if(live){setGroups(r.groups);setWarnings(w=>[...w,...r.warnings])}}).catch(()=>{if(live)setWarnings(w=>[...w,'Music, books and podcast search unavailable.'])}).finally(()=>{if(live)setPending(n=>n-1)})
   void discoverJellyfin(query,()=>live).then(r=>{if(live){setJf(r.entries);setWarnings(w=>[...w,...r.warnings])}}).catch(()=>{if(live)setWarnings(w=>[...w,'Jellyfin search unavailable.'])}).finally(()=>{if(live)setPending(n=>n-1)})
  },350);return()=>{live=false;clearTimeout(timer)}
 },[query])
 const sourceId=(g:Discovery['entries'][number])=>`jellyfin:${g.library.serverId}:${g.library.id}`
 const sources=[...new Map([...groups.map(g=>({id:g.id,name:g.name})),...jf.map(g=>({id:sourceId(g),name:`${g.library.serverName} · ${g.library.name}`}))].map(s=>[s.id,s])).values()].sort((a,b)=>a.name.localeCompare(b.name))
 const mediaType=(kind:string)=>kind==='Movie'?'movies':kind==='Series'||kind==='Episode'?'tv':kind==='audiobook'?'books':kind==='podcast-episode'?'podcasts':'music'
 const filtered=groups.map(g=>({...g,items:g.items.filter(i=>type==='all'||mediaType(i.target.kind)===type)})).filter(g=>g.items.length&&(source==='all'||source===g.id))
 const filteredJf=jf.map(g=>({...g,items:g.items.filter(i=>type==='all'||mediaType(i.kind)===type)})).filter(g=>g.items.length&&(source==='all'||source===sourceId(g)))
 const count=filtered.reduce((n,g)=>n+g.items.length,0)+filteredJf.reduce((n,g)=>n+g.items.length,0)
 return <Modal title="Search your media" close={close}><label className="field">Music, books, podcasts, movies and shows<input autoFocus value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder="Search across your sources…"/></label><div className="search-filters"><label>Media type<select aria-label="Search media type" value={type} onChange={e=>setType(e.target.value)}>{[['all','Everything'],['music','Music'],['books','Audiobooks'],['podcasts','Podcasts'],['movies','Movies'],['tv','TV shows']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Source<select aria-label="Search source" value={source} onChange={e=>setSource(e.target.value)}><option value="all">All sources</option>{source!=='all'&&!sources.some(s=>s.id===source)&&<option value={source}>Selected source (no results)</option>}{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div><p role="status">{pending?'Searching sources…':query.trim().length<2?'Enter at least two characters.':`${count} result${count===1?'':'s'}`}</p>{warnings.map(w=><p className="muted" role="status" key={w}>{w}</p>)}<div className="global-search-results">{filtered.map(g=><section key={g.id}><h3>{g.name}</h3>{g.items.map((item,i)=><div className="unified-result" key={`${progressKey(item.target)}:${i}`}><TrackArtwork item={item}/><div><strong>{item.title}</strong><small>{item.subtitle}</small></div><ListenActions items={[item]} error={error} compact disabled={g.unavailable?.includes(progressKey(item.target))}/></div>)}</section>)}{filteredJf.map((g,index)=><section key={`${g.library.serverId}:${g.library.id}:${index}`}><h3>{g.library.serverName} · {g.library.name}</h3>{g.items.map(item=><div className="unified-result" key={item.id}><JfArt item={item}/><div><strong>{item.title}</strong><small>{item.subtitle||item.year} · {item.kind}</small></div>{['Audio','Movie','Episode'].includes(item.kind)&&<button className="icon-button" aria-label={`Play ${item.title}`} disabled={playing} onClick={()=>{setPlaying(true);void api.jfPlay({serverId:item.serverId,itemIds:[item.id],index:0}).catch(e=>error(message(e))).finally(()=>setPlaying(false))}}><Play size={18}/></button>}<button className="icon-button" aria-label={`Open ${item.title}`} onClick={()=>{openJellyfin({library:g.library,item});close()}}><ArrowUpRight size={18}/></button></div>)}</section>)}</div>{!pending&&query.trim().length>1&&!count&&<div className="empty-state"><Search/><p>No matches. Try another name or change the filters.</p></div>}<p className="muted guidance">Results are limited per source. Podcast search includes indexed inbox episodes.</p></Modal>
}
