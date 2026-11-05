import {useSyncExternalStore} from 'react'
import type {PlaybackState} from '../../shared/types'
import {api} from './actions'

// Position ticks must not rerender every row in the library.
let current={serverId:'',trackId:''}
const listeners=new Set<()=>void>()
function update(state:PlaybackState){
 const target=state.queue[state.queueIndex]?.target
 const next=target?.kind==='music-track'&&state.status!=='idle'?{serverId:target.serverId,trackId:target.trackId}:{serverId:'',trackId:''}
 if(next.serverId===current.serverId&&next.trackId===current.trackId)return
 current=next;listeners.forEach(listener=>listener())
}
let received=false
api.onPlayback(state=>{received=true;update(state)})
void api.playback().then(state=>{if(!received)update(state)}).catch(()=>{})
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
export function useCurrentTrack(){return useSyncExternalStore(subscribe,()=>current)}
