import {useEffect,useRef,useState} from 'react'
import type {Recommendation} from '../../shared/recommendations'
import {api} from './actions'
import {message} from './ui'

interface SourceResult<T> {id:string;name:string;items:T[];pending:boolean;warnings:string[]}
export function useSourceShelves<T>(revision:number, listSources:()=>Promise<{id:string;name:string}[]>, read:(id:string)=>Promise<{items:T[];warnings:string[]}>) {
  const [sources,setSources]=useState<SourceResult<T>[]>([])
  const [starting,setStarting]=useState(true),[error,setError]=useState('')
  const retry=useRef<(id:string)=>void>(()=>{})
  useEffect(()=>{
    let live=true
    const pending=new Set<string>()
    setStarting(true);setError('')
    const load=async(id:string)=>{
      if(pending.has(id))return
      pending.add(id)
      setSources(rows=>rows.map(row=>row.id===id?{...row,pending:true}:row))
      try{
        const result=await read(id)
        if(live)setSources(rows=>rows.map(row=>row.id===id?{...row,...result,pending:false}:row))
      }catch(e){
        if(live)setSources(rows=>rows.map(row=>row.id===id?{...row,pending:false,warnings:[message(e)]}:row))
      }finally{pending.delete(id)}
    }
    retry.current=load
    void listSources().then(list=>{
      if(!live)return
      setSources(list.map(s=>({...s,items:[],pending:true,warnings:[]})))
      setStarting(false)
      list.forEach(s=>void load(s.id))
    }).catch(e=>{if(live){setError(message(e));setStarting(false)}})
    return ()=>{live=false}
  },[revision,listSources,read])
  // Interleave ranked lists so a large library cannot crowd out a smaller one.
  const items:T[]=[]
  const count=Math.max(0,...sources.map(s=>s.items.length))
  for(let index=0;index<count;index++)for(const source of sources)if(source.items[index])items.push(source.items[index])
  return {items,sources,busy:starting||sources.some(s=>s.pending),error,retry:(id:string)=>retry.current(id)}
}

export function useExploreSources(revision:number){
  return useSourceShelves<Recommendation>(revision,api.exploreSources,api.explore)
}
