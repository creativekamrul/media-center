import {useEffect,useState} from 'react'
import {ArrowUpCircle,X} from 'lucide-react'
import type {UpdateState} from '../../shared/types'

/** Notices are passive: downloads and installation remain explicit choices. */
export function UpdateNotice({open}:{open:()=>void}){
  const [state,setState]=useState<UpdateState>(),[dismissed,setDismissed]=useState('')
  useEffect(()=>{
    let live=true,received=false
    const off=window.mediaCenter.onUpdate(next=>{received=true;if(live)setState(next)})
    void window.mediaCenter.updateState().then(next=>{if(live&&!received)setState(next)}).catch(()=>{})
    return()=>{live=false;off()}
  },[])
  const ready=state?.status==='ready',key=`${state?.version}:${ready}`
  if(!state?.version||!['available','ready'].includes(state.status)||dismissed===key)return null
  return <aside className="update-notice" aria-label="Application update" role="status">
    <ArrowUpCircle size={20}/><span><strong>Media Center {state.version} {ready?'is ready to install':'is available'}</strong><small>{ready?'Restart when you’re ready.':'A newer version is ready to download.'}</small></span>
    <button className="secondary" onClick={open}>View update</button>
    <button className="icon-button" aria-label="Dismiss update notification" onClick={()=>setDismissed(key)}><X size={18}/></button>
  </aside>
}
