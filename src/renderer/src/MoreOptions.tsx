import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ChevronDown} from 'lucide-react'

export function MoreOptions({children,label='More options'}:{children:ReactNode;label?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
 const close=()=>{setOpen(false);trigger.current?.focus()}
 useEffect(()=>{if(!open)return;root.current?.querySelector<HTMLButtonElement>('.more-options-panel button:not(:disabled)')?.focus();const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open])
 return <div className="more-options" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close()}if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...root.current!.querySelectorAll<HTMLButtonElement>('.more-options-panel button:not(:disabled)')],i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false)}}>
  <button ref={trigger} className="secondary more-options-trigger" aria-expanded={open} onClick={()=>setOpen(!open)}>{label}<ChevronDown size={14}/></button>
  {open&&<div className="more-options-panel" aria-label={label} onClick={e=>{if((e.target as HTMLElement).closest('button'))close()}}>{children}</div>}
 </div>
}
