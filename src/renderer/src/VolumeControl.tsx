import {useEffect,useRef,useState,type CSSProperties} from 'react'
import {Volume2} from 'lucide-react'
import {api} from './actions'
import {message} from './ui'

export function VolumeControl({volume,error}:{volume:number;error:(s:string)=>void}){
 const root=useRef<HTMLDivElement>(null),desired=useRef(volume),sending=useRef(false),actual=useRef(volume),alive=useRef(true)
 const [value,setValue]=useState(volume)
 actual.current=volume
 useEffect(()=>{if(!sending.current){desired.current=volume;setValue(volume)}},[volume])
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 async function change(next:number){
  desired.current=Math.max(0,Math.min(100,Math.round(next)));setValue(desired.current)
  if(sending.current)return
  sending.current=true
  try{let sent:number;do{sent=desired.current;await api.command({action:'volume',value:sent})}while(alive.current&&sent!==desired.current)}
  catch(e){desired.current=actual.current;if(alive.current){setValue(actual.current);error(message(e))}}
  finally{sending.current=false}
 }
 const changeRef=useRef(change);changeRef.current=change
 useEffect(()=>{
  const el=root.current!;let accumulated=0
  const wheel=(event:WheelEvent)=>{
   if(event.ctrlKey||!event.deltaY)return
   event.preventDefault();event.stopPropagation()
   const delta=event.deltaY*(event.deltaMode===1?100/3:event.deltaMode===2?100:1)
   if(Math.sign(delta)!==Math.sign(accumulated))accumulated=0
   accumulated+=delta
   const steps=Math.trunc(accumulated/100)
   if(steps){accumulated-=steps*100;void changeRef.current(desired.current-steps*5)}
  }
  const leave=()=>{accumulated=0}
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('pointerleave',leave)
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('pointerleave',leave)}
 },[])
 return <div ref={root} className="volume-control" title="Scroll to adjust volume"><Volume2 size={18}/><input className="volume" aria-label="Volume" aria-valuetext={`${value}%`} style={{'--volume-level':`${value}%`} as CSSProperties} type="range" min={0} max={100} value={value} onChange={e=>void change(Number(e.target.value))}/><output className="volume-value" aria-hidden="true">{value}%</output></div>
}
