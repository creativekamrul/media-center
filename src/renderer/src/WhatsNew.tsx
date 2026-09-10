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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">More ways to organize your collection and make each listen your own.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your personal library</h3><p>Library tools now has mixed personal shelves, creator pages and offline plans. Save track-list column layouts, too.</p><button className="text-button" onClick={()=>go('home')}>Explore your collection <ArrowRight size={15}/></button></article>
    <article><Search/><h3>Make a better match</h3><p>Edit a track's display metadata or find artwork through MusicBrainz and Cover Art Archive. Your original files stay untouched.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Listen on your terms</h3><p>Set speed and intro/outro skips per podcast. The top-bar shield starts a private session while keeping spoken resume positions.</p><button className="text-button" onClick={()=>go('home')}>Start listening <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>A workspace that fits</h3><p>Rename collections, choose their icons and collapse the sidebar. Continue Listening cards now share a clear, consistent layout.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Customize navigation <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
