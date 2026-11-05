import {useLayoutEffect,useRef,useState} from 'react'
import {Explore} from './Explore'

/** Keep horizontal rails, filters and the chosen feature alive during a detail visit. */
export function ExplorePane({active}:{active:boolean}) {
  const [visited,setVisited]=useState(active)
  const container=useRef<HTMLDivElement>(null)
  const scroll=useRef(0)
  const focus=useRef<HTMLElement|null>(null)
  useLayoutEffect(()=>{
    if(!active)return
    setVisited(true)
    const workspace=container.current?.closest<HTMLElement>('.workspace')
    if(!workspace)return
    workspace.scrollTop=scroll.current
    if(focus.current?.isConnected)focus.current.focus({preventScroll:true})
    const remember=()=>{scroll.current=workspace.scrollTop}
    workspace.addEventListener('scroll',remember)
    return ()=>workspace.removeEventListener('scroll',remember)
  },[active])
  return <div hidden={!active} ref={container} onFocusCapture={e=>{focus.current=e.target}}>
    {(active||visited)&&<Explore/>}
  </div>
}
