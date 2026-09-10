import {useEffect,useRef,useState} from 'react'
import {ArrowRight,Search,X} from 'lucide-react'

const aliases:Record<string,string>={updates:'version update release changelog new',servers:'server connection navidrome audiobookshelf password login',playback:'audio sound mpv output headphones device equalizer eq replaygain volume speed crossfade profiles',appearance:'theme colors colours fonts typography lyrics glass transparency translucent density css',listening:'downloads storage quota goal rewind gapless shortcuts keys podcast backup restore reset data',sharing:'discord presence lastfm artwork privacy'}
export function jumpToSetting(element:HTMLElement){
  for(let parent=element.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true
  element.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})
  const focus=element.matches('input,select,button,textarea')?element:element.querySelector<HTMLElement>('input,select,button,textarea')??element
  if(!focus.matches('input,select,button,textarea'))focus.tabIndex=-1
  focus.focus({preventScroll:true});element.classList.remove('setting-found');void element.offsetWidth;element.classList.add('setting-found')
  setTimeout(()=>element.classList.remove('setting-found'),2500)
}
export function SettingsSearch(){
  const [query,setQuery]=useState(''),[entries,setEntries]=useState<{label:string;section:string;element:HTMLElement;terms:string}[]>([])
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const root=document.querySelector('.settings-groups');if(!root)return
    const index=()=>{
      const next:typeof entries=[]
      for(const group of root.querySelectorAll<HTMLElement>('.settings-group')){
        const section=group.getAttribute('aria-label')??'',alias=aliases[section.toLowerCase()]??''
        for(const element of group.querySelectorAll<HTMLElement>('.settings-panel h2,label.field,label.check-field,.setting-toggle')){
          // Index labels, never typed values, server addresses, keys or paths.
          const clone=element.cloneNode(true) as HTMLElement
          clone.querySelectorAll('input,select,textarea,small,.path-box').forEach(el=>el.remove())
          const label=clone.textContent?.replace(/\s+/g,' ').trim()??''
          if(!label||label.length>160)continue
          next.push({label,section,element:element.tagName==='H2'?element.closest<HTMLElement>('.settings-panel')!:element,terms:`${label} ${section} ${alias}`.toLowerCase()})
        }
      }
      setEntries(next)
    }
    index();const observer=new MutationObserver(index);observer.observe(root,{childList:true,subtree:true,characterData:true});return()=>observer.disconnect()
  },[])
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const results=terms.length?entries.filter(e=>terms.every(t=>e.terms.includes(t))).sort((a,b)=>Number(terms.every(t=>b.label.toLowerCase().includes(t)))-Number(terms.every(t=>a.label.toLowerCase().includes(t)))).slice(0,10):[]
  const choose=(entry:typeof entries[number])=>{setQuery('');jumpToSetting(entry.element)}
  return <div className="settings-search" ref={ref} onKeyDown={e=>{if(e.key==='Escape'){setQuery('');ref.current?.querySelector('input')?.focus()}if(e.key==='ArrowDown'&&(e.target as HTMLElement).tagName==='INPUT'){e.preventDefault();ref.current?.querySelector<HTMLButtonElement>('.settings-search-results button')?.focus()}if(e.key==='Enter'&&(e.target as HTMLElement).tagName==='INPUT'&&results[0]){e.preventDefault();choose(results[0])}}}>
    <label className="search"><Search size={18}/><input aria-label="Search settings" placeholder="Search settings — audio, lyrics, downloads…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" className="icon-button" aria-label="Clear settings search" onClick={()=>setQuery('')}><X size={16}/></button>}</label>
    {!!terms.length&&<div className="settings-search-results"><p role="status">{results.length?`${results.length} matching settings`:'No matching settings. Try audio, theme, downloads or Discord.'}</p>{results.map((r,i)=><button type="button" key={i} onClick={()=>choose(r)}><span><strong>{r.label}</strong><small>{r.section}</small></span><ArrowRight size={17}/></button>)}</div>}
  </div>
}
