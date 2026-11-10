import {LoadingContent} from './LoadingContent';
import {startLibraryRadio,startArtistRadio,radioNotice} from './radioMix';
import {matchesText} from './contentTools';
import {readPlaylists,putPlaylist} from './personalPlaylists';
import {ActionSheet,type MediaAction} from './ActionSheet';
import {TrackSort} from './TrackSort';
import {orderTracks,type TrackSort as Sort} from './trackOrdering';
import React,{useState,useRef,useEffect} from 'react';

import {View,FlatList,Pressable,TextInput,ActivityIndicator,Alert,useWindowDimensions} from 'react-native';

import {router,useLocalSearchParams} from 'expo-router';

import {MediaHero} from './MediaHero';
import {togglePin,type Pin} from './pins';
import {Shell} from './Shell';

import {useApp,usePalette} from './AppState';

import {T,Button,IconButton,layout} from './ui';

import {browse,playback,downloads,type Entry,message} from './library';

import {RemoteArt} from './RemoteLibrary';

import {useInfinite} from './useInfinite';

import {slicePage,type Page} from './paging';

import {time} from './catalog';

import {SpokenScreen} from './SpokenScreen';

const browseMemory=new Map<string,{sort:Sort;query:string;search:string;y:number}>();
export function LibraryScreen(props:{mode?:string;detail?:boolean;collection?:boolean}){const app=useApp(),params=useLocalSearchParams<{account:string}>();const source=props.collection?app.connections.find(a=>a.id===params.account):app.selected;return !props.detail&&source?.type==='audiobookshelf'?<SpokenScreen root collection={props.collection}/>:<MusicLibraryScreen {...props}/>;}

