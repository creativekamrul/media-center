import {createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction} from 'react'
import {defaultPreferences, type Preferences} from '../../shared/types'
import {api} from './actions'
import {message} from './ui'
import {applyAppearance} from './appearance'
import {ThemePicker} from './ThemePicker'
import {AppearanceEditor} from './AppearanceEditor'

type Draft = {prefs:Preferences;setPrefs:Dispatch<SetStateAction<Preferences>>;busy:boolean;notice:string;save:(notice:string)=>Promise<void>;error:(text:string)=>void}
const Context = createContext<Draft | null>(null)
export function usePreferencesDraft(){const draft=useContext(Context);if(!draft)throw new Error('Settings preferences are unavailable');return draft}
export function SettingsPreferences({children,error}:{children:ReactNode;error:(s:string)=>void}){
  const [prefs,setPrefs]=useState(defaultPreferences),[ready,setReady]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('')
  useEffect(()=>{let live=true;void api.preferences().then(p=>{if(live){setPrefs(p);setReady(true)}}).catch(e=>error(message(e)));const off=api.onTheme(p=>{if(live)setPrefs(p)});return()=>{live=false;off();void api.previewTheme(null).catch(()=>{});void api.preferences().then(applyAppearance).catch(()=>{})}},[])
  useEffect(()=>{if(ready){applyAppearance(prefs);void api.previewTheme(prefs).catch(e=>error(message(e)))}setNotice('')},[prefs,ready])
  async function save(text:string){if(!ready||saving)return;setSaving(true);try{await api.savePreferences(prefs);setNotice(text)}catch(e){error(message(e))}finally{setSaving(false)}}
  return <Context.Provider value={{prefs,setPrefs,busy:!ready||saving,notice,save,error}}><fieldset className="settings-draft" disabled={!ready||saving}>{children}</fieldset></Context.Provider>
}
export function ThemePreferences(){
  const {prefs,setPrefs,busy,notice,save,error}=usePreferencesDraft()
  async function importCss(){try{const css=await api.importThemeCss();if(css!==null)setPrefs(p=>({...p,customCss:css}))}catch(e){error(message(e))}}
  return <section className="settings-panel theme-preferences"><ThemePicker value={prefs.theme} onChange={theme=>setPrefs(p=>({...p,theme}))}/><AppearanceEditor value={prefs} onChange={setPrefs}/>
    <div className="css-import"><h3>Custom theme CSS</h3><p className="muted">Import a local UTF-8 .css file, up to 512 KB. Preview it here, then save your theme. Remote assets remain blocked by the app.</p><div className="listen-actions"><button className="secondary" disabled={busy} onClick={()=>void importCss()}>Import theme CSS</button>{prefs.customCss!==undefined&&<button className="text-button" onClick={()=>setPrefs(p=>({...p,customCss:undefined}))}>Remove custom CSS</button>}</div><p className="muted">{prefs.customCss!==undefined?`${new TextEncoder().encode(prefs.customCss).length.toLocaleString()} bytes of custom CSS loaded`:'No custom CSS loaded'}</p></div>
    <div className="settings-actions"><button className="primary" disabled={busy} onClick={()=>void save('Theme saved')}>Save theme</button></div>{notice&&<span className="action-notice" role="status">{notice}</span>}
  </section>
}
