import { watchAppearance } from './appearance'
import {SeekBar} from './SeekBar'
import { useEffect, useState } from 'react'
import { AudioLines, Expand, Pin, PinOff, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { emptyPlayback, type PlayerCommand } from '../../shared/types'
import { api } from './actions'
import { QueueArt } from './ListeningSpace'
import { message } from './ui'
export function MiniPlayer() {
  const [player,setPlayer]=useState(emptyPlayback),[pinned,setPinned]=useState(false),[pinBusy,setPinBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{void api.playback().then(setPlayer).catch(e=>setError(message(e)));void api.miniState().then(s=>setPinned(s.pinned)).catch(e=>setError(message(e)));const playback=api.onPlayback(setPlayer),pin=api.onMiniState(s=>setPinned(s.pinned)),theme=watchAppearance(e=>setError(message(e)));return()=>{playback();pin();theme()}},[])
  const togglePin=async()=>{setPinBusy(true);setError('');try{setPinned((await api.miniPlayer({action:'pin',pinned:!pinned})).pinned)}catch(e){setError(message(e))}finally{setPinBusy(false)}}
  const command=(c:PlayerCommand)=>void api.command(c).catch(e=>setError(message(e)))
  const item=player.queue[player.queueIndex]
  const media=player.kind==='audiobook'?'Audiobook':player.kind==='podcast-episode'?'Podcast':player.kind==='radio'?'Radio':'Music'
  const status=player.status==='loading'?'Loading':player.buffering?'Buffering':player.status==='playing'?'Playing':player.status==='paused'?'Paused':'Ready'
  return <section className="mini-player" aria-label="Mini player">
    <header className="mini-drag">
      <span className="mini-brand" role="img" aria-label="Media Center"><AudioLines size={18}/></span>
      <div className="row-tools">
        <button className="icon-button" aria-label={pinned?'Unpin mini player':'Keep mini player on top'} aria-pressed={pinned} disabled={pinBusy} title={pinned?'Pinned above other windows':'Keep mini player above other windows'} onClick={()=>void togglePin()}>{pinned?<Pin size={15}/>:<PinOff size={15}/>}</button>
        <button className="icon-button" aria-label="Open main window" title="Open main window" onClick={()=>void api.miniPlayer({action:'main'}).catch(e=>setError(message(e)))}><Expand size={15}/></button>
        <button className="icon-button mini-close" aria-label="Close mini player" title="Close mini player" onClick={()=>void api.miniPlayer({action:'close'}).catch(e=>setError(message(e)))}><X size={15}/></button>
      </div>
    </header>
    <div className="mini-body">
      <QueueArt item={item}/>
      <div className="mini-copy"><span className="mini-kicker">{item?`${media} · ${status}`:'YOUR LISTENING SPACE'}</span><strong title={player.title}>{item?player.title:'Something worth listening to'}</strong><small title={player.subtitle}>{item?player.subtitle:'Choose a track in your library'}</small></div>
    </div>
    <div className="mini-controls transport-buttons" role="group" aria-label="Playback controls">
      <button className="icon-button" aria-label="Previous" title="Previous" disabled={!player.queue.length} onClick={()=>command({action:'previous'})}><SkipBack size={18}/></button>
      <button className="main-play" aria-label={player.status==='playing'?'Pause':'Play'} title={player.status==='playing'?'Pause':'Play'} disabled={!player.queue.length||player.status==='loading'} onClick={()=>command({action:'toggle'})}>{player.status==='playing'?<Pause size={22}/>:<Play size={22}/>}</button>
      <button className="icon-button" aria-label="Next" title="Next" disabled={!player.queue.length} onClick={()=>command({action:'next'})}><SkipForward size={18}/></button>
    </div>
    <SeekBar player={player} error={setError}/>
    {(error||player.error)&&<p className="mini-error" role="alert" title={error||player.error}>{error||player.error}</p>}
  </section>
}
