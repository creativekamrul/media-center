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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A familiar cover for your Discord listening activity, including books and podcasts.</p><div className="release-highlights">
    <article><Sparkles/><h3>Artwork in Discord</h3><p>Shared music, audiobooks, podcasts and local files use the Media Center default in Discord when no public artwork is available.</p><button className="text-button" onClick={()=>go('home')}>Explore your collection <ArrowRight size={15}/></button></article>
    <article><Search/><h3>Share with a cover</h3><p>Your generated audiobook and podcast covers stay in the app. Discord continues to respect private listening and your sharing choices.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Keep your next listen</h3><p>Saved queues have a clear save form and organized controls to resume, load, replace or remove a queue.</p><button className="text-button" onClick={()=>go('home')}>Start listening <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>A cover of your own</h3><p>Generate playlist artwork inside customization, with a square preview and controls that match the rest of your library.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Customize navigation <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
