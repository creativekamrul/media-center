import {useEffect} from 'react';
import {AppState} from 'react-native';
import {useApp} from './AppState';
import {mixSnapshots,listeningHistory} from './library';
import {readMixRecipes} from './mixRules';
import {readMixSource} from './mixLibrary';
import {refreshSavedMixes} from './mixRefreshPlan';
/** Delayed, foreground-only refresh: native storage keeps snapshots separate from appearance preferences. */
export function MixRefresh(){const app=useApp();const recipes=JSON.stringify(readMixRecipes(app.prefs.mixRecipes)),accounts=JSON.stringify(app.connections.map(a=>({id:a.id,type:a.type}))),likes=JSON.stringify(app.prefs.likes);
 useEffect(()=>{let live=true,busy=false,epoch=0;const definitions=readMixRecipes(JSON.parse(recipes));if(!definitions.some(r=>r.refresh!=='manual'))return;
 const run=async()=>{if(!live||busy||AppState.currentState!=='active')return;busy=true;const token=epoch;const cancelled=()=>!live||token!==epoch||AppState.currentState!=='active';try{const state=await mixSnapshots.status();if(cancelled()||!state.items.some(s=>s.due))return;const history=await listeningHistory('most');await refreshSavedMixes(definitions,state.items,async id=>{const a=JSON.parse(accounts).find((s:{id:string})=>s.id===id);if(id!=='device'&&!a)throw Error('A selected source is disconnected');const result=await readMixSource(a,()=>{},cancelled);return result.tracks},history,JSON.parse(likes),cancelled,mixSnapshots.commit,mixSnapshots.failed)}catch{/* Keep prior snapshots; providers report their own connection state. */}finally{busy=false}};
 const initial=setTimeout(()=>void run(),15000),timer=setInterval(()=>void run(),60000);const sub=AppState.addEventListener('change',state=>{if(state!=='active')epoch++});return()=>{live=false;epoch++;clearTimeout(initial);clearInterval(timer);sub.remove()};
 },[recipes,accounts,likes]);return null;
}
