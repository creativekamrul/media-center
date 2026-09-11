import {createPortal} from 'react-dom'
import {LyricEditor} from './LyricEditor'
import {QueueArt} from './ListeningSpace'
import {defaultPlayingScreen} from '../../shared/playing-screen'
import {LyricsAppearance} from './LyricsAppearance'
import {lyricAppearanceStyle} from './lyricAppearanceStyle'
import { KaraokeLine } from './KaraokeLine'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LyricSearch } from './LyricSearch'
import { Settings2, Search, RefreshCw } from 'lucide-react'
import type { PlaybackState } from '../../shared/types'
import { progressKey } from '../../shared/timeline'
import { activeLyricIndex, type LyricsResult } from '../../shared/lyrics'
import { api } from './actions'
import { message } from './ui'
function LyricsContent({player,immersive=false,motion=true,wordLift=false,toolbar}:{player:PlaybackState;immersive?:boolean;motion?:boolean;wordLift?:boolean;toolbar?:HTMLElement|null}) {
 const item=player.queue[player.queueIndex],key=item?progressKey(item.target):''
 const [result,setResult]=useState<LyricsResult>(),[error,setError]=useState(''),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0),[follow,setFollow]=useState(true)
 const [offset,setOffset]=useState(0)
 useEffect(()=>{let live=true;setOffset(0);if(item&&['music-track','local-file'].includes(item.target.kind))void api.lyricOffset({key}).then(v=>{if(live)setOffset(v)}).catch(e=>{if(live)setError(message(e))});return()=>{live=false}},[key])
 const [searchKey,setSearchKey]=useState<string>(),[editKey,setEditKey]=useState<string>()
 useEffect(()=>{setSearchKey(undefined);setEditKey(undefined)},[key])
 const lastRevision=useRef(0)
 const box=useRef<HTMLDivElement>(null),rows=useRef<(HTMLButtonElement|null)[]>([])
 useEffect(()=>{let live=true;setResult(undefined);setError('');setLoading(true);setFollow(true)
  const refresh=lastRevision.current!==revision;lastRevision.current=revision
  void api.lyrics({refresh}).then(r=>{if(live&&r.key===key)setResult(r)}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setLoading(false)})
  return()=>{live=false}
 },[key,revision])
 const shown=useMemo(()=>result?.key===key?{...result,lines:result.lines.map(l=>({...l,time:l.time+offset,words:l.words?.map(w=>({...w,time:w.time+offset,end:w.end===undefined?undefined:w.end+offset}))}))}:undefined,[result,key,offset]),active=activeLyricIndex(shown?.lines??[],player.position)
 useEffect(()=>{const el=rows.current[active],root=box.current;if(follow&&el&&root)root.scrollTo({top:Math.max(0,root.scrollTop+el.getBoundingClientRect().top-root.getBoundingClientRect().top-root.clientHeight/2+el.clientHeight/2),behavior:motion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'})},[active,follow,shown,immersive,motion])
 const dialogs=<>{searchKey===key&&<LyricSearch key={key} songKey={key} title={item?.title??''} artist={item?.subtitle??''} close={()=>setSearchKey(undefined)} saved={()=>setRevision(n=>n+1)}/>}{editKey===key&&<LyricEditor songKey={key} player={player} result={result} close={()=>setEditKey(undefined)} saved={()=>setRevision(n=>n+1)}/>}</>
 const lyricTools=<>{item&&['music-track','local-file'].includes(item.target.kind)&&<div className="lyrics-tools"><button className="secondary" onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setSearchKey(key)}}><Search size={16}/>Find lyrics</button><button className="secondary" disabled={loading} onClick={()=>void api.lyricImport({key,source:'file'}).then(ok=>{if(ok)setRevision(n=>n+1)}).catch(e=>setError(message(e)))}>Import lyrics</button>{item.target.kind==='local-file'&&<button className="secondary" disabled={loading} onClick={()=>void api.lyricImport({key,source:'embedded'}).then(ok=>{if(ok)setRevision(n=>n+1)}).catch(e=>setError(message(e)))}>Read embedded lyrics</button>}<button className="secondary" disabled={loading} onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setEditKey(key)}}>Edit lyrics & timing</button>{shown?.saved&&<><span className="muted">Saved match · #{shown.recordId}</span><button className="text-button" onClick={()=>void api.clearLyrics({key}).then(()=>setRevision(n=>n+1)).catch(e=>setError(message(e)))}>Clear saved match</button></>}</div>}</>
 const timingTools=<><label className="field lyric-offset">Timing offset (seconds; positive means later)<input aria-label="Lyric timing offset" type="number" min={-30} max={30} step={0.25} value={offset} onChange={e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value< -30||value>30)return;setOffset(value);void api.lyricOffset({key,seconds:value}).catch(e=>setError(message(e)))}}/></label><label className="check-field"><input type="checkbox" checked={follow} onChange={e=>setFollow(e.target.checked)}/>Follow playback</label></>
 return <section className="lyrics-panel" aria-label="Lyrics">{immersive&&toolbar&&createPortal(<details className="immersive-lyric-menu"><summary>Lyrics tools</summary><div className="immersive-lyric-tools">{lyricTools}<button className="icon-button" aria-label="Refresh lyrics" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></button>{!!shown?.lines.length&&<details className="lyric-playback-options"><summary>Timing & follow</summary>{timingTools}</details>}</div></details>,toolbar)}<div className="section-title"><div><h2>{immersive?item?.title||'Lyrics':'Lyrics'}</h2>{!immersive&&<p className="muted">{shown?.saved?'Saved lyrics':shown?.source==='embedded'?'Embedded lyrics':shown?.source==='navidrome'?'Navidrome':shown?.source==='lrclib'?'LRCLIB':'Song lyrics'} · {shown?.lines.length?'Synced to MPV':'Song lyrics'}</p>}</div>{!immersive&&!toolbar&&<button className="icon-button" aria-label="Refresh lyrics" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></button>}</div>{!immersive&&(toolbar?createPortal(<>{lyricTools}<button className="icon-button" aria-label="Refresh lyrics" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw size={18}/></button></>,toolbar):lyricTools)}{immersive?createPortal(dialogs,document.body):dialogs}{!immersive&&<p className="lyrics-caption">{item?.title} · {item?.subtitle}</p>}
 {loading&&<p role="status" className="lyrics-message">Finding lyrics…</p>}{error&&<p role="alert" className="lyrics-message">{error}</p>}
 {shown?.status==='unsupported'&&<p className="lyrics-message">Lyrics are available for music and tagged local audio.</p>}
 {shown?.status==='instrumental'&&<p className="lyrics-message">Instrumental — no lyrics for this track.</p>}
 {shown?.status==='missing'&&<p className="lyrics-message">No matching lyrics found. Title, artist, album, and duration are used to identify the recording.</p>}
 {!!shown?.lines.length&&<>{!immersive&&timingTools}<div className="lyrics-scroll" ref={box} onWheel={()=>setFollow(false)} onTouchMove={()=>setFollow(false)} onKeyDown={e=>{if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))setFollow(false)}}>{shown.lines.map((line,i)=><button ref={el=>{rows.current[i]=el}} key={i} className={`lyric-line ${i===active?'current':i<active?'past':'upcoming'}`} aria-current={i===active?'true':undefined} disabled={!['playing','paused'].includes(player.status)||line.time>player.duration} title={`Seek to ${Math.floor(line.time/60)}:${String(Math.floor(line.time%60)).padStart(2,'0')}`} onClick={()=>void api.seekLyric({key,time:Math.max(0,line.time)}).catch(e=>setError(message(e)))}><KaraokeLine line={line} end={shown.lines[i+1]?.time??player.duration} active={i===active} player={player} motion={motion} wordLift={wordLift}/></button>)}</div></>}
 {shown?.status==='found'&&!shown.lines.length&&<div className="lyrics-scroll lyrics-plain" tabIndex={0}><p className="muted">Plain lyrics · timing unavailable</p><p>{shown.plain}</p></div>}
 {shown?.warning&&<p className="muted" role="status">{shown.warning}</p>}{!immersive&&<p className="lyrics-credit">Lyrics are checked while this panel is open: embedded tags for local files, or Navidrome lyrics for server music, then LRCLIB. Only the LRCLIB fallback sends song metadata there; credentials and audio stay private.</p>}</section>
}

