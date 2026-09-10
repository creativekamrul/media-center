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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A refreshed mini player, clearer navigation and an immersive view that fits your listen.</p><div className="release-highlights">
    <article><Sparkles/><h3>A player that stays close</h3><p>The mini player now has the app icon, larger artwork, centered controls and a clear seek bar with elapsed and total time.</p><button className="text-button" onClick={()=>go('home')}>Explore your collection <ArrowRight size={15}/></button></article>
    <article><Search/><h3>Artwork without extra setup</h3><p>Missing music artwork now uses the public Media Center cover in Discord automatically. No manual default-image upload is needed.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Lyrics or Now Playing</h3><p>Switch music between lyrics and a simple Now Playing stage in immersive view. Find lyric tools beside Fullscreen and Appearance.</p><button className="text-button" onClick={()=>go('home')}>Start listening <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>A workspace that fits</h3><p>Reorder collections, move the queue below Home and find Library tools in Listening Space. Customize hides when the sidebar collapses.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Customize navigation <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
