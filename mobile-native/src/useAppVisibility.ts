import {useEffect,useState} from 'react';
import {AppState} from 'react-native';
/** Native services own background work; hidden React screens should not keep polling them. */
export function useAppVisibility(){const [active,setActive]=useState(AppState.currentState==null||AppState.currentState==='active');useEffect(()=>{const sub=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>sub.remove()},[]);return active;}