export function LyricsPanel(props:{player:PlaybackState;immersive?:boolean;motion?:boolean;wordLift?:boolean;toolbar?:HTMLElement|null}) {
 return props.immersive?<LyricsContent {...props}/>:<StandardLyrics player={props.player}/>
}
function StandardLyrics({player}:{player:PlaybackState}) {
 const [prefs,setPrefs]=useState(defaultPlayingScreen),[ready,setReady]=useState(false),[open,setOpen]=useState(false),[error,setError]=useState(''),[toolbar,setToolbar]=useState<HTMLDivElement|null>(null)
 useEffect(()=>{const reload=()=>void api.playingScreenPreferences().then(setPrefs).catch(e=>setError(message(e)));window.addEventListener('profile-applied',reload);return()=>window.removeEventListener('profile-applied',reload)},[])
 useEffect(()=>{let live=true;void api.playingScreenPreferences().then(p=>{if(live)setPrefs(p)}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setReady(true)});return()=>{live=false}},[])
 return <div className={`standard-lyrics backdrop-${prefs.background} lyric-animation-${prefs.animation} ${prefs.motion?'with-motion':'still'}`} style={lyricAppearanceStyle(prefs)}>
 {prefs.background==='artwork'&&<div className="standard-lyrics-backdrop" aria-hidden="true"><QueueArt item={player.queue[player.queueIndex]}/></div>}
 <div className="standard-lyrics-options"><div className="standard-lyrics-tools" ref={setToolbar}/><button className="secondary" disabled={!ready} onClick={()=>setOpen(true)}><Settings2 size={16}/>Lyrics appearance</button></div>
 {error&&<p role="alert">{error}</p>}{open&&<LyricsAppearance value={prefs} preview={setPrefs} close={()=>setOpen(false)}/>}
 <LyricsContent player={player} toolbar={toolbar} motion={prefs.motion&&prefs.animation!=='none'} wordLift={prefs.animation==='flow'}/></div>
}
