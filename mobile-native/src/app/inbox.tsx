import React,{useState} from 'react';
import {FlatList,View,Pressable} from 'react-native';
import {router} from 'expo-router';
import {Shell} from '../Shell';
import {useApp} from '../AppState';
import {Button,T,layout} from '../ui';
import {RemoteArt} from '../RemoteLibrary';
import {browse,message} from '../library';
import {detectLibraryChanges,type InboxEntry,type LibrarySnapshot} from '../libraryInbox';
export default function Inbox(){const app=useApp(),[busy,setBusy]=useState(false);const entries=(Array.isArray(app.prefs.libraryInbox)?app.prefs.libraryInbox:[]) as InboxEntry[];
 async function refresh(){setBusy(true);const snapshots=(Array.isArray(app.prefs.librarySnapshots)?app.prefs.librarySnapshots:[]) as LibrarySnapshot[];const next=[...snapshots],added:InboxEntry[]=[];const warnings:string[]=[];
  for(const account of app.connections.filter(a=>['navidrome','downtify'].includes(a.type??'navidrome'))){try{const data=await browse(account.id,'getAlbumList2',{type:'newest',size:'100',offset:'0'});const result=detectLibraryChanges(snapshots.find(s=>s.account===account.id),account.id,data.albumList2?.album??[],Date.now());const i=next.findIndex(s=>s.account===account.id);if(i<0)next.push(result.snapshot);else next[i]=result.snapshot;added.push(...result.added)}catch(e){warnings.push(account.name+': '+message(e))}}
  app.setPrefs({librarySnapshots:next,libraryInbox:[...new Map([...added,...entries].map(e=>[e.key,e])).values()].slice(0,300)});app.setNotice(warnings.join('\n')||'Library check complete. The first check establishes a baseline.');setBusy(false);
 }
 return <Shell title="Library inbox"><FlatList data={entries} keyExtractor={e=>e.key} contentContainerStyle={[layout.page,{paddingBottom:180}]} ListHeaderComponent={<View style={{gap:12,marginBottom:20}}><T title>New in your music libraries</T><T muted>Changes among the newest 100 albums per saved music source, compared with your previous check. Discovery downloads appear here after they reach your saved library.</T><Button label={busy?'Checking…':'Check libraries'} disabled={busy} onPress={()=>void refresh()}/><Button label="Mark all seen" disabled={busy||!entries.length} onPress={()=>app.setPrefs({libraryInbox:[]})}/></View>} ListEmptyComponent={<T muted>No unseen additions.</T>} renderItem={({item})=><Pressable onPress={()=>router.push({pathname:'/detail',params:{account:item.account,id:item.id,kind:'album',title:item.title,cover:item.coverArt??''}})} style={[layout.row,{paddingVertical:12}]}><View style={{width:60,height:60,borderRadius:10,overflow:'hidden'}}><RemoteArt account={item.account} id={item.coverArt||item.id}/></View><View style={{flex:1}}><T strong>{item.title}</T><T muted>{app.connections.find(a=>a.id===item.account)?.name}</T></View></Pressable>}/></Shell>;
}
