import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,ArrowUpRight,Download,House,Library,Plus,RefreshCw,Search,Settings2,ShieldCheck,X} from 'lucide-react'
import type {DtConnection,DtShelf,DtStatus,DtWorkspace} from '../../shared/downtify'
import {Art,message,plain,usePageScroll} from './ui'
import {CollectionHeader} from './CollectionHeader'
import {ArtistDiscography} from './ArtistDiscography'
import {MoreOptions} from './MoreOptions'
import {DowntifyManager} from './DowntifyManager'
import {DowntifyPlaylist} from './DowntifyPlaylist'
import {DowntifyTracks} from './DowntifyTracks'
import {DowntifyRoom,DowntifyCollection,type DtView} from './DowntifyRoom'
import {DowntifyDrawer} from './DowntifyDrawer'
import {DowntifyJobs} from './Downtify'
import {clearSavedCopyCache} from './NavidromeCopies'
import {takeDowntifyArtist} from './DowntifyNavigation'
export {DowntifyTracks} from './DowntifyTracks'
const api=window.mediaCenter
const empty:DtWorkspace={tracks:[],artists:[],albums:[],playlists:[],warnings:[]}
const collectionViews:DtView[]=['Songs','Albums','Artists','Playlists']
let memory:{view:DtView;server:string;query:string;search?:string;selected?:DtShelf;artist?:DtShelf}={view:'Home',server:'',query:''}

