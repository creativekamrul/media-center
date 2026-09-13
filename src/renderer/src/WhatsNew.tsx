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
  return open?<Modal title={`What’s new in Media Center ${APP_VERSION}`} close={close}><div className="release-news"><p className="eyebrow">A HOME FOR EVERYTHING YOU LISTEN TO</p><p className="release-intro">A little more room to listen. Clearer controls throughout your library.</p><div className="release-highlights">
    <article><Sparkles/><h3>More comfortable controls</h3><p>Larger More options buttons, roomier Now Playing controls, contained album favorites, and a cleaner mini-player header.</p><button className="text-button" onClick={()=>go('now')}>Open Now Playing <ArrowRight size={15}/></button></article>
    <article><Search/><h3>Lyrics with room to breathe</h3><p>One scrolling reading area with sharp surrounding lines. Find lyrics stays close; import, editing and timing live in Lyric tools.</p><button className="text-button" onClick={()=>go('now')}>Go to Now Playing <ArrowRight size={15}/></button></article>
    <article><ChartNoAxesCombined/><h3>Refined custom mixes</h3><p>Style-aware cards keep Play and Open mix together, with duplication and deletion under More options. Library tools now uses More tools.</p><button className="text-button" onClick={()=>go('home')}>Your listening space <ArrowRight size={15}/></button></article>
    <article><Palette/><h3>Updates on startup</h3><p>The installed app checks for a newer version when it starts and shows a dismissible notice. Download and install when you choose.</p><button className="text-button" onClick={()=>go('settings','updates')}>Update settings <ArrowRight size={15}/></button></article>
  </div><div className="settings-actions"><button className="secondary" onClick={()=>void api.releaseNews('changelog').catch(e=>error(message(e)))}>Full changelog</button><button className="primary" onClick={close}>Keep listening</button></div><p className="muted">You can reopen this screen from Settings → Updates.</p></div></Modal>:null
}
