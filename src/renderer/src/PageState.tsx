import {AlertCircle,FolderOpen,LoaderCircle,RefreshCw} from 'lucide-react'
export const openSettings=()=>window.dispatchEvent(new CustomEvent('app-navigate',{detail:'settings'}))
export function PageState({kind,title,description,action,label}:{kind:'loading'|'empty'|'error';title:string;description?:string;action?:()=>void;label?:string}){
  const Icon=kind==='loading'?LoaderCircle:kind==='error'?AlertCircle:FolderOpen
  return <div className={`page-state page-state-${kind}`} role={kind==='error'?'alert':'status'} aria-live="polite"><span className="page-state-icon"><Icon size={24} className={kind==='loading'?'spin':undefined}/></span><div><h2>{title}</h2>{description&&<p>{description}</p>}{action&&<button className="secondary" onClick={action}>{kind==='error'&&<RefreshCw size={16}/>} {label??'Try again'}</button>}</div></div>
}
