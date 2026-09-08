import {useEffect,useState} from 'react'
const sections=['Updates','Servers','Playback','Appearance','Listening','Sharing']
export function SettingsRail(){
  const [active,setActive]=useState('updates')
  useEffect(()=>{
    const root=document.querySelector('.workspace'),groups=[...document.querySelectorAll<HTMLElement>('.settings-group')]
    const visible=new Set<Element>()
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target)}
      const top=root?.getBoundingClientRect().top??0
      const nearest=groups.filter(g=>visible.has(g)).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-top)-Math.abs(b.getBoundingClientRect().top-top))[0]
      if(nearest)setActive(nearest.id.replace('settings-',''))
    },{root,rootMargin:'-80px 0px -30% 0px',threshold:[0,.1,.25,.5,.75,1]})
    groups.forEach(g=>observer.observe(g));return()=>observer.disconnect()
  },[])
  return <nav className="settings-rail" aria-label="Settings sections">{sections.map(label=>{const id=label.toLowerCase();return <button className="secondary" key={id} aria-current={active===id?'location':undefined} onClick={()=>{setActive(id);document.getElementById(`settings-${id}`)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}}>{label}</button>})}</nav>
}
