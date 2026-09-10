import {useEffect,type RefObject} from 'react'
import type {MediaRef} from '../../shared/personal-library'

/** Bind the card itself, never an arbitrary parent containing several media items. */
export function useCollectionContext(ref:RefObject<HTMLElement|null>,item:MediaRef|undefined){
 useEffect(()=>{
  const node=ref.current?.closest('.music-card,.media-card,.personal-shelf-card,.personal-entry,.detail-hero')??ref.current
  if(!node||!item)return
  const show=(e:Event)=>{e.preventDefault();e.stopPropagation();window.dispatchEvent(new CustomEvent('collection-menu',{detail:item}))}
  const key=(e:Event)=>{const k=e as KeyboardEvent;if(k.key==='ContextMenu'||(k.shiftKey&&k.key==='F10'))show(e)}
  node.addEventListener('contextmenu',show);node.addEventListener('keydown',key)
  return()=>{node.removeEventListener('contextmenu',show);node.removeEventListener('keydown',key)}
 },[JSON.stringify(item)])
}
