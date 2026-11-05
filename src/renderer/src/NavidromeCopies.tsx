import {useEffect,useRef,useState} from 'react'
import {Library,Play} from 'lucide-react'
import type {DtTrack} from '../../shared/downtify'
import {api,Modal} from './actions'
import {message} from './ui'

type Result=Awaited<ReturnType<typeof api.savedCopies>>
const cache=new Map<string,{until:number;result:Result}>()
export const clearSavedCopyCache=()=>cache.clear()
const running=new Map<string,Promise<Result>>()
const waiting:(()=>void)[]=[]
let active=0

async function lookup(t:DtTrack):Promise<Result>{
  const key=JSON.stringify([t.serverId,t.id]),cached=cache.get(key)
  if(cached&&cached.until>Date.now())return cached.result
  const pending=running.get(key)
  if(pending)return pending
  const work=(async()=>{
    if(active>=2)await new Promise<void>(ready=>waiting.push(ready));else active++
    try{
      const result=await api.savedCopies({serverId:t.serverId,trackId:t.id})
      if(!result.warnings.length){
        cache.set(key,{result,until:Date.now()+300000})
        if(cache.size>256)cache.delete(cache.keys().next().value!)
      }
      return result
    }finally{
      const next=waiting.shift()
      if(next)next();else active--
    }
  })()
  running.set(key,work)
  try{return await work}finally{running.delete(key)}
}

export function NavidromeCopies({track}:{track:DtTrack}){
  const anchor=useRef<HTMLSpanElement>(null),[result,setResult]=useState<Result>(),[open,setOpen]=useState(false)
  const [error,setError]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{
    let live=true
    setResult(undefined);setOpen(false);setError('')
    const observer=new IntersectionObserver(entries=>{
      if(!entries.some(e=>e.isIntersecting))return
      observer.disconnect()
      void lookup(track).then(r=>{if(live)setResult(r)}).catch(e=>{if(live)setError(message(e))})
    })
    if(anchor.current)observer.observe(anchor.current)
    return ()=>{live=false;observer.disconnect()}
  },[track.id,track.serverId,revision])
  return <span ref={anchor} className="dt-copy-match">
    {!!result?.copies.length&&<button className="text-button" onClick={()=>setOpen(true)}><Library size={14}/>Also in Navidrome</button>}
    {(error||!!result?.warnings.length)&&<button className="text-button" title={[error,...result?.warnings??[]].filter(Boolean).join(' ')} onClick={()=>setRevision(n=>n+1)}>Retry library lookup</button>}
    {open&&result&&<Modal title="Also in Navidrome" close={()=>setOpen(false)}><h3>{track.title}</h3><p>{track.artist} · {track.album}</p>{result.copies.map(copy=><button className="secondary" key={copy.item.target.serverId} onClick={()=>void api.play({queue:[copy.item],index:0}).then(()=>setOpen(false)).catch(e=>setError(message(e)))}><Play size={16}/>Play from {copy.source}</button>)}{error&&<p role="alert">{error}</p>}</Modal>}
  </span>
}
