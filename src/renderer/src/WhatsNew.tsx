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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A calmer interface, a queue that follows you, and more ways to make it yours.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your library, remembered</h3><p>Your first pinned tab opens first, and each page remembers your chosen library or combined view.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><Search/><h3>Playback in your order</h3><p>Sort album and playlist tracks, then play or queue them in that order. The queue follows the current track.</p><button className="text-button" onClick={()=>go('now')}>Go to Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>A clearer interface</h3><p>Tabs, action buttons and result cards have distinct designs across every theme and style. Hide page guidance when you know your way around.</p><button className="text-button" onClick={()=>go('home')}>Your listening space <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Your own atmosphere</h3><p>Try Snowfall, Rain, Deep Ocean and Ember Glow in lyrics appearance, or export your current CSS to edit and import.</p><button className="text-button" onClick={()=>go('settings','updates')}>Update settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
