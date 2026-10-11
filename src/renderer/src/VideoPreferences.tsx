import type {JfCommand,JfState} from '../../shared/jellyfin'
import {useEffect,useRef} from 'react'
export function VideoPreferences({state,command}:{state:JfState;command:(c:JfCommand)=>void}){
 const p=state.preferences
 return <details className="video-preferences"><summary>Video preferences</summary><label>Preferred audio<select value={p.audioLanguage} onChange={e=>command({action:'preferences',value:{...p,audioLanguage:e.target.value}})}>{languages.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Preferred subtitles<select value={p.subtitleLanguage} onChange={e=>command({action:'preferences',value:{...p,subtitleLanguage:e.target.value}})}>{languages.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Subtitles on new videos<select value={p.subtitles} onChange={e=>command({action:'preferences',value:{...p,subtitles:e.target.value as 'auto'|'off'}})}><option value="auto">Automatic</option><option value="off">Off</option></select></label><small>Language and automatic track choices apply to the next video. Use the track selectors to change this video.</small><label>Subtitle size<select aria-label="Subtitle size" value={p.subtitleScale} onChange={e=>command({action:'preferences',value:{...p,subtitleScale:Number(e.target.value)}})}>{[.75,1,1.25,1.5,2].map(v=><option key={v} value={v}>{v*100}%</option>)}</select></label><label><input type="checkbox" checked={p.subtitleBackground} onChange={e=>command({action:'preferences',value:{...p,subtitleBackground:e.target.checked}})}/>Text subtitle background</label><small>Embedded image subtitles keep their original appearance.</small><label>Before playing the next video<select aria-label="Next video countdown" value={p.nextDelay} onChange={e=>command({action:'preferences',value:{...p,nextDelay:Number(e.target.value) as 0|5|10}})}><option value={0}>Play immediately</option><option value={5}>5 second countdown</option><option value={10}>10 second countdown</option></select></label><label><input type="checkbox" checked={p.hideControls} onChange={e=>command({action:'preferences',value:{...p,hideControls:e.target.checked}})}/>Hide fullscreen controls when idle</label><small>Space: pause · ← / →: seek 5 seconds · F: fullscreen · Esc: leave video</small></details>
}
const languages=[['','Media default'],['en','English'],['bn','Bengali'],['hi','Hindi'],['ja','Japanese'],['ko','Korean'],['zh','Chinese'],['fr','French'],['de','German'],['es','Spanish'],['pt','Portuguese'],['ar','Arabic'],['ru','Russian'],['it','Italian']]
export function JellyfinQueue({state,command}:{state:JfState;command:(c:JfCommand)=>void}){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{ref.current?.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest'})},[state.index])
 return <details onToggle={e=>{if(e.currentTarget.open)ref.current?.querySelector('[aria-current=true]')?.scrollIntoView({block:'nearest'})}}><summary>Queue · {state.index+1} of {state.queue.length}</summary><div className="jf-queue-list" ref={ref}>{state.queue.map((item,index)=><button key={`${item.serverId}:${item.id}:${index}`} aria-current={index===state.index} disabled={state.status==='loading'} onClick={()=>command({action:'queueIndex',value:index})}>{index+1}. {item.title}</button>)}</div></details>
}
export function useVideoChrome(state:JfState){
 useEffect(()=>{
  const root=document.documentElement
  const set=(hidden:boolean)=>{if(root.dataset.videoChromeHidden!==String(hidden)){root.dataset.videoChromeHidden=String(hidden);window.dispatchEvent(new Event('video-chrome-change'))}}
  if(!state.fullscreen||state.status!=='playing'||!state.preferences.hideControls||state.error||state.syncError){set(false);return}
  let last=Date.now(),live=true,pending=false
  const reveal=()=>{last=Date.now();set(false)}
  let pointerPosition='';const pointer=(e:PointerEvent)=>{const position=e.screenX+':'+e.screenY;if(pointerPosition!==position){pointerPosition=position;reveal()}}
  const tick=async()=>{if(pending)return;pending=true;try{const moved=await window.mediaCenter.jfPointerActive();if(!live)return;if(moved||document.querySelector('.jf-options-menu,.jf-dock :focus-visible,.jf-video-stage :focus-visible'))reveal();else set(Date.now()-last>3200)}catch{if(live)reveal()}finally{pending=false}}
  const timer=setInterval(()=>void tick(),250)
  window.addEventListener('keydown',reveal,true);window.addEventListener('pointermove',pointer);window.addEventListener('focus',reveal)
  return()=>{live=false;clearInterval(timer);window.removeEventListener('keydown',reveal,true);window.removeEventListener('pointermove',pointer);window.removeEventListener('focus',reveal);set(false)}
 },[state.fullscreen,state.status,state.preferences.hideControls,state.error,state.syncError])
}
