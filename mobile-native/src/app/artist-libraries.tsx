import React,{useEffect,useState} from 'react';
import {View,ScrollView,Pressable,ActivityIndicator} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Shell} from '../Shell';import {useApp,usePalette} from '../AppState';
import {T,Button} from '../ui';import {RemoteArt} from '../RemoteLibrary';
import {browse,jellyfin,message,type Account,type Entry} from '../library';import {matchingArtists} from '../artistIdentity';
type Result={account:Account;artist:Entry;albums:Entry[]};
export default function ArtistLibraries(){const {name=''}=useLocalSearchParams<{name:string}>(),app=useApp(),c=usePalette();const [rows,setRows]=useState<Result[]>([]),[warnings,setWarnings]=useState<string[]>([]),[busy,setBusy]=useState(true);
 useEffect(()=>{let live=true;setBusy(true);setRows([]);setWarnings([]);
  void Promise.allSettled(app.connections.filter(a=>a.type!=='audiobookshelf').map(async account=>{
   try{const isJelly=account.type==='jellyfin';const found=isJelly?(await jellyfin.browse(account.id,'search',name)).items?.filter(t=>t.kind==='artist')??[]:(await browse(account.id,'search3',{query:name,artistCount:'100',songCount:'0',albumCount:'0'})).searchResult3?.artist??[];
    const results:Result[]=[];for(const artist of matchingArtists<Entry>(found,name)){const albums=isJelly?(await jellyfin.browse(account.id,'artist-albums',artist.id)).items??[]:(await browse(account.id,'getArtist',{id:artist.id})).artist?.album??[];results.push({account,artist,albums})}
    if(live)setRows(current=>[...current,...results]);
   }catch(e){if(live)setWarnings(current=>[...current,account.name+': '+message(e)])}
  })).finally(()=>{if(live)setBusy(false)});return()=>{live=false};
 },[name,app.connections]);
 const open=(r:Result,entry:Entry,kind:string)=>router.push({pathname:r.account.type==='jellyfin'?'/jellyfin':'/detail',params:{account:r.account.id,id:entry.id,kind,title:entry.title??entry.name??name,cover:entry.coverArt??''}});
 return <Shell title={name}><ScrollView contentContainerStyle={{padding:20,paddingBottom:180,gap:24}}><T title>{name}</T><T muted>Across your saved music libraries. Matching names are shown together; each source keeps its own identity and releases.</T>{busy&&<ActivityIndicator color={c.accent}/>} {!busy&&!rows.length&&<T muted>No matching artist profiles in connected libraries.</T>}{rows.map(r=><View key={JSON.stringify([r.account.id,r.artist.id])} style={{gap:14}}><T strong>{r.account.name}</T><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:14}}>{r.albums.slice(0,12).map(album=><Pressable key={album.id} onPress={()=>open(r,album,'album')} style={{width:150,gap:8}}><View style={{width:150,height:150,borderRadius:12,overflow:'hidden'}}><RemoteArt account={r.account.id} id={album.coverArt}/></View><T strong numberOfLines={2}>{album.name??album.title}</T></Pressable>)}</ScrollView><Button label={'View artist in '+r.account.name} onPress={()=>open(r,r.artist,'artist')}/></View>)}{warnings.map((w,i)=><T muted key={i}>{w}</T>)}</ScrollView></Shell>;
}
