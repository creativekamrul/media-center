import { watchAppearance } from './appearance'
import {SeekBar} from './SeekBar'
import { useEffect, useState } from 'react'
import { Expand, Pin, PinOff, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { emptyPlayback, type PlayerCommand } from '../../shared/types'
import { api } from './actions'
import { QueueArt } from './ListeningSpace'
import { duration, message } from './ui'
export function MiniPlayer() {
  const [player,setPlayer]=useState(emptyPlayback),[pinned,setPinned]=useState(false),[pinBusy,setPinBusy]=useState(false),[error,setError]=useState('')
  useEffect(()=>{void api.playback().then(setPlayer).catch(e=>setError(message(e)));void api.miniState().then(s=>setPinned(s.pinned)).catch(e=>setError(message(e)));const playback=api.onPlayback(setPlayer),pin=api.onMiniState(s=>setPinned(s.pinned)),theme=watchAppearance(e=>setError(message(e)));return()=>{playback();pin();theme()}},[])
  const togglePin=async()=>{setPinBusy(true);setError('');try{setPinned((await api.miniPlayer({action:'pin',pinned:!pinned})).pinned)}catch(e){setError(message(e))}finally{setPinBusy(false)}}
  const command=(c:PlayerCommand)=>void api.command(c).catch(e=>setError(message(e)))
  return <div className="mini-player"><header className="mini-drag"><span>media<span className="brand-light">center</span></span><div className="row-tools"><button className="icon-button" aria-label={pinned?'Unpin mini player':'Keep mini player on top'} aria-pressed={pinned} disabled={pinBusy} title={pinned?'Pinned above other windows':'Keep mini player above other windows'} onClick={()=>void togglePin()}>{pinned?<Pin size={15}/>:<PinOff size={15}/>}</button><button className="icon-button" aria-label="Open main window" onClick={()=>void api.miniPlayer({action:'main'})}><Expand size={15}/></button><button className="icon-button" aria-label="Close mini player" onClick={()=>void api.miniPlayer({action:'close'})}><X size={15}/></button></div></header><div className="mini-body"><QueueArt item={player.queue[player.queueIndex]}/><div className="mini-copy"><strong>{player.title}</strong><small>{player.subtitle}</small><div className="mini-controls"><button className="icon-button" aria-label="Previous" disabled={!player.queue.length} onClick={()=>command({action:'previous'})}><SkipBack size={18}/></button><button className="play-main" aria-label={player.status==='playing'?'Pause':'Play'} disabled={!player.queue.length} onClick={()=>command({action:'toggle'})}>{player.status==='playing'?<Pause size={20}/>:<Play size={20}/>}</button><button className="icon-button" aria-label="Next" disabled={!player.queue.length} onClick={()=>command({action:'next'})}><SkipForward size={18}/></button><span>{player.status==='loading'?'Loading…':duration(player.position)}</span></div></div></div><SeekBar player={player} error={setError} compact/>{(error||player.error) && <p className="mini-error" role="alert">{error||player.error}</p>}</div>
}
