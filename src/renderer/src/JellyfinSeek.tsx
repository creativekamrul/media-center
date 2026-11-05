import {useEffect,useRef,useState,type PointerEvent} from 'react'
import type {JfState} from '../../shared/jellyfin'
import {duration,message} from './ui'
import {VisualPlayhead} from './visual-playhead'

export function JellyfinSeek({state,error}:{state:JfState;error:(message:string)=>void}){
 const [preview,setPreview]=useState<number|null>(null),[hover,setHover]=useState<number|null>(null)
 const [position,setPosition]=useState(state.position),[remaining,setRemaining]=useState(()=>localStorage.getItem('jf-remaining')==='true')
 const pointer=useRef<number|null>(null),revision=useRef(0),clock=useRef(new VisualPlayhead())
 const enabled=state.duration>0&&['playing','paused'].includes(state.status)&&state.nextIn===undefined
 const advancing=enabled&&state.status==='playing'&&!state.buffering
 useEffect(()=>{clock.current.sample(state.position,1,advancing,performance.now());setPosition(clock.current.at(performance.now()))},[state.position,advancing])
 useEffect(()=>{if(!advancing||preview!==null)return;let frame:number;const tick=()=>{setPosition(clock.current.at(performance.now()));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[advancing,preview])
 useEffect(()=>()=>{revision.current++},[])
 // Native acknowledgement can arrive before slow server progress reporting ends.
 useEffect(()=>{if(pointer.current===null&&preview!==null&&Math.abs(state.position-preview)<.5)setPreview(null)},[state.position,preview])
 useEffect(()=>{if(!enabled){revision.current++;pointer.current=null;setPreview(null);setHover(null)}},[enabled])
 const clamp=(value:number)=>Math.max(0,Math.min(state.duration,value))
 const value=clamp(preview??(advancing?position:state.position))
 const fromPointer=(e:PointerEvent<HTMLInputElement>)=>{const r=e.currentTarget.getBoundingClientRect();return clamp((e.clientX-r.left-7)/Math.max(1,r.width-14)*state.duration)}
 const cancel=()=>{pointer.current=null;revision.current++;setPreview(null)}
 async function commit(time:number){
  if(!enabled)return
  const request=++revision.current;setPreview(time)
  try{await window.mediaCenter.jfCommand({action:'seek',value:time})}
  catch(e){if(request===revision.current)error(message(e))}
  finally{if(request===revision.current)setPreview(null)}
 }
 return <div className="jf-seek" data-seeking={preview!==null}><span>{duration(value)}</span><div className="jf-seek-track"><input type="range" aria-label="Seek Jellyfin" aria-valuetext={`${duration(value)} of ${duration(state.duration)}`} min={0} max={state.duration||1} step="any" disabled={!enabled} value={value} style={{'--progress':`${100*value/(state.duration||1)}%`,touchAction:'none'} as React.CSSProperties}
  onPointerDown={e=>{if(!enabled||e.button!==0)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);pointer.current=e.pointerId;revision.current++;setPreview(fromPointer(e))}}
  onPointerMove={e=>{if(enabled)setHover(fromPointer(e));if(pointer.current===e.pointerId)setPreview(fromPointer(e))}}
  onPointerUp={e=>{if(pointer.current!==e.pointerId)return;e.preventDefault();pointer.current=null;e.currentTarget.releasePointerCapture(e.pointerId);void commit(fromPointer(e))}}
  onPointerCancel={cancel} onLostPointerCapture={()=>{if(pointer.current!==null)cancel()}} onPointerLeave={()=>setHover(null)}
  onKeyDown={e=>{if(!enabled)return;const delta={ArrowLeft:-5,ArrowDown:-5,ArrowRight:5,ArrowUp:5,PageDown:-30,PageUp:30}[e.key];if(delta===undefined&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();void commit(e.key==='Home'?0:e.key==='End'?state.duration:clamp((preview??state.position)+(delta??0)))}}
  onChange={e=>{if(pointer.current===null)void commit(Number(e.currentTarget.value))}}/>
  {state.duration>0&&<div className="jf-chapter-markers" aria-hidden="true">{state.chapters.filter(c=>c.time>0&&c.time<state.duration).map((c,i)=><i key={i} style={{left:`${c.time/state.duration*100}%`}}/>)}</div>}
  {enabled&&(preview??hover)!==null&&<div className="seek-preview" style={{left:`${Math.min(94,Math.max(6,(preview??hover??0)/state.duration*100))}%`}}>{duration(preview??hover??0)}<small>{[...state.chapters].reverse().find(c=>c.time<=(preview??hover??0))?.title}</small></div>}
 </div><button className="jf-time-mode" title="Switch total / remaining time" aria-label={remaining?'Show total duration':'Show remaining time'} onClick={()=>setRemaining(v=>{localStorage.setItem('jf-remaining',String(!v));return !v})}>{remaining?'-'+duration(Math.max(0,state.duration-value)):duration(state.duration)}</button></div>
}
