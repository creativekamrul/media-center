import {useEffect,useRef} from 'react'

// Refresh read-only views after a reconnect; never replay writes or start audio.
export function useConnectionRecovery(refresh:()=>void){
  const latest=useRef(refresh);latest.current=refresh
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|undefined
    const recover=()=>{clearTimeout(timer);timer=setTimeout(()=>latest.current(),750)}
    const off=window.mediaCenter.onSystemResume(recover)
    window.addEventListener('online',recover)
    return()=>{clearTimeout(timer);off();window.removeEventListener('online',recover)}
  },[])
}
