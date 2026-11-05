import {useState,type Dispatch,type SetStateAction} from 'react'
// Session-only UI state: never persist credentials or fetched library records.
const values=new Map<string,unknown>()
export const hasBrowseState=(key:string)=>values.has(key)
export function useBrowseState<T>(key:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
 const [,refresh]=useState(0)
 const value=values.has(key)?values.get(key) as T:initial
 const setValue:Dispatch<SetStateAction<T>>=next=>{
  const previous=values.has(key)?values.get(key) as T:initial
  values.set(key,typeof next==='function'?(next as (value:T)=>T)(previous):next)
  if(values.size>200)values.delete(values.keys().next().value!)
  refresh(n=>n+1)
 }
 return [value,setValue]
}
