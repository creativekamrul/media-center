import {createContext, useContext, useEffect, useState, useRef, type ReactNode, type Dispatch, type SetStateAction} from 'react'
import {defaultPreferences, type Preferences} from '../../shared/types'
import {api} from './actions'
import {message} from './ui'
import {applyAppearance} from './appearance'
import {defaultAppearance} from '../../shared/appearance'
import {exportCurrentCss} from './exportCurrentCss'
import {StylePicker} from './StylePicker'
import {AppearanceEditor} from './AppearanceEditor'

type Draft = {prefs:Preferences;setPrefs:Dispatch<SetStateAction<Preferences>>;busy:boolean;notice:string;save:(notice:string)=>Promise<void>;error:(text:string)=>void}
let pendingDraft:Preferences|undefined
const Context = createContext<Draft | null>(null)
export function usePreferencesDraft(){const draft=useContext(Context);if(!draft)throw new Error('Settings preferences are unavailable');return draft}
export function SettingsPreferences({children,error}:{children:ReactNode;error:(s:string)=>void}){
  const [baseline,setBaseline]=useState(defaultPreferences)
  const current=useRef(defaultPreferences),saved=useRef(defaultPreferences)
  const [prefs,setPrefs]=useState(defaultPreferences),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('')
  useEffect(()=>{let live=true;void api.preferences().then(p=>{if(live){setPrefs(pendingDraft??p);setBaseline(p);saved.current=p;setReady(true)}}).catch(e=>error(message(e)));const off=api.onTheme(p=>{if(live){setPrefs(p);setBaseline(p);saved.current=p;pendingDraft=undefined}});return()=>{pendingDraft=JSON.stringify(current.current)!==JSON.stringify(saved.current)?current.current:undefined;live=false;off();void api.previewTheme(null).catch(()=>{});void api.preferences().then(applyAppearance).catch(()=>{})}},[])
  current.current=prefs
  const dirty=ready&&JSON.stringify(prefs)!==JSON.stringify(baseline)
  useEffect(()=>{if(ready){applyAppearance(prefs);void api.previewTheme(prefs).catch(e=>error(message(e)))}setNotice('')},[prefs,ready])
  async function save(text:string){if(!ready||saving)return;setSaving(true);try{await api.savePreferences(prefs);setBaseline(prefs);saved.current=prefs;pendingDraft=undefined;setNotice(text)}catch(e){error(message(e))}finally{setSaving(false)}}
  return <Context.Provider value={{prefs,setPrefs,busy:!ready||saving,notice,save,error}}><fieldset className="settings-draft" disabled={!ready||saving}>{dirty&&<div className="settings-unsaved" role="status"><span>Unsaved preference changes</span><button type="button" className="secondary" onClick={()=>{setPrefs(baseline);pendingDraft=undefined}}>Discard changes</button><button type="button" className="primary" onClick={()=>void save('Preferences saved')}>Save changes</button></div>}{children}</fieldset></Context.Provider>
}
export function ThemePreferences(){
  const {prefs,setPrefs,busy,notice,save,error}=usePreferencesDraft()
  const [recovery,setRecovery]=useState(false)
  useEffect(()=>{const refresh=()=>{void api.appearanceRecovery('get').then(setRecovery).catch(e=>error(message(e)))};refresh();return api.onTheme(refresh)},[])
  async function recover(){try{setRecovery(await api.appearanceRecovery(recovery?'restore':'start'))}catch(e){error(message(e))}}
  async function importCss(){try{const css=await api.importThemeCss();if(css!==null)setPrefs(p=>({...p,customCss:css}))}catch(e){error(message(e))}}
  return <section className="settings-panel theme-preferences"><label className="setting-toggle"><span><strong>Show page guidance</strong><small>Display tips and explanations throughout the app.</small></span><input type="checkbox" aria-label="Show page guidance" checked={prefs.appearance?.showHelp??true} onChange={e=>setPrefs(p=>({...p,appearance:{...(p.appearance??defaultAppearance),showHelp:e.target.checked}}))}/></label><StylePicker value={prefs} onChange={setPrefs}/><AppearanceEditor value={prefs} onChange={setPrefs}/>
    <details className="advanced-appearance"><summary>Advanced appearance</summary><div className="css-import"><h3>Custom theme CSS</h3><p className="muted guidance">Import a local UTF-8 .css file, up to 512 KB. Preview it here, then save your appearance. Remote assets remain blocked by the app.</p><div className="listen-actions"><button className="secondary" disabled={busy} onClick={()=>void exportCurrentCss().catch(e=>error(message(e)))}>Export current CSS</button><button className="secondary" disabled={busy} onClick={()=>void importCss()}>Import theme CSS</button>{prefs.customCss!==undefined&&<button className="text-button" onClick={()=>setPrefs(p=>({...p,customCss:undefined}))}>Remove custom CSS</button>}</div><p className="muted">{prefs.customCss!==undefined?`${new TextEncoder().encode(prefs.customCss).length.toLocaleString()} bytes of custom CSS loaded`:'No custom CSS loaded'}</p></div>
    <div className="appearance-recovery"><div><h3>Appearance recovery</h3><p className="muted">{recovery?'Your previous theme and CSS are saved. Restore them at any time.':'Use defaults if custom CSS or colors make the app difficult to use. Your saved appearance is kept.'}</p><small className="muted">Available anytime with Ctrl + Shift + F9 or from the tray menu.</small></div><button className="secondary" disabled={busy} onClick={()=>void recover()}>{recovery?'Restore saved appearance':'Use default appearance'}</button></div></details><div className="settings-actions"><button className="primary" disabled={busy} onClick={()=>void save('Appearance saved')}>Save appearance</button></div>{notice&&<span className="action-notice" role="status">{notice}</span>}
  </section>
}
