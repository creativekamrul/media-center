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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A new style for your whole app. More ways to settle into the music.</p><div className="release-highlights">
    <article><Sparkles/><h3>Six application styles</h3><p>Choose Soft, Precision, Outline, Bold or Retro. Original keeps your current design, and your theme colors stay yours.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Choose your style <ArrowRight size={15}/></button></article>
    <article><Search/><h3>A more immersive view</h3><p>Try Minimal and Gallery layouts, with a colorful blurred-artwork background across the full queue and lyrics view.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Discord, ready to connect</h3><p>Enable Rich Presence using the shared Media Center application. A custom Application ID is now optional.</p><button className="text-button" onClick={()=>go('settings','sharing')}>Discord settings <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>A smoother setup</h3><p>Windows setup checks the selected folder and running installation more precisely, with clearer errors and graceful app shutdown.</p><button className="text-button" onClick={()=>go('settings','updates')}>Update settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
