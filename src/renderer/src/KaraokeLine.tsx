import {Fragment,memo,useEffect,useMemo,useRef} from 'react'
import {lyricFill,type LyricLine} from '../../shared/lyrics'
import type {PlaybackState} from '../../shared/types'
import {lyricVisualWords} from './lyricVisualWords'

/** Animate only the active line, updating paint variables instead of React state. */
export const KaraokeLine = memo(function KaraokeLine({line,end,active,player,motion,wordLift=false}:{line:LyricLine;end:number;active:boolean;player:PlaybackState;motion:boolean;wordLift?:boolean}){
  const root=useRef<HTMLSpanElement>(null)
  const visualWords=useMemo(()=>lyricVisualWords(line,end,wordLift),[line,end,wordLift])
  const clock=useRef({position:player.position,at:performance.now(),speed:player.speed,status:player.status,buffering:player.buffering})
  useEffect(()=>{clock.current={position:player.position,at:performance.now(),speed:player.speed,status:player.status,buffering:player.buffering}},[player.position,player.speed,player.status,player.buffering])
  useEffect(()=>{
    if(!active||!root.current)return
    const reduced=matchMedia('(prefers-reduced-motion: reduce)'),words=[...root.current.querySelectorAll<HTMLElement>('[data-karaoke]')]
    let frame=0
    function paint(){
      const c=clock.current,running=c.status==='playing'&&!c.buffering
      // Bound extrapolation when a stalled/disconnected engine stops sending positions.
      const elapsed=running&&motion&&!reduced.matches?Math.min(.5,(performance.now()-c.at)/1000)*c.speed:0
      const position=c.position+elapsed
      words.forEach((node,i)=>{const word=visualWords?.[i],start=word?.time??line.time,finish=word?.end??end;node.style.setProperty('--lyric-fill',`${lyricFill(position,start,finish)}%`);const state=position<start?'upcoming':position>=finish?'past':'active';if(node.dataset.wordState!==state)node.dataset.wordState=state})
      if(running&&motion&&!reduced.matches)frame=requestAnimationFrame(paint)
    }
    const repaint=()=>{cancelAnimationFrame(frame);paint()}
    reduced.addEventListener('change',repaint);paint()
    return()=>{cancelAnimationFrame(frame);reduced.removeEventListener('change',repaint)}
  },[active,line,visualWords,end,motion,player.position,player.status,player.speed,player.buffering])
  return <span ref={root} className={`karaoke${active?' active':''}${wordLift?' word-lift':''}`} data-timing={line.words?.length?'word':visualWords?'estimated':'line'}>{visualWords?visualWords.map((word,i)=>{
    // Keep spaces outside the moving boxes so wrapping is identical before/after activation.
    const [,before,text,after]=word.text.match(/^(\s*)([\s\S]*?)(\s*)$/u)!
    return <Fragment key={i}>{before}<span data-karaoke>{text}</span>{after}</Fragment>
  }):<span data-karaoke>{line.text||'♪'}</span>}</span>
}, (before,after)=>before.line===after.line&&before.end===after.end&&before.active===after.active&&before.motion===after.motion&&before.wordLift===after.wordLift&&(!after.active||(before.player.position===after.player.position&&before.player.speed===after.player.speed&&before.player.status===after.player.status&&before.player.buffering===after.player.buffering)))
