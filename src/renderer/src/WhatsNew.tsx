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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">Consistent controls, complete local playlists and easier recovery.</p><div className="release-highlights">
    <article><Sparkles/><h3>A consistent listening space</h3><p>Familiar player buttons, quiet Frosted navigation, readable artwork controls and cleaner track lists.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><Search/><h3>The whole local playlist</h3><p>Play and queue local collections in your chosen order, across every page. Saved playlist order stays intact.</p><button className="text-button" onClick={()=>go('home')}>Your listening space <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Smoother everyday listening</h3><p>Faster large-list sorting, retained libraries during outages and playback retry from your position.</p><button className="text-button" onClick={()=>go('settings','connections')}>Connection settings <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Appearance recovery</h3><p>Use defaults if custom CSS gets in the way. Your previous theme stays available to restore. Press Ctrl+Shift+F9 anytime.</p><button className="text-button" onClick={()=>go('settings','appearance')}>Appearance settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
