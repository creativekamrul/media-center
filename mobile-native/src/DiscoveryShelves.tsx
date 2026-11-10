import React,{useEffect,useState} from 'react';
import {View,FlatList,Pressable} from 'react-native';
import {router} from 'expo-router';
import {useApp} from './AppState';
import {T} from './ui';
import {RemoteArt} from './RemoteLibrary';
import {spoken,jellyfin,listeningHistory,type Entry} from './library';
type Discovery=Entry&{kind:string};
type Shelf={key:string;account:string;source:string;title:string;items:Discovery[];jellyfin:boolean};
export function DiscoveryShelves({home=false}:{home?:boolean}){const app=useApp(),[shelves,setShelves]=useState<Shelf[]>([]);const key=app.connections.map(a=>a.id).join('|');
 useEffect(()=>{let live=true;
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setShelves([]);
 const add=(s:Shelf)=>{if(live&&s.items.length)setShelves(v=>[...v,s])};
 app.connections.forEach(async a=>{try{if(a.type==='jellyfin'){
 await Promise.allSettled((home?['resume']:['resume','suggested']).map(async mode=>{const r=await jellyfin.browse(a.id,mode);add({key:a.id+mode,account:a.id,source:a.name,title:mode==='resume'?'Continue watching':'Unwatched & unheard',items:r.items??[],jellyfin:true})}));
 }else if(a.type==='audiobookshelf'&&!home){
 const [libs,history]=await Promise.all([spoken.browse(a.id,'libraries'),listeningHistory('most').catch(()=>[])]);
 const authors=new Set(history.filter(t=>t.account===a.id).map(t=>t.artist?.toLowerCase()).filter(Boolean));
 await Promise.allSettled((libs.items??[]).map(async lib=>{const r=await spoken.browse(a.id,'items',lib.id);const rows=r.items??[];const familiar=rows.filter(i=>authors.has((i.artist??'').toLowerCase()));add({key:a.id+lib.id,account:a.id,source:a.name,title:familiar.length?'More from authors you listen to':lib.title,items:(familiar.length?familiar:rows).slice(0,16),jellyfin:false})}));
 }}catch{/* Independent sources: never replace working shelves with a global error. */}});return()=>{live=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,app.refresh,home]);
 return <>{shelves.map(s=><View key={s.key} style={{gap:14}}><T title style={{fontSize:23,lineHeight:30}}>{s.title}</T><T muted style={{fontSize:12}}>{s.source}</T><FlatList horizontal data={s.items} keyExtractor={i=>i.id} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3} getItemLayout={(_,index)=>({length:164,offset:164*index,index})} showsHorizontalScrollIndicator={false} ItemSeparatorComponent={()=><View style={{width:14}}/>} renderItem={({item:i})=><Pressable key={i.id} onPress={()=>router.push({pathname:s.jellyfin?'/jellyfin':'/spoken',params:{account:s.account,id:i.id,title:i.title??'',kind:i.kind}})} style={{width:150,gap:8}}><View style={{height:['movie','series','book'].includes(i.kind)?210:150,borderRadius:14,overflow:'hidden'}}><RemoteArt account={s.account} id={i.coverArt||i.id}/></View><T strong numberOfLines={2}>{i.title}</T><T muted numberOfLines={1} style={{fontSize:12}}>{i.artist}</T></Pressable>}/></View>)}</>;
}
