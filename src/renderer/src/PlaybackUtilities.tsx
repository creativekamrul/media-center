import {Grid2X2,ListMusic,Timer} from 'lucide-react'
import type {PlaybackState,PlayerCommand} from '../../shared/types'
import {api} from './actions'
import {IconButton,message} from './ui'
import {VolumeControl} from './VolumeControl'

export function PlaybackUtilities({player,command,error,showQueue}:{player:PlaybackState;command:(c:PlayerCommand)=>void;error:(s:string)=>void;showQueue?:()=>void}){
 const spoken=player.kind==='audiobook'||player.kind==='podcast-episode'
 return <>{spoken&&<select className="speed-select" aria-label="Playback speed" value={player.speed} onChange={e=>command({action:'speed',value:Number(e.target.value)})}>{[.5,.75,1,1.25,1.5,1.75,2,2.5,3].map(s=><option key={s} value={s}>{s}×</option>)}</select>}
 <div className="sleep-control"><Timer size={16}/><select aria-label="Sleep timer" value={player.sleepAt?'active':'0'} onChange={e=>command({action:'sleep',value:Number(e.target.value)})}><option value="0">Off</option>{player.sleepAt&&<option value="active">{Math.max(0,Math.ceil((player.sleepAt-Date.now())/60000))}m</option>}{[15,30,45,60,90].map(n=><option key={n} value={n}>{n} min</option>)}</select></div>
 <VolumeControl volume={player.volume} error={error}/>
 <IconButton label="Open mini player" onClick={()=>void api.miniPlayer({action:'open'}).catch(e=>error(message(e)))}><Grid2X2 size={18}/></IconButton>
 {showQueue&&<IconButton label="Open play queue" onClick={showQueue}><ListMusic size={19}/></IconButton>}</>
}
