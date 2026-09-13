import {useEffect,useRef} from 'react'
import {MoreOptions} from './MoreOptions'
import {TabIcon} from './LibraryHeader'

/** Keep the current view visible even when it was chosen from the overflow. */
export function BrowseTabs<T extends string>({options,value,onChange,label,primary,tabRoles=true,overflowLabel='More views'}:{options:readonly (readonly [T,string])[];value:T;onChange:(id:T)=>void;label:string;primary?:readonly T[];tabRoles?:boolean;overflowLabel?:string}){
  const root=useRef<HTMLDivElement>(null),promoted=useRef(false)
  useEffect(()=>{
    if(promoted.current){root.current?.querySelector<HTMLButtonElement>(':scope > button[aria-selected=true], :scope > button[aria-pressed=true]')?.focus();promoted.current=false}
  },[value])
  const first=primary?primary.flatMap(key=>options.filter(([id])=>id===key)):options.slice(0,4)
  const active=options.find(([id])=>id===value)
  const visible=active&&!first.some(([id])=>id===value)?[...first.slice(0,3),active]:first
  const remaining=options.filter(([id])=>!visible.some(([key])=>key===id))
  const button=([id,name]:readonly [T,string])=><button type="button" key={id} role={tabRoles?'tab':undefined} aria-selected={tabRoles?value===id:undefined} aria-pressed={tabRoles?undefined:value===id} className={`filter ${value===id?'active':''}`} onClick={()=>{promoted.current=remaining.some(([key])=>key===id);onChange(id)}}><TabIcon id={id}/>{name}</button>
  return <div ref={root} className="browse-tabs concise-tabs" role={tabRoles?'tablist':'group'} aria-label={label}>
    {visible.map(button)}
    {remaining.length>0&&<MoreOptions label={overflowLabel}>{remaining.map(button)}</MoreOptions>}
  </div>
}
