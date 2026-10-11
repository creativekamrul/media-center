import type {JellyfinRoute} from './media-discovery'
import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ArrowLeft,ArrowUpRight,ChevronLeft,ChevronRight,Film,Music2,Play,RefreshCw,Tv} from 'lucide-react'
import type {JfBrowse,JfConnection,JfItem,JfLibrary} from '../../shared/jellyfin'
import {JellyfinPage,JfArt} from './Jellyfin'
import {duration,IconButton,message,plain} from './ui'

const api=window.mediaCenter
type Library=JfLibrary&{serverId:string}
type Entry={item:JfItem;library:Library}
type Shelf={library:Library;items:JfItem[];error?:string}
const label=(kind:JfLibrary['kind'])=>kind==='music'?'Music':kind==='movies'?'Movies':'TV shows'
function saved(key:string){try{return localStorage.getItem(key)??''}catch{return ''}}
function remember(key:string,value:string){try{localStorage.setItem(key,value)}catch{}}

export function Rail({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){
 const ref=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({start:true,end:true})
 useEffect(()=>{const node=ref.current;if(!node)return;const update=()=>setEdges({start:node.scrollLeft<2,end:node.scrollLeft+node.clientWidth>=node.scrollWidth-2});update();const resize=new ResizeObserver(update);resize.observe(node);node.addEventListener('scroll',update);return()=>{resize.disconnect();node.removeEventListener('scroll',update)}},[children])
 const move=(direction:number)=>ref.current?.scrollBy({left:direction*ref.current.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
 return <section className="jf-hub-shelf" aria-label={title}><header><h2>{title}</h2><div>{action}<IconButton label={`Previous ${title}`} disabled={edges.start} onClick={()=>move(-1)}><ChevronLeft size={19}/></IconButton><IconButton label={`Next ${title}`} disabled={edges.end} onClick={()=>move(1)}><ChevronRight size={19}/></IconButton></div></header><div ref={ref} className="jf-hub-rail">{children}</div></section>
}

function Featured({entries,open,play}:{entries:Entry[];open:(entry:Entry)=>void;play:(entry:Entry)=>void}){
 const [index,setIndex]=useState(0),[art,setArt]=useState<string|null>(null)
 const entry=entries[index%Math.max(1,entries.length)],item=entry?.item
 useEffect(()=>{let live=true;setArt(null);if(item)void api.jfCover({serverId:item.serverId,itemId:item.id,image:'Backdrop'}).then(src=>{if(live)setArt(src)}).catch(()=>{});return()=>{live=false}},[item?.id,item?.serverId])
 if(!entry)return null
 const change=(delta:number)=>setIndex((index+delta+entries.length)%entries.length)
 return <section className={`jf-featured ${art?'has-art':''}`} aria-label="Featured in your libraries" aria-roledescription="carousel">
  {art&&<img className="jf-featured-backdrop" key={art.slice(-60)} src={art} alt=""/>}
  <div className="jf-featured-shade"/>
  <div className="jf-featured-copy" key={`${item.serverId}:${item.id}`}><span className="jf-hub-kicker">IN YOUR LIBRARY · {entry.library.name}</span><h2>{item.title}</h2><p className="jf-featured-meta">{[item.year,item.kind==='Movie'?duration(item.duration):item.kind==='Series'?'TV series':item.subtitle,item.genres.slice(0,2).join(' · ')].filter(Boolean).join(' · ')}</p>{item.overview&&<p className="jf-featured-overview">{plain(item.overview)}</p>}<div className="jf-featured-actions">{['Movie','Episode','Audio'].includes(item.kind)&&<button className="primary" onClick={()=>play(entry)}><Play size={17}/>{item.position>0&&!item.played?'Resume':'Play'}</button>}<button className="secondary" onClick={()=>open(entry)}>{item.kind==='Series'?'Explore series':'View details'}<ArrowUpRight size={16}/></button></div></div>
  {!art&&<div className="jf-featured-poster"><JfArt item={item}/></div>}
  {entries.length>1&&<div className="jf-featured-pagination"><span aria-live="polite">{index%entries.length+1} / {entries.length}</span><IconButton label="Previous featured title" onClick={()=>change(-1)}><ChevronLeft size={20}/></IconButton><IconButton label="Next featured title" onClick={()=>change(1)}><ChevronRight size={20}/></IconButton></div>}
 </section>
}

export function JellyfinHub({onSettings,revision:externalRevision,request,onRequestHandled}:{onSettings:()=>void;revision:number;request?:JellyfinRoute;onRequestHandled?:()=>void}){
 const [connections,setConnections]=useState<JfConnection[]>([]),[server,setServer]=useState(()=>request?.library.serverId??saved('jellyfin-hub:server'))
 const [libraries,setLibraries]=useState<Library[]>([]),[shelves,setShelves]=useState<Shelf[]>([]),[continuing,setContinuing]=useState<Entry[]>([])
 const [selected,setSelected]=useState(()=>request?.library.id??saved('jellyfin-hub:library')),[initialItem,setInitialItem]=useState<JfItem|undefined>(request?.item),[routeVersion,setRouteVersion]=useState(0)
 const [busy,setBusy]=useState(true),[loadingShelves,setLoadingShelves]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[playing,setPlaying]=useState(false)
 useEffect(()=>{let live=true;const update=()=>{void api.jfConnections().then(cs=>{if(!live)return;setConnections(cs);setServer(current=>cs.some(c=>c.id===current)?current:cs[0]?.id??'');setBusy(false)}).catch(e=>{if(live){setError(message(e));setBusy(false)}})};update();window.addEventListener('jellyfin-connections',update);return()=>{live=false;window.removeEventListener('jellyfin-connections',update)}},[revision,externalRevision])
 useEffect(()=>{const update=()=>setRevision(n=>n+1);window.addEventListener('online',update);const off=api.onSystemResume(update);return()=>{window.removeEventListener('online',update);off()}},[])
 useEffect(()=>{let live=true;setLibraries([]);setShelves([]);setContinuing([]);setError('');if(!server)return;remember('jellyfin-hub:server',server);setBusy(true);setLoadingShelves(true)
  void (async()=>{try{const ls=(await api.jfLibraries(server)).map(l=>({...l,serverId:server}));if(!live)return;setLibraries(ls);setBusy(false)
   // Load progressively, bounding requests to two per library at a time.
   for(const library of ls){if(!live)return;const q:JfBrowse={serverId:server,libraryId:library.id,kind:library.kind,view:'all',search:'',page:0,sort:'DateCreated',descending:true};const [latest,resume]=await Promise.allSettled([api.jfBrowse(q),library.kind==='music'?Promise.resolve({items:[],total:0}):api.jfBrowse({...q,view:'continue'})]);if(!live)return;setShelves(rows=>[...rows,{library,items:latest.status==='fulfilled'?latest.value.items.slice(0,18):[],error:latest.status==='rejected'?message(latest.reason):resume.status==='rejected'?`Continue watching: ${message(resume.reason)}`:undefined}]);if(resume.status==='fulfilled')setContinuing(rows=>[...rows,...resume.value.items.slice(0,12).map(item=>({item,library}))])}
  }catch(e){if(live)setError(message(e))}finally{if(live){setBusy(false);setLoadingShelves(false)}}})();return()=>{live=false}
 },[server,revision,externalRevision])
 useEffect(()=>{if(request){setServer(request.library.serverId);setSelected(request.library.id);remember('jellyfin-hub:library',request.library.id);setInitialItem(request.item);setRouteVersion(n=>n+1);onRequestHandled?.()}},[request])
 const library=libraries.find(l=>l.id===selected),current=connections.find(c=>c.id===server)
 const choose=(library?:Library,item?:JfItem)=>{document.querySelector('.workspace')?.scrollTo({top:0,behavior:'instant'});setRouteVersion(n=>n+1);setSelected(library?.id??'');remember('jellyfin-hub:library',library?.id??'');setInitialItem(item)}
 const open=(entry:Entry)=>choose(entry.library,entry.item)
 const play=(entry:Entry)=>{setPlaying(true);setError('');void api.jfPlay({serverId:entry.item.serverId,itemIds:[entry.item.id],index:0}).catch(e=>setError(message(e))).finally(()=>setPlaying(false))}
 const entries=shelves.flatMap(s=>s.items.slice(0,4).map(item=>({item,library:s.library})))
 const featured=entries.filter(e=>e.item.kind==='Movie'||e.item.kind==='Series').slice(0,8)
 const card=(entry:Entry)=> <article className="jf-hub-card" key={`${entry.library.id}:${entry.item.id}`}><button className="jf-card-open" onClick={()=>open(entry)}><JfArt item={entry.item}/><strong>{entry.item.title}</strong><span>{entry.item.subtitle||entry.item.year||entry.library.name}</span>{entry.item.position>0&&entry.item.duration>0&&!entry.item.played&&<progress aria-label={`${entry.item.title} progress`} value={entry.item.position} max={entry.item.duration}/>}</button></article>
 return <div className="jf-hub" aria-busy={busy||playing}><header className="jf-hub-heading"><div><span className="jf-hub-kicker">YOUR MEDIA, TOGETHER</span><h1>Jellyfin</h1></div><div className="jf-actions"><select aria-label="Jellyfin server" value={server} onChange={e=>{choose();setServer(e.target.value)}} disabled={!connections.length}>{connections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><IconButton label="Refresh Jellyfin home" onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></IconButton><button className="secondary" onClick={onSettings}>Connections</button></div></header>
 {error&&<p className="error-banner" role="alert">{error}</p>}
 {busy?<div className="jf-hub-loading" role="status">Opening your libraries…</div>:!connections.length?<section className="jf-empty"><Film size={36}/><h2>A home for your Jellyfin media</h2><p>Connect your server to bring its music, movies and shows together.</p><button className="primary" onClick={onSettings}>Connect Jellyfin</button></section>:<>
 <nav className="jf-hub-library-nav" aria-label="Jellyfin libraries"><button className={!library?'active':''} aria-current={!library?'page':undefined} onClick={()=>choose()}>Overview</button>{libraries.map(l=><button key={l.id} className={library?.id===l.id?'active':''} aria-current={library?.id===l.id?'page':undefined} onClick={()=>choose(l)}>{l.name}</button>)}</nav>
 {library?<div className="jf-hub-library"><button className="text-button jf-back" onClick={()=>choose()}><ArrowLeft size={16}/>Jellyfin overview</button><JellyfinPage key={`${server}:${library.id}:${routeVersion}`} kind={library.kind} scope={library} initialItem={initialItem} onSettings={onSettings}/></div>:<>
 <Featured entries={featured.length?featured:entries.slice(0,6)} open={open} play={play}/>
 <Rail title="Your libraries">{libraries.map(l=>{const Icon=l.kind==='music'?Music2:l.kind==='movies'?Film:Tv;return <button key={l.id} className="jf-library-tile" onClick={()=>choose(l)}><Icon size={25}/><span><strong>{l.name}</strong><small>{label(l.kind)}</small></span><ArrowUpRight size={18}/></button>})}</Rail>
 {continuing.length>0&&<Rail title="Continue watching">{continuing.map(card)}</Rail>}
 {shelves.map(s=><div key={s.library.id}>{s.error&&<p role="alert" className="error-banner">{s.library.name}: {s.error}</p>}<Rail title={`Recently added · ${s.library.name}`} action={<button className="text-button" onClick={()=>choose(s.library)}>View library<ArrowUpRight size={15}/></button>}>{s.items.length?s.items.map(item=>card({item,library:s.library})):<p className="muted">{s.error?'This library could not be loaded.':'No titles in this library yet.'}</p>}</Rail></div>)}
 {loadingShelves&&<p className="muted" role="status">Loading your shelves…</p>}
 {!libraries.length&&<section className="jf-empty"><h2>No supported libraries available</h2><p>{current?.name} has no accessible music, movie or TV libraries. Other media types need their own integration.</p></section>}
 </>}
 </>}
 </div>
}
