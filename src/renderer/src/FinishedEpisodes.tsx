import {useEffect,useRef,useState} from 'react'
import {Check,RefreshCw,Search} from 'lucide-react'
import type {Library} from '../../shared/types'
import type {InboxPage} from '../../shared/daily'
import {api,ListenActions} from './actions'
import {TrackArtwork} from './Artwork'
import {duration,message} from './ui'

export function FinishedEpisodes({library}:{library:Library}){
 const refreshed=useRef(-1)
 const [search,setSearch]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(0),[sort,setSort]=useState<'newest'|'oldest'|'show'>('newest'),[revision,setRevision]=useState(0),[data,setData]=useState<InboxPage>(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(0)},250);return()=>clearTimeout(timer)},[search])
 useEffect(()=>{let live=true;setBusy(true);setError('');void api.podcastInbox({library:{serverId:library.serverId,libraryId:library.id},status:'finished',page,search:query,sort,refresh:refreshed.current!==revision}).then(r=>{if(live){refreshed.current=revision;setData(r)}}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[library.id,library.serverId,page,query,sort,revision])
 return <section className="finished-episodes"><div className="section-title"><div><h2>Finished episodes</h2><p className="muted">{data?.total??0} completed · {library.name}</p></div><button className="secondary" disabled={busy} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={16}/>Refresh progress</button></div>
  <div className="library-toolbar"><label className="search"><Search size={16}/><input aria-label="Search finished episodes" placeholder="Search episode or show…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Finished episode sort" value={sort} onChange={e=>{setSort(e.target.value as typeof sort);setPage(0)}}><option value="newest">Newest episodes</option><option value="oldest">Oldest episodes</option><option value="show">Show name</option></select></div>
  {error&&<p role="alert">{error}</p>}{data?.warnings.map(w=><p role="status" key={w}>{w}</p>)}
  {busy?<p role="status">Loading finished episodes…</p>:<div className="finished-episode-grid">{data?.items.map(row=><article className="finished-episode-card personal-entry" key={JSON.stringify(row.item.target)}><div className="finished-episode-title"><TrackArtwork item={row.item}/><div><span className="finished-label"><Check size={14}/>Finished</span><h3>{row.item.title}</h3><p>{row.showTitle}</p></div></div><small>{duration(row.episode.duration)}{!row.episode.downloaded?' · Audio unavailable on server':''}</small><ListenActions items={[row.item]} disabled={!row.episode.downloaded} error={setError} compact more={<button className="secondary" onClick={()=>void api.inboxStatus({targets:[row.item.target],finished:false}).then(r=>{if(r.failed)throw Error('Could not update this episode.');setRevision(n=>n+1)}).catch(e=>setError(message(e)))}>Mark unfinished</button>}/></article>)}</div>}
  {!busy&&data&&!data.total&&<p className="empty-state">{query?'No finished episodes match this search.':'Episodes you finish in this library appear here.'}</p>}
  {!!data&&data.total>60&&<div className="pagination"><button className="secondary" disabled={busy||page===0} onClick={()=>setPage(n=>n-1)}>Previous</button><span>Page {page+1}</span><button className="secondary" disabled={busy||(page+1)*60>=data.total} onClick={()=>setPage(n=>n+1)}>Next</button></div>}
 </section>
}
