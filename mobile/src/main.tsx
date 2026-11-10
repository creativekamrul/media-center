import React,{useEffect,useLayoutEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ArrowLeft,ArrowUpRight,ChevronDown,ChevronRight,Compass,Disc3,Heart,House,LibraryBig,ListMusic,MessageSquareText,Pause,Play,Plus,Repeat,Search,Shuffle,SkipBack,SkipForward,Settings2,Timer,Info,ArrowUp,ArrowDown} from 'lucide-react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/sora'
import {Sheet} from './Sheet'
import {Artwork} from './Artwork'
import {playlists,releases,tracks,time,type Track} from './catalog'
import './mobile.css'

type Tab='Home'|'Explore'|'Library'|'Search'
type Page={tab:Tab;album?:number;playlist?:number;player?:'art'|'lyrics';queue?:boolean}
const first:Page={tab:'Explore'}
const destinations={Home:House,Explore:Compass,Library:LibraryBig,Search}
const libraryViews=['Playlists','Albums','Artists','Tracks','Audiobooks','Podcasts','Movies & TV']
const lines=['City lights fall behind','The road unfolds in blue','A quieter kind of time','Carrying me to you','Where the evening gathers','At the edge of something new']

function App(){
  const [page,setPage]=useState<Page>(first),[slide,setSlide]=useState(0)
  const [queue,setQueue]=useState<number[]>([0,1,2]),[current,setCurrent]=useState(0),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0)
  const [repeat,setRepeat]=useState(false),[likes,setLikes]=useState<number[]>([])
  const [source,setSource]=useState('All sources'),[group,setGroup]=useState('Playlists'),[query,setQuery]=useState('')
  const [customize,setCustomize]=useState(false),[details,setDetails]=useState(false),[timerOpen,setTimerOpen]=useState(false)
  const [views,setViews]=useState<string[]>(()=>{try{const v=JSON.parse(localStorage.getItem('mobile.library.views')??'null');return Array.isArray(v)&&v.length&&v.every(x=>libraryViews.includes(x))?[...new Set(v)] as string[]:libraryViews}catch{return libraryViews}})
  const [sleepAt,setSleepAt]=useState<number|null>(null),[font,setFont]=useState(()=>{try{return localStorage.getItem('mobile.font')==='sora'?'sora':'default'}catch{return 'default'}})
  useEffect(()=>{try{localStorage.setItem('mobile.library.views',JSON.stringify(views));localStorage.setItem('mobile.font',font)}catch{}},[views,font])
  useEffect(()=>{if(sleepAt===null)return;const id=setTimeout(()=>{setPlaying(false);setSleepAt(null);setNotice('Sleep timer ended')},Math.max(0,sleepAt-Date.now()));return()=>clearTimeout(id)},[sleepAt])
  function moveView(index:number,delta:number){setViews(v=>{const next=[...v];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next})}
  const [notice,setNotice]=useState(''),[about,setAbout]=useState(false)
  const scroll=useRef<HTMLElement>(null),positions=useRef(new Map<string,number>()),startX=useRef(0)
  const track=tracks[current],release=releases[track.album],key=JSON.stringify(page)
  const remember=()=>positions.current.set(key,scroll.current?.scrollTop??0)
  function open(next:Page){remember();history.pushState({mobile:next},'');setPage(next)}
  function back(){history.back()}
  useEffect(()=>{
    history.replaceState({mobile:first},'')
    const pop=(e:PopStateEvent)=>setPage(e.state?.mobile??first)
    window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop)
  },[])
  useLayoutEffect(()=>{if(scroll.current)scroll.current.scrollTop=positions.current.get(key)??0},[key])
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2300);return()=>clearTimeout(timer)},[notice])
  useEffect(()=>{
    if(!playing)return
    const timer=setInterval(()=>setPosition(p=>Math.min(p+.25,track.seconds)),250)
    return()=>clearInterval(timer)
  },[playing,track])
  useEffect(()=>{
    if(!playing||position<track.seconds)return
    const next=queue[queue.indexOf(current)+1]??(repeat?queue[0]:undefined)
    if(next===undefined){setPlaying(false);return}
    setCurrent(next);setPosition(0)
  },[position,track,current,queue,playing,repeat])
  function play(ids:number[],id=ids[0]){setQueue(ids);setCurrent(id);setPosition(0);setPlaying(true)}
  function skip(delta:number){const next=queue[queue.indexOf(current)+delta];if(next!==undefined){setCurrent(next);setPosition(0)}}
  function toggle(){if(position>=track.seconds)setPosition(0);setPlaying(p=>!p)}
  function player(){open({...page,player:'art'})}
  function favorite(){setLikes(ids=>ids.includes(current)?ids.filter(i=>i!==current):[...ids,current])}
  const albumTracks=(id:number)=>tracks.filter(t=>t.album===id).map(t=>t.id)
  const feature=[0,4,3],featureAlbum=feature[slide]
  const moveSlide=(d:number)=>setSlide(i=>(i+d+feature.length)%feature.length)
  const changeTab=(tab:Tab)=>{if(tab!==page.tab||page.album!==undefined||page.playlist!==undefined)open({tab})}
  const openAlbum=(album:number)=>open({tab:page.tab,album})
  const card=(id:number)=><button className="coverCard" key={id} onClick={()=>openAlbum(id)}><Artwork index={id}/><strong>{releases[id].title}</strong><small>{releases[id].artist}</small></button>
  const row=(t:Track,ids:number[])=><div className="trackRow" key={t.id}><button onClick={()=>play(ids,t.id)} aria-label={'Play '+t.title}><Artwork index={t.album}/><span><strong>{t.title}</strong><small>{t.artist}</small></span></button><small>{time(t.seconds)}</small><button className="icon" aria-label={'Queue '+t.title} onClick={()=>{setQueue(q=>q.includes(t.id)?q:[...q,t.id]);setNotice(queue.includes(t.id)?'Already in queue':'Added to queue')}}><Plus/></button></div>
  const album=page.album===undefined?undefined:releases[page.album],playlist=page.playlist===undefined?undefined:playlists[page.playlist]
  const filtered=releases.map((_,i)=>i).filter(i=>source==='All sources'||source===releases[i].source)
  const picker=<select aria-label="Library source" value={source} onChange={e=>setSource(e.target.value)}>{['All sources','Downtify','Navidrome'].map(s=><option key={s}>{s}</option>)}</select>
  const playButton=(onClick:()=>void,label:string,large=false)=><button className={'playDot'+(large?' large':'')} aria-label={label} onClick={onClick}>{label==='Pause preview'?<Pause fill="currentColor"/>:<Play fill="currentColor"/>}</button>
  return <div className={"device font-"+font}>
    <main ref={scroll} hidden={!!page.player} className="pages" onScroll={remember}>
    {album||playlist?<><header className="bar"><button className="icon" aria-label="Back" onClick={back}><ArrowLeft/></button><small>{album?'Album':'Playlist'}</small></header>
      <section className="detail"><Artwork index={page.album??playlist!.art}/><h1>{album?.title??playlist?.name}</h1><p>{album?album.artist+' · '+album.source:'Saved playlist'} · {(album?albumTracks(page.album!):playlist!.ids).length} tracks</p>
        {playButton(()=>{play(album?albumTracks(page.album!):playlist!.ids);player()},'Play collection')}</section>
      <section className="rows">{(album?albumTracks(page.album!):playlist!.ids).map(id=>row(tracks[id],album?albumTracks(page.album!):playlist!.ids))}</section></>:
    <><header className="bar"><h1>{page.tab}</h1>{page.tab==='Library'?<div className="libraryActions">{picker}<button className="icon" aria-label="Customize library" onClick={()=>setCustomize(true)}><Settings2/></button></div>:<button className="icon" aria-label="Search library" onClick={()=>changeTab('Search')}><Search/></button>}</header>
    {page.tab==='Explore'&&<>
      <section className="feature" aria-label="Featured releases" onTouchStart={e=>{startX.current=e.touches[0].clientX}} onTouchEnd={e=>{const d=e.changedTouches[0].clientX-startX.current;if(Math.abs(d)>50)moveSlide(d<0?1:-1)}}>
        <div className="featureArt"><Artwork index={featureAlbum}/></div>
        <div className="featureCopy"><small>FEATURED</small><button className="featureTitle" onClick={()=>openAlbum(featureAlbum)}>{releases[featureAlbum].title}</button><p>{releases[featureAlbum].artist}</p>
          {playButton(()=>{play(albumTracks(featureAlbum));player()},'Play featured release')}</div>
        <div className="dots">{feature.map((id,i)=><button key={id} aria-current={i===slide?'true':undefined} aria-label={'Feature '+releases[id].title} onClick={()=>setSlide(i)}/>)}</div>
      </section><section className="shelf"><h2>More from artists you play</h2><div className="rail">{[5,2,3,0].map(card)}</div></section>
      <section className="shelf"><h2>Recently added albums</h2><div className="rail">{[4,1,0,5].map(card)}</div></section></>}
    {page.tab==='Library'&&<><nav className="groups">{views.map(g=><button aria-current={group===g?'page':undefined} key={g} onClick={()=>setGroup(g)}>{g}</button>)}</nav>
      {!['Playlists','Albums','Artists','Tracks'].includes(group)?<section className="emptyLibrary"><LibraryBig size={30}/><h2>{group}</h2><p>Your connected libraries will appear here.</p><small>This preview contains music only. Server connections come in the native app.</small></section>:group==='Playlists'?<div className="grid">{playlists.map((p,i)=>(source==='All sources'||releases[p.art].source===source)&&<button className="coverCard" key={p.name} onClick={()=>open({tab:'Library',playlist:i})}><Artwork index={p.art}/><strong>{p.name}</strong><small>{p.ids.length} tracks</small></button>)}</div>:group==='Albums'?<div className="grid">{filtered.map(card)}</div>:group==='Artists'?<div className="rows">{[...new Set(filtered.map(i=>releases[i].artist))].map(a=><section key={a}><h2>{a}</h2><div className="rail">{filtered.filter(i=>releases[i].artist===a).map(card)}</div></section>)}</div>:<section className="rows">{tracks.filter(t=>filtered.includes(t.album)).map(t=>row(t,filtered.flatMap(albumTracks)))}</section>}</>}
    {page.tab==='Search'&&<section className="rows"><label className="searchField"><Search/><input autoFocus placeholder="Songs, albums, artists" value={query} onChange={e=>setQuery(e.target.value)}/></label>{query.trim()?<>{tracks.filter(t=>(t.title+' '+t.artist+' '+releases[t.album].title).toLowerCase().includes(query.trim().toLowerCase())).map(t=>row(t,albumTracks(t.album)))}{!tracks.some(t=>(t.title+' '+t.artist+' '+releases[t.album].title).toLowerCase().includes(query.trim().toLowerCase()))&&<p>No matches in the demo library.</p>}</>:<><h2>Browse albums</h2><div className="grid">{[0,2,3,4].map(card)}</div></>}</section>}
    {page.tab==='Home'&&<section className="rows"><h2>Continue listening</h2><button className="continue" onClick={player}><Artwork index={track.album}/><span><strong>{track.title}</strong><small>{track.artist}</small></span><ChevronRight/></button><h2>Your favorites</h2>{likes.length?likes.map(id=>row(tracks[id],likes)):<p>Heart a song in the player to find it here.</p>}<h2>Recently added</h2><div className="rail">{[4,3,1].map(card)}</div></section>}</>}
    <footer className="previewFooter"><button onClick={()=>setAbout(true)}>About this preview <ArrowUpRight size={13}/></button></footer>
    </main>
    {!page.player&&<div className="dock"><div className="mini"><button className="miniOpen" onClick={player}><Artwork index={track.album}/><span><strong>{track.title}</strong><small>{track.artist}</small></span></button><button className="icon" onClick={toggle} aria-label={playing?'Pause preview':'Play preview'}>{playing?<Pause/>:<Play/>}</button><i style={{width:position/track.seconds*100+'%'}}/></div><nav className="bottomNav">{(Object.keys(destinations) as Tab[]).map(tab=>{const Icon=destinations[tab];return <button key={tab} aria-current={page.tab===tab?'page':undefined} onClick={()=>changeTab(tab)}><Icon size={22}/>{tab}</button>})}</nav></div>}
    {page.player&&<section className="player" aria-label="Now playing"><div className="atmosphere"><Artwork index={track.album}/></div><header className="playerHead"><button className="icon" aria-label="Close player" onClick={back}><ChevronDown/></button><small>{page.player==='lyrics'?'LYRICS':'NOW PLAYING'}</small><button className="icon" aria-label="Track details" onClick={()=>setDetails(true)}><Info/></button></header>
      <div className={'playerBody '+(page.player==='lyrics'?'words':'')} key={track.id}>
        {page.player==='art'?<><div className="playerArt"><Artwork index={track.album}/></div><div className="trackName"><div><h1>{track.title}</h1><p>{track.artist}</p></div><button aria-label="Favorite track" aria-pressed={likes.includes(current)} className="icon" onClick={favorite}><Heart fill={likes.includes(current)?'currentColor':'none'}/></button></div></>:<><div className="lyricHead"><Artwork index={track.album}/><span><strong>{track.title}</strong><small>{track.artist}</small></span></div><div className="lyrics">{(track.id===0?lines:[]).map((l,i)=><button key={l} className={Math.floor(position/track.seconds*lines.length)===i?'active':''} onClick={()=>setPosition(track.seconds*i/lines.length)}>{l}</button>)}{track.id!==0&&<p>No preview lyrics for this track.</p>}</div></>}
        <div className="transport"><div className="seek"><svg className="wave" aria-hidden="true" viewBox="0 0 300 14" preserveAspectRatio="none" style={{clipPath:`inset(0 ${100-position/track.seconds*100}% 0 0)`}}><path fill="#76c0ab" d="M0 14Q9 13 16 7T32 9Q39 14 49 11T67 9T88 11T111 7T130 9T151 11T172 7T189 8T211 10T229 9T251 8T272 10T291 9L300 10V14Z"/><path fill="#388c73" d="M0 14Q9 8 20 12T42 10T65 12T90 9T110 12T133 9T157 12T180 10T203 12T226 9T250 12T271 10T300 11V14Z"/></svg><span className="seekFill" style={{width:position/track.seconds*100+'%'}}/><input aria-label="Seek position" type="range" min="0" max={track.seconds} step=".25" value={position} onChange={e=>setPosition(Number(e.target.value))}/></div><div className="times"><span>{time(position)}</span><span>{time(track.seconds)}</span></div>
          <div className="controls"><button className="icon" aria-label="Shuffle upcoming tracks" disabled={queue.length-queue.indexOf(current)-1<2} onClick={()=>{const i=queue.indexOf(current);const next=queue.slice(i+1);for(let j=next.length-1;j>0;j--){const k=Math.floor(Math.random()*(j+1));[next[k],next[j]]=[next[j],next[k]]}setQueue([...queue.slice(0,i+1),...next]);setNotice('Upcoming tracks shuffled')}}><Shuffle/></button><button className="icon" aria-label="Previous track" disabled={queue.indexOf(current)===0} onClick={()=>skip(-1)}><SkipBack fill="currentColor"/></button>{playButton(toggle,playing?'Pause preview':'Play preview',true)}<button className="icon" aria-label="Next track" disabled={queue.indexOf(current)===queue.length-1} onClick={()=>skip(1)}><SkipForward fill="currentColor"/></button><button className="icon" aria-label="Repeat queue" aria-pressed={repeat} onClick={()=>setRepeat(v=>!v)}><Repeat/></button></div>
          <div className="playerModes"><button onClick={()=>page.player==='lyrics'?back():open({...page,player:'lyrics'})}><MessageSquareText size={18}/>{page.player==='lyrics'?'Artwork':'Lyrics'}</button><button onClick={()=>open({...page,queue:true})}><ListMusic size={18}/>Up next</button></div><div className="playerExtras"><small>{release.source} · Demo track</small><button aria-label="Sleep timer" onClick={()=>setTimerOpen(true)}><Timer size={18}/>{sleepAt?'Timer on':'Sleep timer'}</button></div><small className="silent">Interactive preview · Silent playback</small>
        </div></div>
    </section>}
    {page.queue&&<Sheet title="Up next" close={back}>{queue.slice(queue.indexOf(current)+1).map(id=><button className="queueRow" key={id} onClick={()=>{setCurrent(id);setPosition(0);setPlaying(true);back()}}><Artwork index={tracks[id].album}/><span><strong>{tracks[id].title}</strong><small>{tracks[id].artist}</small></span><Play size={17}/></button>)}{queue.indexOf(current)===queue.length-1&&<p>The queue ends after this track.</p>}</Sheet>}
    {customize&&<Sheet title="Your library" close={()=>setCustomize(false)}><p>Pin your views and put your favorites first.</p><div className="viewSettings">{views.map((v,i)=><div key={v}><span>{v}</span><button className="icon" disabled={i===0} aria-label={'Move '+v+' up'} onClick={()=>moveView(i,-1)}><ArrowUp size={18}/></button><button className="icon" disabled={i===views.length-1} aria-label={'Move '+v+' down'} onClick={()=>moveView(i,1)}><ArrowDown size={18}/></button><button className="icon" disabled={views.length===1} aria-label={'Unpin '+v} onClick={()=>{const next=views.filter(x=>x!==v);setViews(next);if(group===v)setGroup(next[0])}}>−</button></div>)}</div>{libraryViews.filter(v=>!views.includes(v)).map(v=><button className="settingAction" key={v} onClick={()=>setViews(x=>[...x,v])}><Plus size={17}/>Pin {v}</button>)}<label className="fontSetting">Typography<select value={font} onChange={e=>setFont(e.target.value)}><option value="default">Default · DM Sans + Sora</option><option value="sora">Sora · Geometric</option></select></label><small>Both choices are bundled and work offline.</small></Sheet>}
    {details&&<Sheet title="Track details" close={()=>setDetails(false)}><div className="detailFacts"><h2>{track.title}</h2><p>{track.artist}</p><dl><dt>Album</dt><dd>{release.title}</dd><dt>Library</dt><dd>{release.source}</dd><dt>Duration</dt><dd>{time(track.seconds)}</dd></dl><small>Fictional demo track. Audio format and output information will come from the native playback engine.</small></div></Sheet>}
    {timerOpen&&<Sheet title="Sleep timer" close={()=>setTimerOpen(false)}><p>Pause playback after your chosen time.</p>{[5,15,30,45,60].map(minutes=><button className="settingAction" key={minutes} onClick={()=>{setSleepAt(Date.now()+minutes*60000);setTimerOpen(false);setNotice('Sleep timer set for '+minutes+' minutes')}}><Timer size={18}/>{minutes} minutes</button>)}{sleepAt&&<button className="settingAction" onClick={()=>{setSleepAt(null);setTimerOpen(false)}}>Cancel timer</button>}</Sheet>}
    {about&&<Sheet title="About this preview" close={()=>setAbout(false)}><p>Demo library with original artwork. Playback controls simulate a timeline. No audio or server connections are active.</p></Sheet>}
    {notice&&<div role="status" className="notice">{notice}</div>}
  </div>
}
createRoot(document.getElementById('root')!).render(<App/>)
