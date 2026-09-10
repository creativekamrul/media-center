import {useState,useRef,useEffect,useId} from 'react'
import {MoreHorizontal,Play} from 'lucide-react'
import type {QueueItem} from '../../shared/types'
import {api,ListenActions} from './actions'
import {message} from './ui'
export function CardActions({item,error}:{item:QueueItem;error:(s:string)=>void}){
 const [busy,setBusy]=useState(false),menu=useRef<HTMLDivElement>(null),anchor=useRef<HTMLButtonElement>(null),id=useId()
 useEffect(()=>{const close=()=>menu.current?.hidePopover();const wheel=(e:WheelEvent)=>{if(!menu.current?.contains(e.target as Node))close()};window.addEventListener('resize',close);window.addEventListener('wheel',wheel,{passive:true});return()=>{window.removeEventListener('resize',close);window.removeEventListener('wheel',wheel)}},[])
 const position=()=>{const el=menu.current,r=anchor.current?.getBoundingClientRect();if(!el||!r)return;el.style.left=`${Math.max(8,Math.min(innerWidth-208,r.right-200))}px`;el.style.top=`${Math.max(8,Math.min(innerHeight-el.offsetHeight-8,r.bottom+6))}px`}
 return <><button className="icon-button card-play" aria-label={`Play ${item.title}`} title={`Play ${item.title}`} disabled={busy} onClick={async()=>{setBusy(true);try{await api.play({queue:[item],index:0})}catch(e){error(message(e))}finally{setBusy(false)}}}><Play size={19}/></button>
 <button ref={anchor} className="icon-button card-more" aria-label={`More actions for ${item.title}`} popoverTarget={id}><MoreHorizontal size={18}/></button>
 <div id={id} ref={menu} popover="auto" className="card-action-popover" onToggle={position}><ListenActions items={[item]} error={error} hidePlay inMenu/></div></>
}
