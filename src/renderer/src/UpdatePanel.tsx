import { useEffect, useState } from 'react'
import { Download, RefreshCw, RotateCcw } from 'lucide-react'
import type { UpdateState } from '../../shared/types'
import { APP_VERSION } from '../../shared/version'
import { message } from './ui'

const api = window.mediaCenter
export function UpdatePanel() {
  const [state, setState] = useState<UpdateState>({ currentVersion: APP_VERSION, status: 'idle' })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true, received = false
    const off = api.onUpdate(next => { received = true; if (live) setState(next) })
    void api.updateState().then(next => { if (live && !received) setState(next) }).catch(e => { if (live) setState(s => ({ ...s, status: 'error', error: message(e) })) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false; off() }
  }, [])
  async function act(action: 'checkForUpdates' | 'downloadUpdate' | 'installUpdate') {
    try { setState(await api[action]()) } catch (e) { setState(s => ({ ...s, status: 'error', error: message(e) })) }
  }
  const busy = loading || ['checking', 'downloading', 'installing'].includes(state.status)
  const text: Record<UpdateState['status'], string> = {
    idle: 'Check GitHub for a newer stable version.', unavailable: 'Updates are available in the installed Windows app.',
    checking: 'Checking GitHub releases…', 'up-to-date': 'You’re running the latest available version.',
    available: `Version ${state.version} is available.`, downloading: `Downloading version ${state.version} · ${Math.round(state.percent ?? 0)}%`,
    ready: `Version ${state.version} is ready to install.`, installing: 'Saving your listening session and starting the installer…', error: 'Update needs attention.'
  }
  return <section className="settings-panel update-panel" aria-label="App updates">
    <div className="update-heading"><div><h2>App updates</h2><p>Installed version {state.currentVersion} · Stable releases</p></div><span className="update-source">creativekamrul/media-center</span></div>
    <p role="status" aria-live="polite">{text[state.status]}</p>
    {state.error && <p role="alert" className="update-error">{state.error}</p>}
    {state.status === 'downloading' && <progress aria-label="Update download progress" value={state.percent ?? 0} max={100}/>}
    <div className="listen-actions"><button className="secondary" onClick={()=>window.dispatchEvent(new Event('show-release-news'))}>What’s new</button>
      {state.status === 'ready' || state.status === 'installing'
        ? <button className="primary" disabled={busy} onClick={() => void act('installUpdate')}><RotateCcw size={17}/>Restart and install</button>
        : <><button className="secondary" disabled={busy || state.status === 'unavailable'} onClick={() => void act('checkForUpdates')}><RefreshCw size={17} className={state.status === 'checking' ? 'spin' : undefined}/>Check for updates</button>
          {['available', 'downloading'].includes(state.status) && <button className="primary" disabled={busy} onClick={() => void act('downloadUpdate')}><Download size={17}/>Download update</button>}</>}
    </div>
    <p className="update-hint">{state.status === 'ready' ? 'Restarting stops playback and saves your queue and progress. You can keep listening and install later.' : 'Downloads start only when you choose. Updates never install on normal exit.'}</p>
  </section>
}
