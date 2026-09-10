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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">Your collection, freshly arranged. Create custom mixes and return to more of the albums you love.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your sound, your rules</h3><p>Build saved mixes from artists, genres, years, favorites and more. Combine music servers and local folders, preview matches and choose your order.</p><button className="text-button" onClick={()=>go('home')}>Explore your collection <ArrowRight size={15}/></button></article>
    <article><Search/><h3>More records to return to</h3><p>Recently played albums now shows a full page from each server. Load more albums directly on Home.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>A clearer collection</h3><p>Music, local music, audiobooks and podcasts share icon-led headers and underlined views. Your custom collection names and icons follow you inside.</p><button className="text-button" onClick={()=>go('home')}>Start listening <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Keep your favorite recipes</h3><p>Find saved mixes on Home and in Library tools. Edit or duplicate a recipe; mixes also travel with your personal backup.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Customize navigation <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
