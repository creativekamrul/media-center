import {useEffect,useRef,useState,useCallback} from 'react';
import {type Page,appendPage} from './paging';
import {message} from './library';
export function useInfinite<T>(key:string,fetchPage:(offset:number)=>Promise<Page<T>>){
 const [items,setItems]=useState<T[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[more,setMore]=useState(true);
 const generation=useRef(0),offset=useRef<number|null>(0),inFlight=useRef(false),loader=useRef(fetchPage);
 useEffect(()=>{loader.current=fetchPage},[fetchPage]);
 const load=useCallback(async()=>{if(inFlight.current||offset.current===null)return;const token=generation.current,start=offset.current;inFlight.current=true;setBusy(true);setError('');try{const page=await loader.current(start);if(token!==generation.current)return;setItems(old=>appendPage(old,page));offset.current=page.next;setMore(page.next!==null)}catch(e){if(token===generation.current)setError(message(e))}finally{if(token===generation.current){inFlight.current=false;setBusy(false)}}},[]);
 // The query key identifies a new external result set; discard the previous rows.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{const token=++generation.current;offset.current=0;inFlight.current=false;setItems([]);setMore(true);setError('');void load();return()=>{generation.current=token+1}},[key,load]);
 return {items,busy,error,more,load:()=>{if(!error)void load()},retry:load};
}
