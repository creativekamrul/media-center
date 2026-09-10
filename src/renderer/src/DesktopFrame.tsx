import {useEffect,useState,type ReactNode} from 'react'
import {AudioLines,Copy,Minus,Square,X} from 'lucide-react'
import type {WindowState} from '../../shared/types'
import {api} from './actions'
import {message} from './ui'

export function DesktopFrame({children,error}:{children:ReactNode;error:(text:string)=>void}){
  const [state,setState]=useState<WindowState>({maximized:false,fullscreen:false,focused:true})
  useEffect(()=>{
    let live=true
    const unsubscribe=api.onWindowState(next=>{if(live)setState(next)})
    void api.windowControl('get').then(next=>{if(live)setState(next)}).catch(e=>error(message(e)))
    return()=>{live=false;unsubscribe()}
  },[error])
  const command=(action:'minimize'|'maximize'|'close')=>void api.windowControl(action).catch(e=>error(message(e)))
  return <div className={`desktop-window${state.fullscreen?' is-fullscreen':''}${state.focused?'':' is-unfocused'}`}>
    <header className="window-titlebar" aria-label="Application title bar">
      <div className="window-drag-area"><AudioLines size={16}/><span>Media Center</span></div>
      <div className="window-controls" role="group" aria-label="Window controls">
        <button type="button" aria-label="Minimize window" title="Minimize" onClick={()=>command('minimize')}><Minus size={15}/></button>
        <button type="button" aria-label={state.maximized?'Restore window':'Maximize window'} title={state.maximized?'Restore':'Maximize'} onClick={()=>command('maximize')}>{state.maximized?<Copy size={13}/>:<Square size={13}/>}</button>
        <button type="button" className="window-close" aria-label="Close window" title="Close" onClick={()=>command('close')}><X size={17}/></button>
      </div>
    </header>
    {children}
  </div>
}
