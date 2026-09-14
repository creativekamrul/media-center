import {useEffect,useRef} from 'react'

/** Follow track changes and panel reopening, without polling or fighting manual scrolling. */
export function useQueueFollow(index:number,page:number,visible:boolean,identity:string){
 const root=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!visible)return
  const frame=requestAnimationFrame(()=>{
   const row=root.current?.querySelector<HTMLElement>('[aria-current="true"]')
   if(!row)return
   for(let parent=row.parentElement;parent;parent=parent.parentElement){
    if(!/(auto|scroll)/.test(getComputedStyle(parent).overflowY)||parent.scrollHeight<=parent.clientHeight)continue
    const bounds=parent.getBoundingClientRect(),target=row.getBoundingClientRect()
    if(target.top<bounds.top||target.bottom>bounds.bottom)parent.scrollTop+=target.top-bounds.top-(parent.clientHeight-target.height)/2
    break
   }
  })
  return()=>cancelAnimationFrame(frame)
 },[index,page,visible,identity])
 return root
}
