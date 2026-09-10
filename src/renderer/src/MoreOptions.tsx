import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ChevronDown} from 'lucide-react'

export function MoreOptions({children,label='More options'}:{children:ReactNode;label?:string}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null)
 const close=(focus=true)=>{panel.current?.hidePopover();setOpen(false);if(focus)trigger.current?.focus()}
 useEffect(()=>{
  if(!open||!panel.current)return
  const menu=panel.current;menu.showPopover()
  const position=()=>{const anchor=trigger.current!.getBoundingClientRect();const height=menu.getBoundingClientRect().height;menu.style.left=`${Math.max(12,Math.min(anchor.right-menu.offsetWidth,innerWidth-menu.offsetWidth-12))}px`;menu.style.top=`${anchor.bottom+height+8<innerHeight-12?anchor.bottom+8:Math.max(12,anchor.top-height-8)}px`}
  position();menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close(false)}
  const scroll=(e:Event)=>{if(!menu.contains(e.target as Node))position()}
  document.addEventListener('pointerdown',outside);document.addEventListener('scroll',scroll,true);window.addEventListener('resize',position)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',position)}
 },[open])
 return <div className="more-options" ref={root} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...panel.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length ]?.focus()}}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))close(false)}}>
  <button ref={trigger} className="secondary more-options-trigger" aria-expanded={open} onClick={()=>open?close():setOpen(true)}>{label}<ChevronDown size={14}/></button>
  {open&&<div ref={panel} popover="manual" className="more-options-panel" aria-label={label} onClick={e=>{if((e.target as HTMLElement).closest('button'))close(false)}}>{children}</div>}
 </div>
}
