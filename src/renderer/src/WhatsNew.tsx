import {useEffect,useState} from 'react'
import {ArrowRight,Palette,Search,Sparkles,ChartNoAxesCombined} from 'lucide-react'
import {APP_VERSION} from '../../shared/version'
import {api,Modal} from './actions'
import {message} from './ui'

export function WhatsNew({navigate,error}:{navigate:(view:'home'|'settings'|'stats'|'now')=>void;error:(s:string)=>void}){
  const [open,setOpen]=useState(false)
  useEffect(()=>{let live=true;void api.releaseNews('get').then(s=>{if(live&&s.unread)setOpen(true)}).catch(()=>{});const show=()=>setOpen(true);window.addEventListener('show-release-news',show);return()=>{live=false;window.removeEventListener('show-release-news',show)}},[])
  const close=()=>{setOpen(false);void api.releaseNews('seen').catch(e=>error(message(e)))}
  const go=(view:'home'|'settings'|'stats'|'now',section?:string)=>{close();navigate(view);if(section)setTimeout(()=>document.getElementById(`settings-${section}`)?.scrollIntoView({block:'start'}),100)}
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">Your views, your libraries, and a complete immersive player.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your pinned views</h3><p>Choose and reorder the tabs in Music, Local music and Library tools. Homepage-style arrows reveal extra tabs without a scrollbar.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><Search/><h3>A complete immersive player</h3><p>Playback controls now live beside the cover in immersive view. Leaving it also exits fullscreen automatically.</p><button className="text-button" onClick={()=>go('now')}>Go to Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>All your music servers</h3><p>Choose each named Navidrome library or browse them together. Artwork, playback and favorites stay connected to the correct server.</p><button className="text-button" onClick={()=>go('home')}>Your listening space <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Scroll to adjust volume</h3><p>Hover over the volume icon, slider or percentage and use the mouse wheel to adjust the level.</p><button className="text-button" onClick={()=>go('settings','updates')}>Update settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
