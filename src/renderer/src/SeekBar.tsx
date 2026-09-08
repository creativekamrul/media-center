import {useEffect,useRef,useState,type CSSProperties,type PointerEvent} from 'react'
import type {PlaybackState} from '../../shared/types'
import {progressKey} from '../../shared/timeline'
import {api} from './actions'
import {duration,message} from './ui'

export function SeekBar({player,error,compact=false}:{player:PlaybackState;error:(s:string)=>void;compact?:boolean}){
 const item=player.queue[player.queueIndex]
 const identity=`${item?progressKey(item.target):''}:${player.queueIndex}`
 // Replacing the control discards drag/preview state before painting a different track.
 return <TrackSeek key={identity} player={player} error={error} compact={compact}/>
}
function TrackSeek({player,error,compact}:{player:PlaybackState;error:(s:string)=>void;compact:boolean}){
 const [preview,setPreview]=useState<number|null>(null)
 const dragging=useRef<number|null>(null),revision=useRef(0),alive=useRef(true)
 const enabled=['playing','paused'].includes(player.status)&&player.duration>0&&player.kind!=='radio'
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;revision.current++}},[])
 useEffect(()=>{if(!enabled){dragging.current=null;revision.current++;setPreview(null)}},[enabled])
 const clamp=(time:number)=>Math.min(player.duration,Math.max(0,time))
 const fromPointer=(e:PointerEvent<HTMLInputElement>)=>{const rect=e.currentTarget.getBoundingClientRect();return clamp((e.clientX-rect.left-7)/Math.max(1,rect.width-14)*player.duration)}
 async function commit(time:number){
  const item=player.queue[player.queueIndex];if(!enabled||!item)return
  const request=++revision.current;setPreview(time)
  try{await api.seekPlayback({key:progressKey(item.target),queueIndex:player.queueIndex,time})}
  catch(e){if(alive.current&&request===revision.current)error(message(e))}
  finally{if(alive.current&&request===revision.current)setPreview(null)}
 }
 const value=clamp(preview??player.position)
 return <div className={compact?'seek-row mini-seek-row':'seek-row'}>
  {!compact&&<span>{duration(value)}</span>}
  <div className="seek-track"><div className="chapter-ticks" aria-hidden="true">{player.duration>0&&player.chapters.filter(c=>c.start>0&&c.start<player.duration).map(c=><i key={c.id} title={c.title} style={{left:`${c.start/player.duration*100}%`}}/>)}</div><input aria-label="Playback position" aria-valuetext={`${duration(value)} of ${duration(player.duration)}`} type="range" min={0} max={player.duration||1} step={.1} disabled={!enabled} value={value}
   style={{'--progress':`${value/(player.duration||1)*100}%`,touchAction:'none'} as CSSProperties}
   onPointerDown={e=>{if(!enabled||e.button!==0)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);dragging.current=e.pointerId;revision.current++;setPreview(fromPointer(e))}}
   onPointerMove={e=>{if(dragging.current===e.pointerId)setPreview(fromPointer(e))}}
   onPointerUp={e=>{if(dragging.current!==e.pointerId)return;e.preventDefault();dragging.current=null;e.currentTarget.releasePointerCapture(e.pointerId);void commit(fromPointer(e))}}
   onPointerCancel={()=>{dragging.current=null;setPreview(null)}}
   onLostPointerCapture={()=>{if(dragging.current!==null){dragging.current=null;setPreview(null)}}}
   onChange={e=>{if(dragging.current===null)void commit(Number(e.currentTarget.value))}}
  /></div>
  {!compact&&<span>{duration(player.duration)}</span>}
 </div>
}