export function DowntifyBrowser({onSettings}:{onSettings:()=>void}){
 const [servers,setServers]=useState<DtConnection[]>([]),[server,setServer]=useState(memory.server),[view,setView]=useState<DtView>(memory.view)
 const [query,setQuery]=useState(memory.query),[search,setSearch]=useState(memory.search??''),[searchInput,setSearchInput]=useState(memory.search??'')
 const [data,setData]=useState(empty),[saved,setSaved]=useState(empty),[selected,setSelected]=useState(memory.selected),[artist,setArtist]=useState(memory.artist),[detail,setDetail]=useState(empty)
 const [busy,setBusy]=useState(false),[detailBusy,setDetailBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[status,setStatus]=useState<DtStatus>()
 const [detailError,setDetailError]=useState(''),[detailRevision,setDetailRevision]=useState(0)
 const [care,setCare]=useState(false),[creating,setCreating]=useState(false),[newPlaylist,setNewPlaylist]=useState(''),[filter,setFilter]=useState('All')
 const [recent,setRecent]=useState<string[]>(()=>{try{const rows=JSON.parse(localStorage.getItem('dt-recent')??'[]');return Array.isArray(rows)?rows.filter((v):v is string=>typeof v==='string').slice(0,8):[]}catch{return []}})
 const lastCard=useRef<DtShelf|undefined>(undefined),catalogKey=useRef('')
 useEffect(()=>{let live=true;const refresh=()=>void api.dtConnections().then(rows=>{if(live){setServers(rows);setServer(id=>rows.some(r=>r.id===id)?id:rows[0]?.id??'')}}).catch(e=>{if(live)setError(message(e))});refresh();window.addEventListener('downtify-connections',refresh);return()=>{live=false;window.removeEventListener('downtify-connections',refresh)}},[])
 useEffect(()=>{let live=true;setStatus(undefined);if(server)void api.dtStatus(server).then(s=>{if(live)setStatus(s)}).catch(()=>{});return()=>{live=false}},[server,revision])
 useEffect(()=>{const open=()=>{const c=takeDowntifyArtist();if(c){setServer(c.serverId);setView('Artists');setSelected(c);setArtist(c)}};open();window.addEventListener('downtify-artist',open);return()=>window.removeEventListener('downtify-artist',open)},[])
 useEffect(()=>api.onDowntifyChange(()=>setRevision(n=>n+1)),[])
 useEffect(()=>{memory={view,server,query,search,selected,artist}},[view,server,query,search,selected,artist])
 usePageScroll(JSON.stringify(['downtify',server,view,selected?[selected.kind,selected.id]:null,search]))
 useEffect(()=>{
  if(!server||['Downloads','Monitor','Podcasts'].includes(view)){setBusy(false);return}
  let live=true
  const key=JSON.stringify([server,view==='Home'?'home':view==='Discover'?['discover',search]:view==='Charts'?'charts':'saved'])
  if(catalogKey.current!==key){setData(empty);catalogKey.current=key}
  setBusy(true);setError('')
  const load=async()=>{
   if(view==='Home'){
    const [discovery,library]=await Promise.allSettled([api.dtWorkspace({serverId:server,mode:'discover'}),api.dtWorkspace({serverId:server,mode:'saved'})])
    if(!live)return
    setData(discovery.status==='fulfilled'?discovery.value:empty);setSaved(library.status==='fulfilled'?library.value:empty)
    const failures=[discovery.status==='rejected'?`Discovery: ${message(discovery.reason)}`:'',library.status==='rejected'?`Collection: ${message(library.reason)}`:''].filter(Boolean)
    setError(failures.join(' '));return
   }
   const result=await api.dtWorkspace({serverId:server,mode:view==='Discover'?'discover':view==='Charts'?'charts':'saved',query:view==='Discover'?search:undefined})
   if(live)setData(result)
  }
  void load().catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setBusy(false)})
  return()=>{live=false}
 },[server,view,search,revision])
 useEffect(()=>{
  if(!selected||selected.saved&&selected.kind==='playlist'){setDetailBusy(false);return}
  let live=true;setDetail(empty);setDetailBusy(true);setDetailError('');setError('')
  const load=async()=>{
   if(selected.saved){const library=view==='Home'?saved:data
    if(selected.kind==='artist')return {...empty,albums:library.albums.filter(a=>a.artist===selected.title),tracks:library.tracks.filter(t=>(t.artists??[t.artist]).includes(selected.title))}
    return {...empty,tracks:library.tracks.filter(t=>t.albumId===selected.id||t.album===selected.title&&t.artist===selected.artist)}
   }
   return api.dtWorkspace({serverId:server,mode:selected.kind==='artist'?'artist':selected.kind==='playlist'?'playlist':'album',id:selected.id})
  }
  void load().then(result=>{if(live)setDetail(result)}).catch(e=>{if(live)setDetailError(message(e))}).finally(()=>{if(live)setDetailBusy(false)})
  return()=>{live=false}
 },[selected,server,data,saved,view,detailRevision])
 const open=(next:DtView)=>{setView(next);setSelected(undefined);setArtist(undefined);setQuery('');setFilter('All');setError('');if(next==='Discover'){setSearch('');setSearchInput('')}}
 const submit=(text=searchInput)=>{const term=text.trim();setView('Discover');setSelected(undefined);setArtist(undefined);setQuery('');setSearch(term);setSearchInput(term);setFilter('All');if(term){const next=[term,...recent.filter(q=>q!==term)].slice(0,8);setRecent(next);localStorage.setItem('dt-recent',JSON.stringify(next))}}
 const choose=(item:DtShelf)=>{lastCard.current=item;setSelected(item);if(item.kind==='artist')setArtist(item);setFilter('All')}
 useEffect(()=>{if(selected||!lastCard.current)return;const item=lastCard.current;const card=Array.from(document.querySelectorAll<HTMLButtonElement>('.dt-page [data-card-key]')).find(el=>el.dataset.cardKey===JSON.stringify([item.kind,item.id]));if(card){card.focus({preventScroll:true});lastCard.current=undefined}},[selected,data])
 const cards=(title:string,items:DtShelf[])=>items.length>0&&<section className="discovery-shelf"><header><h2>{title}</h2><span className="muted">{items.length}</span></header><div className="dt-collection-grid">{items.filter(c=>view==='Discover'||`${c.title} ${c.artist}`.toLowerCase().includes(query.toLowerCase())).map(c=><button className={`dt-collection ${c.kind==='artist'?'artist-card':''}`} data-card-key={JSON.stringify([c.kind,c.id])} key={`${c.kind}:${c.id}`} onClick={()=>choose(c)}><Art item={{id:c.coverId,serverId:c.serverId,title:c.title,kind:'downtify-track'}}/><strong>{c.title}</strong><span>{!c.saved&&c.kind==='playlist'?'Explore playlist':c.reason||[c.artist,c.year,c.releaseType].filter(Boolean).join(' · ')||'Open collection'}</span></button>)}</div></section>
 const returnToList=()=>{if(artist&&selected?.kind==='album')setSelected(artist);else{setSelected(undefined);setArtist(undefined)}}
 const label=view==='Home'?'Listening room':view==='Monitor'?'Following':view==='Collection'?'Your collection':view==='Downloads'?'Server downloads':view
 return <section className="dt-page dt-listening-room" aria-label="Downtify">
  <header className="dt-room-navigation">
   <nav aria-label="Downtify views"><button className="text-button" aria-label="Listening room" onClick={()=>open('Home')}><House size={17}/><span>Listening room</span></button>{collectionViews.includes(view)&&<><span>/</span><button className="text-button" onClick={()=>open('Collection')}>Collection</button></>}{view!=='Home'&&<><span>/</span><span aria-current="page">{label}</span></>}</nav>
   <form className="dt-room-search" onSubmit={e=>{e.preventDefault();submit()}}><Search size={17}/><input aria-label="Search Downtify" placeholder="Search songs, albums and artists…" value={searchInput} onChange={e=>setSearchInput(e.target.value)}/><button className="icon-button" aria-label="Submit Downtify search" disabled={!server}><ArrowUpRight size={16}/></button></form>
   <div className="dt-tools">{servers.length>1&&<select aria-label="Downtify server" value={server} onChange={e=>{setServer(e.target.value);setData(empty);setSaved(empty);setSelected(undefined);setArtist(undefined);setError('')}}>{servers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}<button className="icon-button" aria-label="Refresh Downtify" disabled={!server||busy} onClick={()=>{clearSavedCopyCache();void api.dtSync(server).catch(e=>setError(message(e))).finally(()=>setRevision(n=>n+1))}}><RefreshCw size={17}/></button><MoreOptions iconOnly label="Downtify tools"><button disabled={!server} onClick={()=>open('Downloads')}><Download size={16}/>Server downloads</button>{status?.webAdmin&&<button onClick={()=>setCare(true)}><ShieldCheck size={16}/>Library care</button>}<button onClick={onSettings}><Settings2 size={16}/>Connections</button></MoreOptions></div>
  </header>
  {!server?<div className="dt-empty"><h1>Make room for your next listen</h1><p>Connect Downtify to browse your music and discover something new.</p><button className="primary" onClick={onSettings}>Connect Downtify</button></div>:<>
   {error&&!creating&&<div className="dt-error" role="alert"><span>{error}</span><button className="icon-button" aria-label="Dismiss Downtify error" onClick={()=>setError('')}><X size={16}/></button></div>}
   {(selected?detail:data).warnings.map(w=><p className="muted" role="status" key={w}>{w}</p>)}
   {busy&&view!=='Home'&&!selected&&<p className="muted dt-loading" role="status">Loading {selected?'collection':label.toLowerCase()}…</p>}
   {selected?.kind==='playlist'&&selected.saved?<><button className="text-button back" onClick={returnToList}><ArrowLeft size={16}/>Back to {view==='Home'?'Listening room':'playlists'}</button><DowntifyPlaylist serverId={server} name={selected.title} coverId={selected.coverId} onRename={title=>setSelected({...selected,id:title,title})}/></>:selected?<>
    <button className="text-button back" onClick={returnToList}><ArrowLeft size={16}/>{artist&&selected.kind==='album'?'Back to artist':`Back to ${label.toLowerCase()}`}</button>
    <DowntifyTracks key={server+selected.kind+selected.id} playlist={selected.kind==='playlist'} loading={detailBusy} error={detailError} onRetry={()=>setDetailRevision(n=>n+1)} tracks={detail.tracks} title={selected.kind==='artist'?'Artist tracks':'Tracks'} renderHeader={actions=><><CollectionHeader className={selected.kind==='artist'?'artist-profile':''}><Art item={{id:selected.coverId,serverId:server,title:selected.title,kind:'downtify-track'}}/><div className="detail-heading"><p className="eyebrow">{selected.saved?'YOUR LIBRARY':'DISCOVER'} · {selected.kind}</p><h1>{selected.title}</h1><p>{selected.kind==='artist'?`${detail.albums.length} releases`:[selected.artist,`${detail.tracks.length} tracks`].filter(Boolean).join(' · ')}</p>{detail.description&&<details><summary>About this artist</summary><p>{plain(detail.description)}</p></details>}{selected.kind==='playlist'&&!selected.saved?<div className="dt-playlist-discovery-actions">{actions}<MoreOptions iconOnly label="Playlist options"><button onClick={()=>void api.dtChartOpen({serverId:selected.serverId,id:selected.id}).catch(e=>setError(message(e)))}>Open on Deezer<ArrowUpRight size={15}/></button></MoreOptions></div>:actions}</div></CollectionHeader>{selected.kind==='artist'&&<ArtistDiscography releases={detail.albums.map(c=>({id:c.id,title:c.title,releaseType:c.releaseType,subtitle:[c.artist,c.year,c.releaseType].filter(Boolean).join(' · '),art:<Art item={{id:c.coverId,serverId:server,title:c.title,kind:'downtify-track'}}/>}))} onOpen={id=>{const c=detail.albums.find(c=>c.id===id);if(c)choose(c)}}/>}</>}/>
   </>:view==='Home'?<DowntifyRoom serverId={server} discovery={data} saved={saved} busy={busy} revision={revision} status={status} open={open} choose={choose} onError={setError} onSearch={submit}/>:view==='Collection'?<DowntifyCollection data={data} open={open} serverId={server}/>:view==='Monitor'||view==='Podcasts'?<DowntifyManager key={server+view} serverId={server} mode={view==='Monitor'?'Monitor':'Podcasts'}/>:view==='Downloads'?<DowntifyJobs serverId={server}/>:view==='Discover'?<>
    <div className="dt-view-heading"><div><h1>{search?`Results for “${search}”`:'Discover new music'}</h1><p className="muted">Find an artist, explore a release, or listen before you save.</p></div></div>
    {recent.length>0&&<div className="recent-searches"><span>Recent searches</span>{recent.map(q=><button className="secondary" key={q} onClick={()=>submit(q)}>{q}</button>)}<button className="text-button" onClick={()=>{setRecent([]);localStorage.removeItem('dt-recent')}}>Clear</button></div>}
    {search&&<div className="dt-tools">{['All','Songs','Albums','Artists'].map(f=><button className={filter===f?'primary':'secondary'} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>}
    {(filter==='All'||filter==='Artists')&&cards(search?'Artists':'Artists for you',data.artists)}{(filter==='All'||filter==='Albums')&&cards(search?'Albums':'Albums to explore',data.albums)}{(filter==='All'||filter==='Songs')&&<DowntifyTracks tracks={data.tracks} title={search?'Songs':'Trending tracks'}/>}
   </>:view==='Charts'?<><div className="dt-view-heading"><div><h1>Charts</h1><p className="muted">Tracks, albums, artists and playlists from Deezer.</p></div></div>{cards('Albums',data.albums)}{cards('Artists',data.artists)}{cards('Playlists',data.playlists)}<DowntifyTracks tracks={data.tracks} title="Chart tracks"/></>:<>
    <div className="dt-view-heading"><div><h1>{view==='Songs'?'Saved music':view}</h1><p className="muted">Your saved Downtify collection.</p></div><div className="dt-tools"><input aria-label={'Filter saved '+view.toLowerCase()} placeholder={'Filter '+view.toLowerCase()+'…'} value={query} onChange={e=>setQuery(e.target.value)}/>{view==='Playlists'&&<button className="secondary" onClick={()=>setCreating(true)}><Plus size={16}/>Create playlist</button>}</div></div>
    {view==='Songs'?<DowntifyTracks tracks={data.tracks.filter(t=>`${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(query.toLowerCase()))} title="Saved music"/>:cards(view,data[view==='Artists'?'artists':view==='Albums'?'albums':'playlists'])}
    {!busy&&!(view==='Songs'?data.tracks:view==='Albums'?data.albums:view==='Artists'?data.artists:data.playlists).length&&<div className="dt-empty"><Library size={26}/><p>No saved music here yet.</p><button className="secondary" onClick={()=>open('Discover')}>Browse discovery</button></div>}
   </>}
  </>}
  {care&&server&&<DowntifyDrawer title="Library care" wide close={()=>setCare(false)}><DowntifyManager serverId={server} mode="Manage"/></DowntifyDrawer>}
  {creating&&<DowntifyDrawer title="Create a playlist" close={()=>{setCreating(false);setError('')}}><form className="dt-context-form" onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void api.dtPlaylistEdit({serverId:server,name:newPlaylist.trim(),action:'create'}).then(p=>{setCreating(false);setNewPlaylist('');setView('Playlists');setSelected({id:p.name,title:p.name,artist:'Your playlist',kind:'playlist',saved:true,serverId:server,coverId:''});setRevision(n=>n+1)}).catch(e=>setError(message(e))).finally(()=>setBusy(false))}}><label>Playlist name<input aria-label="New playlist name" required maxLength={500} value={newPlaylist} onChange={e=>setNewPlaylist(e.target.value)}/></label>{error&&<p role="alert" className="error-banner">{error}</p>}<button className="primary" disabled={busy||!newPlaylist.trim()}>Create playlist</button></form></DowntifyDrawer>}
 </section>
}
