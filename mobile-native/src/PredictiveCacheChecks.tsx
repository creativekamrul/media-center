import {useEffect,useRef} from 'react';
import {AppState as NativeAppState} from 'react-native';
import {useApp,usePlayer} from './AppState';import {useAppVisibility} from './useAppVisibility';import {downloads} from './library';

/** Off by default; native code rechecks queue identity, media type and Cache policy. */
export function PredictiveCacheChecks(){
 const app=useApp(),player=usePlayer(),foreground=useAppVisibility(),running=useRef(false),ahead=app.prefs.cacheAhead??0;
 useEffect(()=>{if(!ahead||!foreground||!player.loaded||!player.playing)return;let live=true;const check=()=>{if(!live||running.current||NativeAppState.currentState!=='active')return;running.current=true;void downloads.ahead().catch(()=>{}).finally(()=>{running.current=false})};check();const timer=setInterval(check,60000);return()=>{live=false;clearInterval(timer)}},[ahead,foreground,player.queueVersion,player.index,player.loaded,player.playing]);return null;
}
