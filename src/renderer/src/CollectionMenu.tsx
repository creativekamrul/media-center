import {useEffect,useState} from 'react'
import type {MediaRef} from '../../shared/personal-library'
import type {QueueItem} from '../../shared/types'
import {api,Modal,ListenActions} from './actions'
import {PersonalActions} from './PersonalLibrary'
import {message} from './ui'

export function CollectionMenu(){
 const [item,setItem]=useState<MediaRef>()
 useEffect(()=>{const open=(e:Event)=>setItem((e as CustomEvent<MediaRef>).detail);window.addEventListener('collection-menu',open);return()=>window.removeEventListener('collection-menu',open)},[])
 return item?<Menu key={JSON.stringify(item)} item={item} close={()=>setItem(undefined)}/>:null
}
function Menu({item,close}:{item:MediaRef;close:()=>void}){
 const [items,setItems]=useState<QueueItem[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState('')
 useEffect(()=>{let live=true;void api.personalResolve([item]).then(r=>{if(live)setItems(r)}).catch(e=>{if(live)setError(message(e))}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[item])
 return <Modal title={item.kind==='playable'?item.item.title:item.title} close={close}>
  <div className="track-menu-layout collection-menu-layout"><p>{busy?'Loading collection…':`${items.length} playable items`}</p>
  {error&&<p role="alert">{error}</p>}
  <div className="track-menu-section"><ListenActions items={items} disabled={busy} error={setError}/></div>
  <div className="track-menu-section"><PersonalActions refs={[item]} after={close}/></div>
 </div></Modal>
}
