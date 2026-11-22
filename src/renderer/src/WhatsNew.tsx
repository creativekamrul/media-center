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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR ALL YOUR MEDIA</p><p className="release-intro">Explore your libraries through connected search, artists and creators. Your existing connections, settings and saved listening data stay in place.</p><div className="release-highlights">
    <article><Sparkles/><h3>Connected Explore</h3><p>Find artists, albums, tracks, books, podcasts, movies and shows in content-grouped results with source filters.</p><button className="text-button" onClick={()=>go('downtify')}>Open Downtify <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Follow the artist</h3><p>Browse available releases across matching artist entries, then open an album or its original source page.</p><button className="text-button" onClick={()=>go('downtify')}>Find your next listen <ArrowRight size={15}/></button></article>
    <article><Podcast/><h3>People behind your books</h3><p>Open author and narrator results to see available audiobooks and their existing playback and personal controls.</p><button className="text-button" onClick={()=>go('downtify')}>Browse Downtify <ArrowRight size={15}/></button></article>
    <article><ShieldCheck/><h3>Your sources stay yours</h3><p>Source identities, settings, cache and progress are retained. Unsaved Downtify discovery remains an explicit destination.</p><button className="text-button" onClick={()=>go('settings','servers')}>Connection settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
