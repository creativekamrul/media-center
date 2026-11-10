import {useEffect} from 'react';
import {AppState} from 'react-native';
import {podcastInbox} from './library';

/** Rules are opt-in. Only check while the app is active; no Android background-scheduling claim. */
export function PodcastInboxChecks(){useEffect(()=>{const check=()=>{if(AppState.currentState==='active')void podcastInbox.call('check').catch(()=>{})};check();const timer=setInterval(check,60000);const sub=AppState.addEventListener('change',state=>{if(state==='active')check();else void podcastInbox.call('stop').catch(()=>{})});return()=>{clearInterval(timer);sub.remove();void podcastInbox.call('stop').catch(()=>{})}},[]);return null}
