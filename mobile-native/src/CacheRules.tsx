import {useEffect} from 'react';
import {AppState} from 'react-native';
import {offlineRules} from './library';
/** Native checks keep credentials, transfer policy and execution checkpoints outside React. */
export function CacheRules(){useEffect(()=>{let live=true,running=false;const check=async()=>{if(!live||running||AppState.currentState!=='active')return;running=true;try{await offlineRules.check()}catch{}finally{running=false}};const timer=setInterval(()=>void check(),60000);void check();const sub=AppState.addEventListener('change',state=>{if(state==='active')void check()});return()=>{live=false;clearInterval(timer);sub.remove()}},[]);return null;}
