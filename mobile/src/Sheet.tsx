import {useEffect,useRef,type ReactNode} from 'react'
import {X} from 'lucide-react'

export function Sheet({title,close,children}:{title:string;close:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null)
  const startY=useRef(0)
  useEffect(()=>{
    const dialog=ref.current!
    dialog.showModal()
    return ()=>dialog.close()
  },[])
  return <dialog ref={ref} className="sheet" aria-label={title}
    onCancel={e=>{e.preventDefault();close()}}
    onClick={e=>{if(e.target===ref.current&&e.clientY<ref.current.getBoundingClientRect().top)close()}}>
    <header onTouchStart={e=>{startY.current=e.touches[0].clientY}} onTouchEnd={e=>{if(e.changedTouches[0].clientY-startY.current>65)close()}}>
      <h2>{title}</h2><button className="icon" aria-label={'Close '+title} onClick={close}><X/></button>
    </header>{children}
  </dialog>
}
