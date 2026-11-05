import {AlertCircle,FolderOpen,LoaderCircle,RefreshCw} from 'lucide-react'
export const openSettings=()=>window.dispatchEvent(new CustomEvent('app-navigate',{detail:'settings'}))
export function PageState({kind,title,description,action,label,layout='message'}:{layout?:'message'|'library';kind:'loading'|'empty'|'error';title:string;description?:string;action?:()=>void;label?:string}){
  const Icon=kind==='loading'?LoaderCircle:kind==='error'?AlertCircle:FolderOpen
  return <div className={`page-state page-state-${kind} page-state-${layout}`} role={kind==='error'?'alert':'status'} aria-live="polite" aria-busy={kind==='loading'}><span className="page-state-icon"><Icon size={24} className={kind==='loading'?'spin':undefined}/></span><div><h2>{title}</h2>{description&&<p>{description}</p>}{kind==='loading'&&<div className="loading-lines" aria-hidden="true"><i/><i/><i/></div>}{kind==='loading'&&layout==='library'&&<div className="loading-cards" aria-hidden="true">{Array.from({length:8},(_,i)=><span key={i}><i/><b/><small/></span>)}</div>}{action&&<button className="secondary" onClick={action}>{kind==='error'&&<RefreshCw size={16}/>} {label??'Try again'}</button>}</div></div>
}
