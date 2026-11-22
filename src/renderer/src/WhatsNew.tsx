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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR ALL YOUR MEDIA</p><p className="release-intro">More of Downtify inside Media Center, with your existing connections, settings and saved listening data kept in place.</p><div className="release-highlights">
    <article><Sparkles/><h3>Your server playlists</h3><p>Create and reorder playlists, repeat songs, manage sharing, follow public playlists and restore hidden imported songs.</p><button className="text-button" onClick={()=>go('downtify')}>Open Downtify <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Charts and new releases</h3><p>Browse Charts, follow artists and playlists, review your release inventory and choose what the server downloads.</p><button className="text-button" onClick={()=>go('downtify')}>Find your next listen <ArrowRight size={15}/></button></article>
    <article><Podcast/><h3>Podcasts and server lyrics</h3><p>Listen to saved Downtify episodes with independent progress. Music can use the server’s timed lyrics before LRCLIB.</p><button className="text-button" onClick={()=>go('downtify')}>Browse Downtify <ArrowRight size={15}/></button></article>
    <article><ShieldCheck/><h3>Care for your library</h3><p>Edit metadata, choose replacement audio and review Doctor findings or selective library upgrades. Administrator controls require a web session.</p><button className="text-button" onClick={()=>go('settings','servers')}>Connection settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
