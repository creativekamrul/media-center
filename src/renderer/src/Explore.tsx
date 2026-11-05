import {RecentExploreAlbums} from './RecentExploreAlbums'
import {useState} from 'react'
import {Play,Search,RefreshCw,Compass,ChevronLeft,ChevronRight,ListPlus,EyeOff,ArrowUpRight,Sparkles} from 'lucide-react'
import type {Recommendation} from '../../shared/recommendations'
import {progressKey} from '../../shared/timeline'
import {api,Modal} from './actions'
import type {SearchCollection} from '../../shared/experience'
import {SearchCollectionPage} from './SearchCollectionPage'
import {useExploreSources} from './useExploreSources'
import {TrackArtwork,QueueArt} from './Artwork'
import {message} from './ui'
import {MediaSearch} from './MediaSearch'
import {ExploreCinema} from './ExploreCinema'
import {ArtistLink} from './ArtistNavigation'
import {Rail} from './JellyfinHub'
const mediaKind=(r:Recommendation)=>r.item.target.kind==='audiobook'?'books':r.item.target.kind==='podcast-episode'?'podcasts':'music'
function savedList(key='explore-hidden'):string[]{try{const value=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,500):[]}catch{return []}}
export function Explore(){
 const [revision,setRevision]=useState(0),[error,setError]=useState(''),[search,setSearch]=useState(false),[type,setType]=useState('all'),[featureKey,setFeatureKey]=useState<string>()
 const [hidden,setHidden]=useState(()=>savedList()),[notice,setNotice]=useState('')
 const [less,setLess]=useState(()=>savedList('explore-less-artists')),[choice,setChoice]=useState<Recommendation>(),[undo,setUndo]=useState<{key:string;artist:boolean}>(),[album,setAlbum]=useState<SearchCollection>()
 const {items,sources,busy,error:sourceError,retry}=useExploreSources(revision)
 const artistKey=(r:Recommendation)=>r.item.subtitle.trim().normalize('NFKC').toLowerCase()
 const visible=items.filter(r=>!hidden.includes(progressKey(r.item.target))&&(type==='all'||mediaKind(r)===type))
 const reduced=new Set<string>(),deferred:Recommendation[]=[]
 const rows=visible.filter(r=>{
   const artist=artistKey(r)
   if(mediaKind(r)!=='music'||!less.includes(artist))return true
   if(!reduced.has(artist)){deferred.push(r);reduced.add(artist)}
   return false
 }).concat(deferred)
 const music=rows.filter(r=>mediaKind(r)==='music'),spoken=rows.filter(r=>mediaKind(r)!=='music')
 const features=rows.slice(0,6)
 const pinned=featureKey&&rows.find(r=>progressKey(r.item.target)===featureKey)
 if(pinned&&!features.includes(pinned))features[features.length-1]=pinned
 const featured=pinned?features.indexOf(pinned):0,active=features[featured]
 const setFeatured=(index:number)=>{const entry=features[index];setFeatureKey(entry?progressKey(entry.item.target):undefined)}
 const run=(work:Promise<unknown>)=>void work.catch(e=>setError(message(e)))
 const play=(r:Recommendation,queue:Recommendation[])=>run(api.play({queue:queue.map(r=>r.item),index:queue.indexOf(r)}))
 const feedback=(r:Recommendation,artist:boolean)=>{
   const key=artist?artistKey(r):progressKey(r.item.target)
   const next=[key,...(artist?less:hidden).filter(id=>id!==key)].slice(0,500)
   if(artist)setLess(next);else setHidden(next)
   localStorage.setItem(artist?'explore-less-artists':'explore-hidden',JSON.stringify(next))
   setUndo({key,artist});setChoice(undefined)
   setNotice(artist?`Fewer suggestions from ${r.item.subtitle}.`:`Hidden ${r.item.title}.`)
 }
 const undoFeedback=()=>{
   if(!undo)return
   const next=(undo.artist?less:hidden).filter(key=>key!==undo.key)
   if(undo.artist)setLess(next);else setHidden(next)
   localStorage.setItem(undo.artist?'explore-less-artists':'explore-hidden',JSON.stringify(next))
   setUndo(undefined);setNotice('')
 }
 const albumLink=(r:Recommendation)=>r.album&&<button className="artist-link explore-album-link" onClick={()=>{if(active)setFeatureKey(progressKey(active.item.target));setAlbum(r.album)}} aria-label={`Open album ${r.album!.title}`}>{r.album.title} <ArrowUpRight size={13}/></button>
 const cards=(entries:Recommendation[],compact=false)=>entries.map(r=><article className={`explore-card ${compact?'explore-card-wide':''} ${mediaKind(r)==='books'?'explore-book':''}`} key={progressKey(r.item.target)}><button className="explore-art" aria-label={`Play ${r.item.title}`} onClick={()=>play(r,entries)}><TrackArtwork item={r.item}/><span className="explore-play"><Play size={22}/></span></button><div className="explore-card-copy"><small>{r.source}</small><strong>{r.item.title}</strong><span><ArtistLink item={r.item} name={r.item.subtitle}/></span>{albumLink(r)}<small>{r.reason}</small></div><div className="explore-card-actions"><button className="icon-button" aria-label={`Add ${r.item.title} to queue`} onClick={()=>{run(api.queueEdit({action:'append',items:[r.item]}));setUndo(undefined);setNotice(`Adding ${r.item.title} to your queue.`)}}><ListPlus size={17}/></button><button className="icon-button" aria-label={`Show less: ${r.item.title}`} onClick={()=>setChoice(r)}><EyeOff size={17}/></button></div></article>)
 return <section className="explore-page explore-editorial"><header className="explore-masthead"><div><p className="eyebrow"><Compass size={14}/> YOUR LIBRARIES, TOGETHER</p><h1>Explore</h1></div><div className="explore-header-tools"><button className="explore-search-trigger" onClick={()=>setSearch(s=>!s)}><Search size={18}/><span>{search?'Back to your discoveries':'Find your next favorite'}</span><ArrowUpRight size={17}/></button><button className="icon-button" aria-label="Refresh Explore" disabled={busy} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></button></div></header>
 {search?<MediaSearch embedded close={()=>setSearch(false)} error={setError}/>:<>
 <div className="explore-filter-line"><span><Sparkles size={15}/> A little more to explore.</span><label>In the mood for <select aria-label="Explore media type" value={type} onChange={e=>{setType(e.target.value);setFeatureKey(undefined)}}>{[['all','Everything'],['music','Music'],['books','Books'],['podcasts','Podcasts'],['video','Something to watch']].map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></label></div>
 {active&&type!=='video'&&<section className="explore-feature" aria-label="Featured discoveries"><div className="explore-feature-atmosphere" aria-hidden="true"><QueueArt item={active.item}/></div><div className="explore-feature-shade"/><div className="explore-feature-copy" key={progressKey(active.item.target)}><span className="explore-glass-label">{mediaKind(active)==='music'?'YOUR NEXT LISTEN':mediaKind(active)==='books'?'A STORY TO GET INTO':'PRESS PLAY, SETTLE IN'}</span><h2>{active.item.title}</h2><p className="explore-feature-artist">{active.item.subtitle}</p>{albumLink(active)}<p className="explore-feature-reason">{active.reason} <span> · {active.source}</span></p><div className="explore-feature-actions"><button className="primary" onClick={()=>play(active,features)}><Play size={20}/>Listen now</button><button className="explore-glass-button" onClick={()=>{run(api.queueEdit({action:'append',items:[active.item]}));setUndo(undefined);setNotice(`Adding ${active.item.title} to your queue.`)}}><ListPlus size={19}/>Add to queue</button><button className="explore-glass-icon" aria-label={`Show less: ${active.item.title}`} onClick={()=>setChoice(active)}><EyeOff size={18}/></button></div></div><div className="explore-feature-cover" key={'art:'+progressKey(active.item.target)}><QueueArt item={active.item}/></div><footer className="explore-feature-footer"><span>IN YOUR LIBRARY</span><div className="explore-feature-dots">{features.map((r,i)=><button key={progressKey(r.item.target)} aria-label={`Feature ${r.item.title}`} aria-current={active===r?'true':undefined} onClick={()=>setFeatured(i)}/>)}</div><div className="explore-feature-paging"><span>{featured%features.length+1} / {features.length}</span><button className="explore-glass-icon" aria-label="Previous featured discovery" disabled={features.length<2} onClick={()=>setFeatured((featured-1+features.length)%features.length)}><ChevronLeft size={20}/></button><button className="explore-glass-icon" aria-label="Next featured discovery" disabled={features.length<2} onClick={()=>setFeatured((featured+1)%features.length)}><ChevronRight size={20}/></button></div></footer></section>}
 {busy&&<p role="status">Finding things to enjoy in your libraries…</p>}{sourceError&&<p role="alert">{sourceError} <button onClick={()=>setRevision(n=>n+1)}>Retry sources</button></p>}{sources.filter(s=>s.warnings.length).map(s=><p className="explore-source-notes" role="status" key={s.id}>{s.warnings.join(' ')} <button className="text-button" disabled={s.pending} onClick={()=>retry(s.id)}>Retry {s.name}</button></p>)}
 {music.some(r=>r.score>0&&!r.heard)&&<Rail title="More from artists you play">{cards(music.filter(r=>r.score>0&&!r.heard))}</Rail>}
 {music.some(r=>r.heard===false&&r.score===0)&&<Rail title="Unheard in your library" action={<span className="explore-shelf-caption">Based on your listening history here</span>}>{cards(music.filter(r=>r.heard===false&&r.score===0),true)}</Rail>}
 {music.some(r=>r.heard)&&<Rail title="Play again">{cards(music.filter(r=>r.heard))}</Rail>}
 {(type==='all'||type==='music')&&<RecentExploreAlbums revision={revision}/>}
 {spoken.length>0&&<Rail title="Take your time" action={<span className="explore-shelf-caption">Books & podcasts</span>}>{cards(spoken)}</Rail>}
 {(type==='all'||type==='video')&&<ExploreCinema revision={revision} watchOnly={type==='video'}/>}
 {!busy&&!rows.length&&type!=='video'&&<div className="dt-empty"><Compass size={32}/><h2>Your next discovery starts here</h2><p>{hidden.length?'Change the filter or restore your hidden suggestions.':'Connect a library or save music in Downtify to fill this space.'}</p></div>}
 <footer className="explore-about"><details><summary>How your discoveries are chosen</summary><p>Music uses recorded listening time, recent activity, and variety across artists and sources. Books and podcasts come from available library samples; video shelves show ongoing and recently added titles. Hide a title or reduce suggestions from its artist on this device. Both choices can be undone.</p></details>{(hidden.length+less.length)>0&&<button className="text-button" onClick={()=>{setHidden([]);setLess([]);setUndo(undefined);localStorage.removeItem('explore-hidden');localStorage.removeItem('explore-less-artists');setNotice('Hidden suggestions restored.')}}>Restore suggestions ({hidden.length+less.length})</button>}</footer>
 </>}{album&&<Modal title="Album details" close={()=>setAlbum(undefined)}><SearchCollectionPage collection={album} back={()=>setAlbum(undefined)} open={setAlbum} error={setError}/></Modal>}
 {choice&&<Modal title="Adjust suggestions" close={()=>setChoice(undefined)}><p>{choice.item.title}</p><div className="control-actions"><button className="secondary" onClick={()=>feedback(choice,false)}>Hide this {mediaKind(choice)==='music'?'track':'item'}</button>{mediaKind(choice)==='music'&&choice.item.subtitle.trim()&&!less.includes(artistKey(choice))&&<button className="secondary" onClick={()=>feedback(choice,true)}>Suggest {choice.item.subtitle} less</button>}</div></Modal>}
 {notice&&<p className="explore-notice" role="status">{notice}{undo&&<button className="text-button" onClick={undoFeedback}>Undo</button>}<button className="text-button" onClick={()=>{setNotice('');setUndo(undefined)}}>Dismiss</button></p>}{error&&<p role="alert">{error}</p>}</section>
}
