import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,Play,Search} from 'lucide-react'
import type {MusicAlbum,MusicDetail,QueueItem} from '../../shared/types'
import type {MediaRef} from '../../shared/personal-library'
import type {ArtistRequest} from './ArtistNavigation'
import {api,ListenActions,songQueue} from './actions'
import {Art,duration,message,plain,usePageScroll} from './ui'
import {TrackArtwork} from './Artwork'
import {CollectionHeader} from './CollectionHeader'
import {PersonalActions,RefArt} from './PersonalLibrary'
import {Tracks} from './MusicBrowser'
interface Choice{key:string;name:string;source:string;ref?:MediaRef;rootId?:string}
interface Album{key:string;name:string;item?:QueueItem;remote?:MusicAlbum}
export function ArtistPage({request,back,error}:{request:ArtistRequest;back:()=>void;error:(s:string)=>void}){
 const [query,setQuery]=useState(request.query),[search,setSearch]=useState(request.query),[choices,setChoices]=useState<Choice[]>([]),[selected,setSelected]=useState<Choice>(),[busy,setBusy]=useState(true),[failure,setFailure]=useState(''),[warnings,setWarnings]=useState<string[]>([]),[items,setItems]=useState<QueueItem[]>([]),[albums,setAlbums]=useState<Album[]>([]),[bio,setBio]=useState(''),[filter,setFilter]=useState(''),[album,setAlbum]=useState<MusicDetail>(),[localAlbum,setLocalAlbum]=useState<string>(),[page,setPage]=useState(0),[revision,setRevision]=useState(0);const albumTicket=useRef(0)
 usePageScroll(`${search}:${selected?.key}:${album?.title}:${localAlbum??''}`)
 useEffect(()=>{let live=true;setBusy(true);setFailure('');setSelected(undefined);setChoices([]);setItems([]);setAlbums([])
  void (async()=>{
   const found:Choice[]=[],notes:string[]=[]
   if(request.rootId){const roots=await api.localRoots(),names=new Set<string>();for(let n=0;n<10;n++){const result=await api.localLibrary({rootId:request.rootId,view:'songs',sort:'title',page:n,search});notes.push(...result.warnings);for(const t of result.tracks)for(const name of [t.artist,t.albumArtist])if(name&&name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))names.add(name);if((n+1)*100>=result.total)break;if(n===9)notes.push('Refine your search to see more local artists.')}for(const name of names)found.push({key:name,name,rootId:request.rootId,source:roots.find(r=>r.id===request.rootId)?.name??'Local music'})}
   else if(request.artistId&&request.serverId){found.push({key:`${request.serverId}:${request.artistId}`,name:request.query,source:'Music library',ref:{kind:'artist',serverId:request.serverId,id:request.artistId,title:request.query,subtitle:''}})}
   else{const result=await api.peopleSearch({query:search,role:'artist'});notes.push(...result.warnings);const connections=(await api.settings()).connections;for(const person of result.items){const r=person.ref;if(r.kind==='artist'&&(!request.serverId||request.serverId===r.serverId))found.push({key:`${r.serverId}:${r.id}`,name:person.name,ref:r,source:connections.find(c=>c.id===r.serverId)?.name??'Music library'})}}
   if(live){setChoices(found);setWarnings(notes);const exact=found.filter(c=>c.name.trim().toLocaleLowerCase()===search.trim().toLocaleLowerCase());if(exact.length)setSelected(exact[0])}
  })().catch(e=>{if(live)setFailure(message(e))}).finally(()=>{if(live)setBusy(false)})
  return()=>{live=false}
 },[search,request,revision])
 useEffect(()=>{if(!selected)return;albumTicket.current++;let live=true;setBusy(true);setFailure('');setItems([]);setAlbums([]);setBio('');setAlbum(undefined);setLocalAlbum(undefined);setPage(0);setFilter('')
  void (async()=>{
   let queue:QueueItem[]=[],collection:Album[]=[],description=''
   const r=selected.ref
   if(r&&r.kind==='artist'){
    const detail=await api.musicDetail({serverId:r.serverId,id:r.id,kind:'artist'});description=detail.artist?.description??''
    collection=detail.albums.map(a=>({key:a.id,name:a.title,remote:a}));if(live)setAlbums(collection)
    const limited=detail.albums.slice(0,50);if(detail.albums.length>50&&live)setWarnings(w=>[...w,'The track list covers the first 50 albums. Open any album to hear its full track list.'])
    for(let n=0;n<limited.length&&queue.length<1000;n+=4){if(!live)return;const results=await Promise.allSettled(limited.slice(n,n+4).map(a=>api.musicDetail({serverId:a.serverId,id:a.id,kind:'album'})));for(const result of results){if(result.status==='fulfilled')queue.push(...songQueue(result.value.tracks,result.value.title));else if(live)setWarnings(w=>[...w,'An album could not be loaded. Open it to try again.'])}}
    queue=[...new Map(queue.map(q=>[JSON.stringify(q.target),q])).values()];if(queue.length>1000&&live)setWarnings(w=>[...w,'Showing the first 1,000 tracks. Open an album for the rest.']);queue=queue.slice(0,1000)
   }else if(selected.rootId){
    for(let n=0;n<10;n++){const d=await api.localLibrary({rootId:selected.rootId,view:'songs',sort:'title',page:n,search:selected.name});queue.push(...d.tracks.filter(t=>[t.artist,t.albumArtist].some(name=>name?.trim().toLocaleLowerCase()===selected.name.trim().toLocaleLowerCase())).map(t=>({target:{kind:'local-file' as const,serverId:'local' as const,rootId:selected.rootId!,fileId:t.id},title:t.title,subtitle:t.artist,context:t.album||'Unsorted audio',duration:t.duration})));if((n+1)*100>=d.total)break;if(n===9&&live)setWarnings(w=>[...w,'Showing the first 1,000 tracks from this local artist.'])}
    collection=[...new Map(queue.map(q=>[q.context!,{key:q.context!,name:q.context!,item:q}])).values()]
   }
   if(live){setItems(queue);setAlbums(collection);setBio(description)}
  })().catch(e=>{if(live)setFailure(message(e))}).finally(()=>{if(live)setBusy(false)})
  return()=>{live=false;albumTicket.current++}
 },[selected])
 const visible=items.filter(q=>(!localAlbum||q.context===localAlbum)&&`${q.title} ${q.context??''}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()))
 const openAlbum=async(a:Album)=>{if(!a.remote){setLocalAlbum(a.key);setPage(0);setFilter('');return}const ticket=++albumTicket.current;try{const detail=await api.musicDetail({serverId:a.remote.serverId,id:a.remote.id,kind:'album'});if(ticket===albumTicket.current)setAlbum(detail)}catch(e){if(ticket===albumTicket.current)error(message(e))}}
 return <section className="artist-page"><button className="text-button back" onClick={()=>album||localAlbum?(setAlbum(undefined),setLocalAlbum(undefined)):back()}><ArrowLeft size={16}/>{album||localAlbum?'Back to artist':'Back'}</button>
 {failure&&<div role="alert"><p>{failure}</p><button className="secondary" onClick={()=>setRevision(n=>n+1)}>Retry artist</button></div>}{warnings.map((w,i)=><p className="muted" role="status" key={i}>{w}</p>)}
 {!selected?<><h1>Artists</h1><form className="artist-search" onSubmit={e=>{e.preventDefault();if(query.trim().length>=2)setSearch(query.trim())}}><label className="search"><Search size={18}/><input aria-label="Search artists" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="secondary" disabled={busy||query.trim().length<2}>Search</button></form>{busy?<p role="status">Finding artists…</p>:!choices.length?<p>No matching artists in this library. Try the artist’s individual name.</p>:<div className="artist-choices">{choices.map(c=><button className="secondary" key={c.key} onClick={()=>setSelected(c)}>{c.name}<small>{c.source}</small></button>)}</div>}</>:
 <><CollectionHeader><>{album?<Art item={{...album.album!,kind:'album'}}/>:selected.ref?<RefArt refItem={selected.ref}/>:<div className="art artist-local-art"><TrackArtwork item={items[0]}/></div>}</><div className="detail-heading"><p className="eyebrow">{album||localAlbum?'ALBUM':'ARTIST'} · {selected.source}</p><h1>{album?.title??localAlbum??selected.name}</h1><p>{album?album.subtitle:`${albums.length} ${albums.length===1?'album':'albums'} · ${items.length} ${items.length===1?'track':'tracks'}`}</p><ListenActions items={album?songQueue(album.tracks,album.title):localAlbum?items.filter(q=>q.context===localAlbum):items} disabled={busy} error={error} more={selected.ref&&!album&&!localAlbum?<PersonalActions refs={[selected.ref]}/>:undefined}/></div></CollectionHeader>
 {busy&&<p role="status">Loading artist collection…</p>}
 {album?<Tracks tracks={album.tracks} serverId={album.album!.serverId} context={album.title} error={error}/>:<>
 {!localAlbum&&<>{bio&&<details className="artist-about"><summary>About {selected.name}</summary><p>{plain(bio)}</p></details>}{choices.length>1&&<label className="field">Artist / library<select aria-label="Artist library" value={selected.key} onChange={e=>setSelected(choices.find(c=>c.key===e.target.value))}>{choices.map(c=><option key={c.key} value={c.key}>{c.name} · {c.source}</option>)}</select></label>}<div className="section-title"><h2>Albums</h2></div><div className="media-grid artist-albums">{albums.map(a=><button className="media-card" key={a.key} onClick={()=>void openAlbum(a)}>{a.remote?<Art item={a.remote}/>:<TrackArtwork item={a.item}/>}<div className="card-copy"><strong>{a.name}</strong><span>{a.remote?.year??selected.name}</span></div></button>)}</div></>}
 <div className="section-title"><h2>{localAlbum?'Album tracks':'Tracks'}</h2><span>{visible.length} tracks</span></div><label className="search artist-track-search"><Search size={16}/><input aria-label="Search artist tracks" placeholder="Search tracks and albums…" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0)}}/></label>
 {!busy&&!visible.length&&<p>No matching tracks in this collection.</p>}
 <div className="artist-tracks">{visible.slice(page*100,(page+1)*100).map((q,i)=><div className="artist-track" key={`${page}:${i}`}><span>{page*100+i+1}</span><TrackArtwork item={q}/><div><strong>{q.title}</strong><small>{q.context??q.subtitle}</small></div><span>{duration(q.duration??0)}</span><button className="icon-button" aria-label={`Play ${q.title}`} onClick={()=>void api.play({queue:visible,index:page*100+i}).catch(e=>error(message(e)))}><Play size={18}/></button></div>)}</div>
 {visible.length>100&&<div className="pagination"><button className="secondary" disabled={!page} onClick={()=>setPage(n=>n-1)}>Previous tracks</button><span>{page+1} / {Math.ceil(visible.length/100)}</span><button className="secondary" disabled={(page+1)*100>=visible.length} onClick={()=>setPage(n=>n+1)}>Next tracks</button></div>}
 </>}
 </>}
 </section>
}
