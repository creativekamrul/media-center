import {useEffect,useState} from 'react'
import {ArrowRight,ShieldCheck,Podcast,Sparkles,ChartNoAxesCombined} from 'lucide-react'
import {APP_VERSION} from '../../shared/version'
import {api,Modal} from './actions'
import {message} from './ui'

export function WhatsNew({navigate,error}:{navigate:(view:'home'|'settings'|'stats'|'now'|'jellyfin'|'downtify')=>void;error:(s:string)=>void}){
  const [open,setOpen]=useState(false)
  useEffect(()=>{let live=true;void api.releaseNews('get').then(s=>{if(live&&s.unread)setOpen(true)}).catch(()=>{});const show=()=>setOpen(true);window.addEventListener('show-release-news',show);return()=>{live=false;window.removeEventListener('show-release-news',show)}},[])
  const close=()=>{setOpen(false);void api.releaseNews('seen').catch(e=>error(message(e)))}
  const go=(view:'home'|'settings'|'stats'|'now'|'jellyfin'|'downtify',section?:string)=>{close();navigate(view);if(section)setTimeout(()=>document.getElementById(`settings-${section}`)?.scrollIntoView({block:'start'}),100)}
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR ALL YOUR MEDIA</p><p className="release-intro">A new Listening Room for Downtify, with your existing connections, settings and saved listening data kept in place.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your listening room</h3><p>A featured listen, artwork shelves and recent listening bring your Downtify collection together.</p><button className="text-button" onClick={()=>go('downtify')}>Open Downtify <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>A place for everything</h3><p>Open your collection, follows, podcasts and charts from dedicated destinations instead of a long tab strip.</p><button className="text-button" onClick={()=>go('downtify')}>Find your next listen <ArrowRight size={15}/></button></article>
    <article><Podcast/><h3>Quieter controls</h3><p>Add follows and podcasts in compact drawers. Save retention changes explicitly, with clear confirmation before server changes.</p><button className="text-button" onClick={()=>go('downtify')}>Browse Downtify <ArrowRight size={15}/></button></article>
    <article><ShieldCheck/><h3>Your tools, close by</h3><p>Server downloads and library care live in the tools menu. Existing playlist, playback, metadata and maintenance features remain available.</p><button className="text-button" onClick={()=>go('settings','servers')}>Connection settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
