import type {PlayingScreenPreferences} from '../../shared/playing-screen'
import type {QueueItem} from '../../shared/types'
import {QueueArt} from './Artwork'
import {useEffect,useRef,type CSSProperties} from 'react'

export function PlayingBackdrop({background,item}:{background:PlayingScreenPreferences['background'];item?:QueueItem}) {
 const canvas=useRef<HTMLDivElement>(null)
 useEffect(()=>{const el=canvas.current;if(!el)return;const observer=new ResizeObserver(([entry])=>{el.style.setProperty('--canvas-scale',String(Math.max(1,entry.contentRect.width/1440)));el.style.setProperty('--fall-height',`${entry.contentRect.height+80}px`)});observer.observe(el);return()=>observer.disconnect()},[])
 return <div ref={canvas} className="immersive-atmosphere" aria-hidden="true">{background==='artwork'?<QueueArt key={JSON.stringify(item?.target)} item={item}/>:<div className="ambient-glow"/>}{background==='stars'&&<div className="star-field"/>}{(background==='snow'||background==='rain')&&<div className={`weather-field weather-${background}`}>{Array.from({length:64},(_,i)=><i key={i} style={{'--particle-x':`${(i*61.803398875)%100}%`,'--particle-y':`${(i*37.41)%100}%`,'--particle-size':`${1+i%3}px`,'--particle-duration':`${background==='rain'?1.4+(i%7)*.15:16+(i%11)*1.5}s`,'--particle-delay':`${-i*.79}s`} as CSSProperties}/>)}</div>}</div>
}
