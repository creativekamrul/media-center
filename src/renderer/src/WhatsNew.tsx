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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A more seamless window, with controls that feel at home in your theme.</p><div className="release-highlights">
    <article><Palette/><h3>Your theme, right to the edge</h3><p>A custom title bar brings minimize, maximize and close controls into your theme. Drag its title area to move the window.</p><button className="text-button" onClick={()=>go('home')}>Explore Home <ArrowRight size={15}/></button></article>
    <article><Search/><h3>A tidier playing screen</h3><p>Back to library now sits with the Queue, Lyrics and Immersive controls in a compact header above your artwork.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Your listening, in your style</h3><p>Date-range comparisons and downloadable Recaps in 12 layouts and 12 palettes.</p><button className="text-button" onClick={()=>go('stats')}>Create a Recap <ArrowRight size={15}/></button></article>
    <article><Sparkles/><h3>Make it your own</h3><p>Listening profiles, playlist covers, lyric editing and optional crossfade.</p><button className="text-button" onClick={()=>go('settings','playback')}>Explore playback <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
