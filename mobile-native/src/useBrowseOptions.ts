import {useEffect,useRef,useState} from 'react';
import {useApp} from './AppState';
// Persist only small view options; media rows remain in bounded read caches.
export function useBrowseOptions<T extends object>(key:string,defaults:T){
 const app=useApp(),save=app.setPrefs;const views=useRef(app.prefs.browseViews);useEffect(()=>{views.current=app.prefs.browseViews},[app.prefs.browseViews]);
 const [value,setValue]=useState<T>(()=>({...defaults,...(app.prefs.browseViews as Record<string,T>|undefined)?.[key]}));
 useEffect(()=>{const timer=setTimeout(()=>{const previous=Object.entries((views.current as Record<string,T>)??{}).filter(([id])=>id!==key);save({browseViews:Object.fromEntries([...previous,[key,value]].slice(-30))})},500);return()=>clearTimeout(timer)},[key,value,save]);
 return [value,setValue] as const;
}
