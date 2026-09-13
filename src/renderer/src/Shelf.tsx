import {useEffect,useRef,useState,type ReactNode} from 'react'
import {ArrowLeft,ArrowRight} from 'lucide-react'
export function ShelfControls({start,end,previousLabel,nextLabel,onPrevious,onNext,children}:{start:boolean;end:boolean;previousLabel:string;nextLabel:string;onPrevious:()=>void;onNext:()=>void;children?:ReactNode}){
 return <div className="shelf-buttons">{children}<button className="icon-button" aria-label={previousLabel} disabled={start} onClick={onPrevious}><ArrowLeft size={18}/></button><button className="icon-button" aria-label={nextLabel} disabled={end} onClick={onNext}><ArrowRight size={18}/></button></div>
}
export function Shelf({title,subtitle,children,empty,action}:{title:string;subtitle:string;children:ReactNode[];empty:string;action?:ReactNode}){
 const scroll=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({start:true,end:true})
 useEffect(()=>{const el=scroll.current;if(!el)return;const update=()=>setEdges({start:el.scrollLeft<=2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});const observer=new ResizeObserver(update);observer.observe(el);el.addEventListener('scroll',update,{passive:true});update();return()=>{observer.disconnect();el.removeEventListener('scroll',update)}},[children.length])
 const move=(direction:number)=>scroll.current?.scrollBy({left:direction*scroll.current.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
 return <section className="home-shelf"><header><div><h2>{title}</h2><p>{subtitle}</p></div><ShelfControls start={edges.start} end={edges.end} previousLabel={`Previous ${title}`} nextLabel={`Next ${title}`} onPrevious={()=>move(-1)} onNext={()=>move(1)}>{action}</ShelfControls></header>{children.length?<div className="home-shelf-track" ref={scroll} aria-label={title} tabIndex={0}>{children}</div>:<p className="home-empty">{empty}</p>}</section>
}
