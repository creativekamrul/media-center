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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">Your saved mixes, ready to play. Your artwork, with more room to shine.</p><div className="release-highlights">
    <article><Sparkles/><h3>Play your custom mixes</h3><p>Start saved mixes directly from Home or Library tools. Your saved rules select the tracks, with a clear message if nothing matches.</p><button className="text-button" onClick={()=>go('home')}>Explore your collection <ArrowRight size={15}/></button></article>
    <article><Search/><h3>More room for artwork</h3><p>Immersive artwork is now a rounded square, and Now Playing gives covers more space beside the independently scrolling queue.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Meet the artist</h3><p>Click an artist in Now Playing to explore their albums and tracks on a dedicated page.</p><button className="text-button" onClick={()=>go('home')}>Start listening <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>A cleaner listening view</h3><p>Track columns have consistent spacing, and lyric tools sit together alongside Lyrics appearance.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Customize navigation <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
