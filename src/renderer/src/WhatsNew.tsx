import {useEffect,useState} from 'react'
import {ArrowRight,Palette,Search,Sparkles,ChartNoAxesCombined} from 'lucide-react'
import {APP_VERSION} from '../../shared/version'
import {api,Modal} from './actions'
import {message} from './ui'

export function WhatsNew({navigate,error}:{navigate:(view:'home'|'settings'|'stats'|'now'|'jellyfin')=>void;error:(s:string)=>void}){
  const [open,setOpen]=useState(false)
  useEffect(()=>{let live=true;void api.releaseNews('get').then(s=>{if(live&&s.unread)setOpen(true)}).catch(()=>{});const show=()=>setOpen(true);window.addEventListener('show-release-news',show);return()=>{live=false;window.removeEventListener('show-release-news',show)}},[])
  const close=()=>{setOpen(false);void api.releaseNews('seen').catch(e=>error(message(e)))}
  const go=(view:'home'|'settings'|'stats'|'now'|'jellyfin',section?:string)=>{close();navigate(view);if(section)setTimeout(()=>document.getElementById(`settings-${section}`)?.scrollIntoView({block:'start'}),100)}
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR ALL YOUR MEDIA</p><p className="release-intro">A more connected Media Center, with Liquid Glass and a consistent design across your collections.</p><div className="release-highlights">
    <article><Sparkles/><h3>Home across your sources</h3><p>Arrange your sources, Continue watching and recently added Jellyfin shelves alongside music, books and podcasts.</p><button className="text-button" onClick={()=>go('home')}>Open Home <ArrowRight size={15}/></button></article>
    <article><Search/><h3>More control over video</h3><p>Fullscreen controls tuck away when idle. Set subtitle size, preferred languages and an optional next-video countdown.</p><button className="text-button" onClick={()=>go('home')}>Your listening space <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Find media across services</h3><p>Search connected music, books, podcasts and Jellyfin in one place, with media-type and source filters.</p><button className="text-button" onClick={()=>go('settings','servers')}>Connection settings <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Liquid Glass</h3><p>A new restrained glass palette, clear navigation and readable controls. Existing themes retain their own colors.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Appearance settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
