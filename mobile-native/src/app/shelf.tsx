import React,{useEffect,useState,useRef} from 'react';
import {FlatList,View,Pressable,ActivityIndicator} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {useApp,usePalette} from '../AppState';
import {Shell} from '../Shell';import {T,Button} from '../ui';import {RemoteArt} from '../RemoteLibrary';
import {homeItems} from '../homeShelves';import {playback,message,type Entry} from '../library';
export default function Shelf(){const p=useLocalSearchParams<{account:string;title:string;kind:string}>(),app=useApp(),c=usePalette();const account=app.connections.find(a=>a.id===p.account);const [items,setItems]=useState<Entry[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');const more=useRef(true),loading=useRef(false),offset=useRef(0);
 const load=async()=>{if(!account||loading.current||!more.current)return;loading.current=true;setBusy(true);setError('');try{const r=await homeItems(account,p.title,app.prefs.likes,offset.current);offset.current+=r.items.length;more.current=r.more;setItems(v=>[...v,...r.items])}catch(e){setError(message(e))}finally{loading.current=false;setBusy(false)}};
 // Route identities are fixed for this mounted shelf.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 useEffect(()=>{void load()},[]);
 const open=(item:Entry,index:number)=>{if(p.kind==='track'){void playback.play(p.account,items.map(x=>x.id),index).then(()=>router.push('/player')).catch(e=>app.setNotice(message(e)));return}router.push({pathname:'/detail',params:{account:p.account,kind:p.kind,id:item.id,title:item.title??item.name??'',cover:item.coverArt??''}})};
 return <Shell title={p.title}><FlatList data={items} keyExtractor={(x,i)=>x.id+':'+i} initialNumToRender={12} windowSize={5} onEndReached={()=>void load()} onEndReachedThreshold={.5} contentContainerStyle={{padding:20,paddingBottom:150,gap:8}} ListHeaderComponent={<T muted>{account?.name}</T>} renderItem={({item,index})=><Pressable onPress={()=>open(item,index)} style={{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:8}}><View style={{width:56,height:56,borderRadius:10,overflow:'hidden'}}><RemoteArt account={p.account} id={item.coverArt||item.id}/></View><View style={{flex:1}}><T strong numberOfLines={2}>{item.title??item.name}</T><T muted numberOfLines={1}>{item.artist}</T></View></Pressable>} ListFooterComponent={busy?<ActivityIndicator color={c.accent}/>:error?<View><T>{error}</T><Button label="Retry" onPress={()=>void load()}/></View>:!items.length?<T muted>No items yet.</T>:undefined}/></Shell>
}
