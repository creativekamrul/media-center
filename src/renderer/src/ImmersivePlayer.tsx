import {TrackArtwork} from './Artwork'
import {useEffect,useState} from 'react'
import {Maximize,ArrowLeft,ChevronLeft,ChevronRight,Pause,Play,Settings2,SkipBack,SkipForward} from 'lucide-react'
import type {PlaybackState,PlayerCommand} from '../../shared/types'
import {defaultPlayingScreen} from '../../shared/playing-screen'
import {lyricAppearanceStyle} from './lyricAppearanceStyle'
import {LyricsAppearance} from './LyricsAppearance'
import {QueueArt} from './ListeningSpace'
import {LyricsPanel} from './LyricsPanel'
import {api} from './actions'
import {duration,message} from './ui'

export function ImmersivePlayer({player,close}:{player:PlaybackState;close:()=>void}){
 const [prefs,setPrefs]=useState(defaultPlayingScreen),[ready,setReady]=useState(false),[options,setOptions]=useState(false),[error,setError]=useState(''),[page,setPage]=useState(0)
 useEffect(()=>{const reload=()=>void api.playingScreenPreferences().then(setPrefs).catch(e=>setError(message(e)));window.addEventListener('profile-applied',reload);return()=>window.removeEventListener('profile-applied',reload)},[])
 const item=player.queue[player.queueIndex],canLyrics=item?.target.kind==='music-track'||item?.target.kind==='local-file'
 useEffect(()=>{let live=true;void api.playingScreenPreferences().then(p=>{if(live)setPrefs(p)}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setReady(true)});return()=>{live=false}},[])
 useEffect(()=>{const elements=[...document.querySelectorAll<HTMLElement>('.sidebar,.topbar')],previous=elements.map(el=>el.inert);elements.forEach(el=>el.inert=true);return()=>elements.forEach((el,i)=>el.inert=previous[i])},[])
 useEffect(()=>setPage(Math.floor(player.queueIndex/50)),[player.queueIndex,player.queue.length])
 const command=(input:PlayerCommand)=>void api.command(input).catch(e=>setError(message(e)))
 const jump=(index:number)=>void api.queueEdit({action:'jump',index}).catch(e=>setError(message(e)))
 return <section className={`immersive-player backdrop-${prefs.background} lyric-animation-${prefs.animation} ${prefs.motion?'with-motion':'still'}`} aria-label="Immersive playing screen" style={lyricAppearanceStyle(prefs)}>
  <div className="immersive-atmosphere" aria-hidden="true">{prefs.background==='artwork'&&<QueueArt item={item}/>}<div className="ambient-glow"/>{prefs.background==='stars'&&<div className="star-field"/>}</div>
  <header className="immersive-header"><button className="secondary" autoFocus onClick={close}><ArrowLeft size={16}/>Classic view</button><span className="eyebrow">A LITTLE CLOSER TO THE MUSIC</span>
   <button className="secondary" aria-label="Toggle fullscreen" title="Fullscreen (F11); Escape to exit" onClick={()=>void api.fullscreen('toggle').catch(e=>setError(message(e)))}><Maximize size={17}/>Fullscreen</button><button className="secondary" disabled={!ready} onClick={()=>setOptions(true)}><Settings2 size={17}/>Appearance</button>
  </header>
  {options&&<LyricsAppearance value={prefs} preview={setPrefs} close={()=>setOptions(false)}/>}
  {error&&<p className="screen-error" role="alert">{error}<button className="text-button" onClick={()=>setError('')}>Dismiss</button></p>}
  <div className="immersive-layout"><div className="immersive-stage">{canLyrics?<LyricsPanel player={player} immersive motion={prefs.motion&&prefs.animation!=='none'} wordLift={prefs.animation==='flow'}/>:<div className="spoken-stage"><p className="eyebrow">{player.kind==='audiobook'?'IN THIS CHAPTER':'NOW PLAYING'}</p><h1>{player.chapters.find(c=>player.position>=c.start&&player.position<c.end)?.title??player.title}</h1><p>{player.subtitle}</p>{player.chapters.length>0&&<div className="screen-chapters">{player.chapters.map(c=><button key={c.id} onClick={()=>command({action:'seek',value:c.start})}>{c.title}<span>{duration(c.start)}</span></button>)}</div>}</div>}</div>
   <aside className="immersive-side" aria-label="Current track and queue"><div className="screen-track"><div className="screen-cover" key={JSON.stringify(item?.target)}><QueueArt item={item}/></div><h2 title={player.title}>{player.title}</h2><p>{player.subtitle}</p><div className="screen-transport"><button className="icon-button" aria-label="Previous in playing screen" disabled={!player.queue.length} onClick={()=>command({action:'previous'})}><SkipBack size={19}/></button><button className="main-play" aria-label={player.status==='playing'?'Pause in playing screen':'Play in playing screen'} disabled={!player.queue.length||player.status==='loading'} onClick={()=>command({action:'toggle'})}>{player.status==='playing'?<Pause size={23}/>:<Play size={23}/>}</button><button className="icon-button" aria-label="Next in playing screen" disabled={!player.queue.length} onClick={()=>command({action:'next'})}><SkipForward size={19}/></button></div></div>
    <section className="screen-queue" aria-label="Current queue"><header><h2>Current queue</h2><span>{player.queue.length} tracks</span></header><div className="screen-queue-scroll">{player.queue.slice(page*50,(page+1)*50).map((q,offset)=>{const index=page*50+offset;return <button key={index} className={`screen-queue-item ${index===player.queueIndex?'current':''}`} aria-current={index===player.queueIndex?'true':undefined} aria-label={`Play queue item ${index+1}: ${q.title}`} onClick={()=>jump(index)}><span className="queue-number">{index===player.queueIndex?<Play size={13}/>:index+1}</span><TrackArtwork item={q}/><span><strong>{q.title}</strong><small>{q.subtitle}</small></span><span>{q.duration?duration(q.duration):''}</span></button>})}{!player.queue.length&&<p className="muted">Add something to your queue to begin.</p>}</div>{player.queue.length>50&&<div className="screen-pages"><button className="icon-button" aria-label="Previous queue page" disabled={!page} onClick={()=>setPage(n=>n-1)}><ChevronLeft size={16}/></button><span>{page+1} / {Math.ceil(player.queue.length/50)}</span><button className="icon-button" aria-label="Next queue page" disabled={(page+1)*50>=player.queue.length} onClick={()=>setPage(n=>n+1)}><ChevronRight size={16}/></button></div>}</section>
   </aside>
  </div>
 </section>
}
