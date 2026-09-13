import {ShelfControls} from './Shelf'
import {useEffect,useRef,useState} from 'react'
import {ArrowDown,ArrowUp,Settings2} from 'lucide-react'
import {TabIcon} from './LibraryHeader'
import {api,Modal} from './actions'
import {useExperience} from './Experience'
import {message} from './ui'
import {defaultViewPins,type ViewPinScope} from '../../shared/view-pins'

export function BrowseTabs<T extends string>({options,value,onChange,label,scope,tabRoles=true}:{options:readonly (readonly [T,string])[];value:T;onChange:(id:T)=>void;label:string;scope:ViewPinScope;tabRoles?:boolean}){
 const [prefs]=useExperience(),[editing,setEditing]=useState(false),[draft,setDraft]=useState<string[]>([]),[busy,setBusy]=useState(false),[failure,setFailure]=useState('')
 const list=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
 const defaults=defaultViewPins[scope].filter(id=>options.some(([key])=>key===id))
 const saved=prefs.navigation.viewPins[scope]??defaults
 const pins=saved.filter(id=>options.some(([key])=>key===id))
 const restored=useRef(false)
 useEffect(()=>{
  if(restored.current||!prefs.navigation.viewPins[scope])return
  restored.current=true
  // Reopening a section starts at its first pin when its usual landing tab was unpinned.
  if(value===({music:'albums',local:'albums',tools:'mixes'} as const)[scope]&&!pins.includes(value)){
   const first=options.find(([id])=>id===pins[0]);if(first)onChange(first[0])
  }
 },[prefs.navigation.viewPins,scope,value])
 const active=options.find(([id])=>id===value)
 // Deep links can open an unpinned view without silently changing saved pins.
 const visible=[...pins.flatMap(id=>options.filter(([key])=>key===id)),...(active&&!pins.includes(value)?[active]:[])]
 useEffect(()=>{list.current?.querySelector('.active')?.scrollIntoView({block:'nearest',inline:'nearest'})},[value,JSON.stringify(pins)])
 const [edges,setEdges]=useState({start:true,end:true,overflow:false})
 useEffect(()=>{
  const el=list.current;if(!el)return
  const update=()=>setEdges({start:el.scrollLeft<=2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2,overflow:el.scrollWidth>el.clientWidth+2})
  const observer=new ResizeObserver(update);observer.observe(el);for(const child of el.children)observer.observe(child)
  el.addEventListener('scroll',update,{passive:true});update()
  return()=>{observer.disconnect();el.removeEventListener('scroll',update)}
 },[JSON.stringify(visible)])
 const slide=(direction:number)=>list.current?.scrollBy({left:direction*list.current.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
 const close=()=>{if(!busy)setEditing(false)}
 async function save(){
  setBusy(true);setFailure('')
  try{
   await api.saveNavigation({action:'view-pins',viewPins:{[scope]:draft}})
   if(!draft.includes(value)){const first=options.find(([id])=>id===draft[0]);if(first)onChange(first[0])}
   setEditing(false);trigger.current?.focus()
  }catch(e){setFailure(message(e))}finally{setBusy(false)}
 }
 function move(id:string,step:number){setDraft(current=>{const next=[...current],index=next.indexOf(id),to=index+step;if(index<0||to<0||to>=next.length)return current;[next[index],next[to]]=[next[to],next[index]];return next})}
 const ordered=[...draft.flatMap(id=>options.filter(([key])=>key===id)),...options.filter(([id])=>!draft.includes(id))]
 return <>
  <div className="browse-tabs concise-tabs" data-view-scope={scope}>
   <div ref={list} className="pinned-tab-list" role={tabRoles?'tablist':'group'} aria-label={label} onKeyDown={e=>{
     if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return
     const buttons=[...list.current!.querySelectorAll<HTMLButtonElement>('button')],index=buttons.indexOf(document.activeElement as HTMLButtonElement)
     if(index<0)return;e.preventDefault()
     const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length
     buttons[next].focus();onChange(visible[next][0])
    }}>
    {visible.map(([id,name])=><button type="button" key={id} role={tabRoles?'tab':undefined} tabIndex={tabRoles?(value===id?0:-1):undefined} aria-selected={tabRoles?value===id:undefined} aria-pressed={tabRoles?undefined:value===id} className={`filter ${value===id?'active':''}`} onClick={()=>onChange(id)}><TabIcon id={id}/>{name}</button>)}
   </div>
   {edges.overflow&&<div className="view-scroll-controls"><ShelfControls start={edges.start} end={edges.end} previousLabel="Previous pinned views" nextLabel="Next pinned views" onPrevious={()=>slide(-1)} onNext={()=>slide(1)}/></div>}
   <button ref={trigger} type="button" className="view-customize" aria-label={scope==='tools'?'Customize tools':'Customize views'} aria-haspopup="dialog" aria-expanded={editing} title="Choose and reorder pinned tabs" onClick={()=>{setDraft([...pins]);setFailure('');setEditing(true)}}><Settings2 size={16}/><span>Customize</span></button>
  </div>
  {editing&&<Modal title={scope==='tools'?'Customize tools':'Customize views'} close={close}>
   <div className="view-pin-editor">
    <p>Choose what stays in this tab bar. Use the arrows to order your pinned {scope==='tools'?'tools':'views'}.</p>
    <div className="view-pin-list" aria-label="Pinned tab order">{ordered.map(([id,name])=>{
     const index=draft.indexOf(id),checked=index!==-1
     return <div className={`view-pin-row ${checked?'is-pinned':''}`} key={id}>
      <label><input type="checkbox" aria-label={`Pin ${name}`} checked={checked} disabled={busy||(checked&&draft.length===1)} onChange={e=>setDraft(current=>e.target.checked?[...current,id]:current.filter(key=>key!==id))}/><TabIcon id={id}/><span>{name}</span></label>
      {checked&&<div className="view-pin-order"><span aria-label={`Position ${index+1}`}>{index+1}</span><button type="button" className="icon-button" aria-label={`Move ${name} up`} disabled={busy||index===0} onClick={()=>move(id,-1)}><ArrowUp size={15}/></button><button type="button" className="icon-button" aria-label={`Move ${name} down`} disabled={busy||index===draft.length-1} onClick={()=>move(id,1)}><ArrowDown size={15}/></button></div>}
     </div>
    })}</div>
    <p className="view-pin-summary" aria-live="polite">{draft.length} pinned · Keep at least one</p>
    {failure&&<p role="alert">{failure}</p>}
    <div className="view-pin-actions"><button type="button" className="text-button" disabled={busy} onClick={()=>setDraft([...defaults])}>Reset defaults</button><button type="button" className="secondary" disabled={busy} onClick={close}>Cancel</button><button type="button" className="primary" disabled={busy||!draft.length} onClick={()=>void save()}>{busy?'Saving…':'Save tabs'}</button></div>
   </div>
  </Modal>}
 </>
}
