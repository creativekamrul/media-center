import {useEffect} from 'react';
import {AppState} from 'react-native';import {router} from 'expo-router';
import {sharedContent,message} from './library';import {useApp} from './AppState';
/** Receive a share without fetching it or changing playback until the user chooses a source. */
export function SharedReceiver({ready}:{ready:boolean}){const {setNotice}=useApp();useEffect(()=>{if(!ready)return;let live=true;const receive=()=>void sharedContent.take().then(p=>{if(!live)return;if(p.error){setNotice(p.error);return}if(p.kind&&p.value)router.push({pathname:'/shared',params:{kind:p.kind,value:p.value,account:'',received:String(Date.now())}})}).catch(e=>{if(live)setNotice(message(e))});const share=sharedContent.listen(receive),focus=AppState.addEventListener('change',s=>{if(s==='active')receive()});receive();return()=>{live=false;share.remove();focus.remove()}},[ready,setNotice]);return null}