function MusicLibraryScreen({mode='Library',detail=false,collection=false}:{mode?:string;detail?:boolean;collection?:boolean}){

 const {width}=useWindowDimensions();const columns=width>=1000?5:width>=700?4:width>=500?3:2;const app=useApp(),c=usePalette(),params=useLocalSearchParams<{account:string;kind:string;id:string;title:string;cover:string;view:string}>();const account=(detail||collection)?app.connections.find(a=>a.id===params.account):app.selected;

 const memoryKey=JSON.stringify([account?.id,params.kind,params.id,params.view,mode]);const historySnapshot=useRef(app.prefs.browseHistory);const savePrefs=app.setPrefs;const remembered=browseMemory.get(memoryKey)??(app.prefs.browseHistory as Record<string,{sort:Sort;query:string;search:string;y:number}>|undefined)?.[memoryKey];const scrollY=useRef(remembered?.y??0),restoreY=useRef(remembered?.y??0),listRef=useRef<FlatList<Entry>>(null);
 const [cached,setCached]=useState<string[]>([]);useEffect(()=>{let live=true;downloads.state().then(s=>{if(live)setCached(s.items.map(i=>i.key))}).catch(()=>{});return()=>{live=false}},[app.refresh]);
 const [sheet,setSheet]=useState<{title:string;items:MediaAction[]}|null>(null);
 const [sort,setSort]=useState<Sort>(remembered?.sort??'original');const [selected,setSelected]=useState<string[]>([]);
 const kind=params.view??'Albums';const [query,setQuery]=useState(remembered?.query??''),[search,setSearch]=useState(remembered?.search??'');

 useEffect(()=>{const previousHistory=historySnapshot.current;const save=()=>{browseMemory.delete(memoryKey);browseMemory.set(memoryKey,{sort,query,search,y:scrollY.current});if(browseMemory.size>30)browseMemory.delete(browseMemory.keys().next().value!)};save();return ()=>{save();savePrefs({browseHistory:Object.fromEntries([...Object.entries((previousHistory as Record<string,unknown>)??{}),...browseMemory].slice(-30))})}},[memoryKey,sort,query,search,savePrefs]);
 const effective=mode==='Search'?'Tracks':kind;const cache=useRef<{key:string;rows:Entry[]}|null>(null);

 const key=JSON.stringify([account?.id,params.kind,params.id,effective,search,app.refresh,mode,sort]);

 async function fetchPage(offset:number):Promise<Page<Entry>>{

  if(!account)return {items:[],next:null};let rows:Entry[]=[];

  if(detail||effective==='Artists'||effective==='Playlists'){

   if(cache.current?.key===key)return slicePage(cache.current.rows,offset);

   if(detail){const method=params.kind==='artist'?'getArtist':params.kind==='playlist'?'getPlaylist':'getAlbum';const r=await browse(account.id,method,{id:params.id});rows=params.kind==='artist'?r.artist?.album??[]:params.kind==='playlist'?r.playlist?.entry??[]:r.album?.song??[]}

   else if(effective==='Artists'){const r=await browse(account.id,'getArtists');rows=(r.artists?.index??[]).flatMap((i:any)=>i.artist??[])}else{const r=await browse(account.id,'getPlaylists');rows=r.playlists?.playlist??[]}

   rows=orderTracks(rows.filter(t=>matchesText(t,search)),sort);cache.current={key,rows};return slicePage(rows,offset)

  }

  if(effective==='Tracks'&&sort!=='original'){
   if(cache.current?.key===key)return slicePage(cache.current.rows,offset);
   // Sort the complete matching set, not each arriving page independently.
   for(let start=0;;){const r=await browse(account.id,'search3',{query:search,songCount:'40',songOffset:String(start),albumCount:'0',artistCount:'0'});const page:Entry[]=r.searchResult3?.song??[];rows.push(...page);if(page.length<40)break;start+=page.length;if(start>=50000)throw new Error('Narrow your search before sorting more than 50,000 tracks.');}
   rows=orderTracks(rows,sort);cache.current={key,rows};return slicePage(rows,offset);
  }
  if(effective==='Albums'&&search){const r=await browse(account.id,'search3',{query:search,songCount:'0',artistCount:'0',albumCount:'40',albumOffset:String(offset)});rows=r.searchResult3?.album??[]}
  else if(effective==='Albums'){const r=await browse(account.id,'getAlbumList2',{type:mode==='Home'?'newest':mode==='Explore'?'newest':'alphabeticalByName',size:'40',offset:String(offset)});rows=r.albumList2?.album??[]}

  else{const r=await browse(account.id,'search3',{query:search,songCount:'40',songOffset:String(offset),albumCount:'0',artistCount:'0'});rows=r.searchResult3?.song??[]}

  return {items:rows,next:rows.length===40?offset+rows.length:null}

 }

 const list=useInfinite(key,fetchPage);const tracks=detail?params.kind!=='artist':effective==='Tracks';

 async function play(index:number){if(!account)return;try{app.setNotice('Preparing playback...');await playback.play(account.id,(cache.current?.key===key?cache.current.rows:list.items).map(i=>i.id),index);app.setNotice('');router.push('/player')}catch(e){app.setNotice(message(e))}}

 function open(entry:Entry,index:number){if(selected.length&&tracks){setSelected(v=>v.includes(entry.id)?v.filter(x=>x!==entry.id):[...v,entry.id]);return}if(tracks){void play(index);return}router.push({pathname:'/detail',params:{account:account!.id,kind:detail?'album':effective==='Albums'?'album':effective==='Artists'?'artist':'playlist',id:entry.id,title:entry.title??entry.name??'',cover:entry.coverArt??''}})}

 function pinFor(entry:Entry,target:string):Pin{return {account:account!.id,id:entry.id,kind:target,title:entry.title??entry.name??'',cover:entry.coverArt,route:'/detail'}}
 function actions(entry:Entry,target:string){const pin=pinFor(entry,target);const run=(work:()=>Promise<unknown>,notice:string)=>void work().then(()=>app.setNotice(notice)).catch(e=>app.setNotice(message(e)));setSheet({title:pin.title,items:[{label:'Details',icon:'music',run:()=>Alert.alert(pin.title,[entry.artist,account!.name,target,entry.duration?time(entry.duration):''].filter(Boolean).join(' · '))},{label:'Pin / unpin in Library',icon:'pin',run:()=>app.setPrefs({pins:togglePin(app.prefs.pins??[],pin)})},...(['album','playlist'].includes(target)?[{label:'Play next',icon:'next' as const,run:()=>run(async()=>{const data=await browse(account!.id,target==='album'?'getAlbum':'getPlaylist',{id:entry.id});const rows:Entry[]=target==='album'?data.album?.song??[]:data.playlist?.entry??[];if(!rows.length)throw new Error('This collection has no tracks.');await playback.enqueue(account!.id,rows.map(t=>t.id),true)},'Added next')},{label:'Add to queue',icon:'queue' as const,run:()=>run(async()=>{const data=await browse(account!.id,target==='album'?'getAlbum':'getPlaylist',{id:entry.id});const rows:Entry[]=target==='album'?data.album?.song??[]:data.playlist?.entry??[];if(!rows.length)throw new Error('This collection has no tracks.');await playback.enqueue(account!.id,rows.map(t=>t.id))},'Added to queue')},{label:'Cache collection',icon:'download' as const,run:()=>run(async()=>{const data=await browse(account!.id,target==='album'?'getAlbum':'getPlaylist',{id:entry.id});const rows:Entry[]=target==='album'?data.album?.song??[]:data.playlist?.entry??[];if(!rows.length)throw new Error('This collection has no tracks.');await downloads.save(account!.id,rows.map(t=>t.id),pin.title)},'Added to Cache transfers')}]:[]),...(target==='artist'?[{label:'Start artist radio',icon:'explore' as const,run:()=>{app.setNotice('Building artist radio…');void startArtistRadio(app.connections,account!.id,entry.id,app.prefs.recommendationFeedback).then(result=>{app.setNotice(radioNotice(result));router.push('/player')}).catch(e=>app.setNotice(message(e)))}}]:[]),...(target==='track'?[{label:'Start library radio',run:()=>{app.setNotice('Building artist radio…');void startLibraryRadio(app.connections,account!.id,entry,app.prefs.recommendationFeedback).then(result=>{app.setNotice(radioNotice(result));router.push('/player')}).catch(e=>app.setNotice(message(e)))}},{label:'Select track',run:()=>setSelected(v=>v.includes(entry.id)?v:[...v,entry.id])},{label:'Play next',icon:'next' as const,run:()=>run(()=>playback.enqueue(account!.id,[entry.id],true),'Added next')},{label:'Add to queue',icon:'queue' as const,run:()=>run(()=>playback.enqueue(account!.id,[entry.id]),'Added to queue')},{label:'Cache this track',icon:'download' as const,run:()=>run(()=>downloads.save(account!.id,[entry.id],pin.title),'Added to Cache transfers')}]:[])]})}

 return <Shell artwork={detail} title={collection?(account?.name??params.title)+' · '+effective:detail?params.title:mode} root={!detail&&!collection}>{!account?<View style={layout.page}><T title>Your media, together.</T><T muted>Connect a server to start listening to your own library.</T><Button label="Add a connection" icon="plus" primary onPress={()=>router.push('/settings')}/></View>:<FlatList ref={listRef} onContentSizeChange={(_,height)=>{if(!restoreY.current||list.busy)return;if(height>restoreY.current+150||!list.more){const target=restoreY.current;restoreY.current=0;listRef.current?.scrollToOffset({offset:target,animated:false})}else list.load()}} onScroll={e=>{if(!restoreY.current)scrollY.current=e.nativeEvent.contentOffset.y}} scrollEventThrottle={100} key={tracks?'tracks':'cards-'+columns} data={list.items} numColumns={tracks?1:columns} keyExtractor={(item,index)=>item.id+':'+index} contentContainerStyle={{padding:20,paddingBottom:190,gap:12}} columnWrapperStyle={tracks?undefined:{gap:14}} initialNumToRender={16} maxToRenderPerBatch={12} windowSize={7} keyboardShouldPersistTaps="handled" onEndReached={list.load} onEndReachedThreshold={.7}

 ListHeaderComponent={<View style={{gap:18,marginBottom:18}}>{account.type!=='jellyfin'&&((detail&&params.kind==='playlist')||(!detail&&effective==='Playlists'))&&<Button label={detail?'Edit server playlist':'New server playlist'} onPress={()=>router.push({pathname:'/server-playlist',params:{account:account.id,...(detail?{id:params.id}:{})}})}/>}{detail&&<MediaHero account={account.id} cover={params.cover||list.items[0]?.coverArt} title={params.title} eyebrow={params.kind+' · '+account.name} subtitle={list.items[0]?.artist} shape={params.kind==='artist'?'circle':'square'} pin={{account:account.id,id:params.id,kind:params.kind,title:params.title,cover:params.cover||list.items[0]?.coverArt,route:'/detail'}}>{params.kind==='artist'&&<Button label="Across your libraries" onPress={()=>router.push({pathname:'/artist-libraries',params:{name:params.title}})}/>}{tracks&&<View style={[layout.row,{flexWrap:'wrap'}]}><Button label="Play" icon="play" primary disabled={!list.items.length} onPress={()=>void play(0)}/><Button label="Cache" icon="download" disabled={!list.items.length} onPress={()=>void downloads.save(account.id,(cache.current?.rows??list.items).map(t=>t.id),params.title).then(()=>router.push('/downloads')).catch(e=>app.setNotice(message(e)))}/></View>}</MediaHero>}{<View style={layout.row}><TextInput accessibilityLabel="Search your music" value={query} onChangeText={setQuery} onSubmitEditing={()=>{setSelected([]);setSearch(query.trim())}} returnKeyType="search" placeholder={detail?"Search this collection":"Search this library"} placeholderTextColor={c.muted} style={{flex:1,backgroundColor:c.panel,color:c.text,padding:14,borderRadius:12,fontFamily:'DMSans_400Regular'}}/><IconButton icon="search" label="Search" onPress={()=>{setSelected([]);setSearch(query.trim())}}/></View>}{tracks&&<TrackSort value={sort} onChange={setSort} count={list.items.length}/>}{!!selected.length&&<View style={{gap:12}}><T strong>{selected.length} selected</T><View style={[layout.row,{flexWrap:'wrap'}]}><Button label="Clear selection" onPress={()=>setSelected([])}/><Button label="Select loaded tracks" onPress={()=>setSelected(list.items.map(t=>t.id))}/><Button label="Queue selected" onPress={()=>void playback.enqueue(account.id,selected).then(()=>setSelected([])).catch(e=>app.setNotice(message(e)))}/><Button label="Cache selected" onPress={()=>void downloads.save(account.id,selected,params.title||'Selected tracks').then(()=>setSelected([])).catch(e=>app.setNotice(message(e)))}/><Button label="Save selection as playlist" onPress={()=>{const rows=(cache.current?.rows??list.items).filter(t=>selected.includes(t.id)).map(t=>({...t,account:account.id}));try{app.setPrefs({personalPlaylists:putPlaylist(readPlaylists(app.prefs.personalPlaylists),{id:'selection-'+Date.now(),name:params.title||'Selected tracks',tracks:rows,updated:Date.now()})});setSelected([]);app.setNotice('Saved to App playlists.')}catch(e){app.setNotice(message(e))}}}/></View></View>}</View>}

 renderItem={({item,index})=><Pressable accessibilityRole="button" accessibilityLabel={'Open '+(item.title??item.name)} onPress={()=>open(item,index)} onLongPress={()=>actions(item,tracks?'track':detail?'album':effective==='Artists'?'artist':effective==='Playlists'?'playlist':'album')} style={tracks?{flexDirection:'row',alignItems:'center',gap:12,minHeight:66,backgroundColor:selected.includes(item.id)?c.accent+'22':undefined,borderRadius:10}:{flex:1,maxWidth:`${100/columns-2}%`,gap:7,marginBottom:8}}><View style={tracks?{width:48,height:48,borderRadius:8,overflow:'hidden'}:{width:'100%',aspectRatio:1,borderRadius:12,overflow:'hidden'}}><RemoteArt account={account.id} id={item.coverArt||item.id}/></View><View style={tracks?{flex:1}:undefined}><T strong numberOfLines={tracks?1:2}>{item.title??item.name}</T><T muted numberOfLines={1} style={{fontSize:12}}>{item.artist??(item.songCount!==undefined?item.songCount+' tracks':'')}</T></View>{tracks&&cached.includes(account.id+':'+item.id)&&<IconButton icon="download" label="Available offline" onPress={()=>app.setNotice('Cached on this device. Playback uses this copy when available.')}/>} {tracks&&<IconButton icon="menu" label={'Actions for '+(item.title??item.name)} onPress={()=>actions(item,'track')}/>} {tracks&&<T muted style={{fontSize:12}}>{time(item.duration??0)}</T>}</Pressable>}

 ListEmptyComponent={list.busy?<LoadingContent rows={tracks} columns={columns}/>:undefined}
 ListFooterComponent={<View style={{paddingVertical:20,gap:12}}>{list.busy?<ActivityIndicator color={c.accent}/>:list.error?<><T>{list.error}</T><Button label="Retry loading" onPress={()=>void list.retry()}/></>:!list.items.length?<T muted>No results in this view.</T>:!list.more?<T muted style={{textAlign:'center'}}>{list.items.length} {list.items.length===1?'item':'items'}</T>:null}</View>}/>}{sheet&&<ActionSheet title={sheet.title} actions={sheet.items} onClose={()=>setSheet(null)}/>}</Shell>

}

