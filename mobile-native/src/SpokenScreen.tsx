import {LoadingContent} from './LoadingContent';
import {useBrowseOptions} from './useBrowseOptions';
import {matchesText} from './contentTools';
import {ActionSheet,type MediaAction} from './ActionSheet';
import {TrackSort} from './TrackSort';
import {orderTracks,type TrackSort as Sort} from './trackOrdering';
import React,{useState} from 'react';

import {View,FlatList,Pressable,TextInput,ActivityIndicator,Alert,useWindowDimensions} from 'react-native';

import {router,useLocalSearchParams} from 'expo-router';

import {MediaHero} from './MediaHero';
import {togglePin} from './pins';
import {Shell} from './Shell';import {useApp,usePalette} from './AppState';

import {T,Button,IconButton,layout} from './ui';import {RemoteArt} from './RemoteLibrary';

import {spoken,message,type SpokenEntry} from './library';import {useInfinite} from './useInfinite';import {time} from './catalog';

export function SpokenScreen({root=false,collection=false}:{root?:boolean;collection?:boolean}){

 const {width}=useWindowDimensions();const columns=width>=1000?5:width>=700?4:width>=500?3:2;const app=useApp(),c=usePalette(),params=useLocalSearchParams<{account:string;kind:string;id:string;title:string;cover?:string}>();

 const account=root&&!collection?app.selected:app.connections.find(a=>a.id===params.account);

 const [sheet,setSheet]=useState<{title:string;items:MediaAction[]}|null>(null);
 const [options,setOptions]=useBrowseOptions('spoken:'+JSON.stringify([account?.id,params.kind,params.id]),{query:'',sort:'original' as Sort});const {query,sort}=options;const setQuery=(query:string)=>setOptions(v=>({...v,query}));const setSort=(sort:Sort)=>setOptions(v=>({...v,sort}));
 const [info,setInfo]=useState<Awaited<ReturnType<typeof spoken.browse>>>();

 const key=JSON.stringify([account?.id,root,params.kind,params.id,app.refresh]);

 const list=useInfinite<SpokenEntry>(key,async offset=>{

  if(!account)return {items:[],next:null};

  const result=await spoken.browse(account.id,root?'libraries':params.kind==='library'?'items':'detail',root?'':params.id,offset);setInfo(result);

  const rows=result.items??[];

  return {items:rows,next:params.kind==='library'&&offset+rows.length<(result.total??0)&&rows.length>0?offset+rows.length:null};

 });

 async function play(kind:'book'|'episode',id:string,episode='',start=-1){if(!account)return;try{await spoken.play(account.id,kind,id,episode,start);router.push('/player')}catch(e){app.setNotice(message(e))}}

 function open(item:SpokenEntry){if(item.kind==='episode'){void play('episode',item.showId!,item.id);return};router.push({pathname:'/spoken',params:{account:account!.id,kind:item.kind,id:item.id,title:item.title,cover:item.coverArt}})}

 const grid=params.kind==='library';
 const detail=!root&&['book','show'].includes(params.kind);
 function actions(item:SpokenEntry){setSheet({title:item.title,items:[{label:'Details',icon:'book',run:()=>item.kind==='episode'?Alert.alert(item.title,[account!.name,item.artist,item.duration?time(item.duration):''].filter(Boolean).join(' · ')):open(item)},...(item.kind==='book'?[{label:'Play / resume book',icon:'play' as const,run:()=>void play('book',item.id)},{label:'Cache book',icon:'download' as const,run:()=>void spoken.cache(account!.id,'book',item.id).then(()=>app.setNotice('Added to Cache transfers')).catch(e=>app.setNotice(message(e)))}]:[]),...(['book','episode'].includes(item.kind)?[{label:'Play next',icon:'next' as const,run:()=>void spoken.enqueue(account!.id,item.kind as 'book'|'episode',item.kind==='episode'?item.showId!:item.id,item.kind==='episode'?item.id:'',item.title,true).then(()=>app.setNotice('Added next in the spoken queue')).catch(e=>app.setNotice(message(e)))},{label:'Add to queue',icon:'queue' as const,run:()=>void spoken.enqueue(account!.id,item.kind as 'book'|'episode',item.kind==='episode'?item.showId!:item.id,item.kind==='episode'?item.id:'',item.title).then(()=>app.setNotice('Added to spoken queue')).catch(e=>app.setNotice(message(e)))}]:[]),{label:'Pin / unpin in Library',icon:'pin',run:()=>app.setPrefs({pins:togglePin(app.prefs.pins??[],{account:account!.id,id:item.id,kind:item.kind,title:item.title,cover:item.coverArt,showId:item.showId,route:'/spoken'})})},...(item.kind==='episode'?[{label:'Cache episode on this phone',icon:'download' as const,run:()=>void spoken.cache(account!.id,'episode',item.showId!,item.id).then(()=>app.setNotice('Added to Cache transfers')).catch(e=>app.setNotice(message(e)))}]:[])]})}
 return <Shell artwork={detail} root={root&&!collection} title={root?(account?.name??'Library'):params.title??'Library'}><FlatList key={grid?'grid-'+columns:'list'} numColumns={grid?columns:1} columnWrapperStyle={grid?{gap:16}:undefined} data={(params.kind==='show'?orderTracks(list.items,sort):list.items).filter(t=>matchesText(t,query))} keyExtractor={item=>item.kind+':'+item.id} contentContainerStyle={[layout.page,{paddingBottom:190}]} onEndReached={list.load} onEndReachedThreshold={.6} initialNumToRender={16} windowSize={7}

 ListHeaderComponent={detail&&account?<View style={{gap:18,marginBottom:20}}><MediaHero account={account.id} cover={info?.coverArt??params.cover} title={info?.title??params.title} eyebrow={(params.kind==='book'?'Audiobook':'Podcast')+' · '+account.name} subtitle={info?.artist} shape={params.kind==='book'?'portrait':'square'} pin={{account:account.id,id:params.id,kind:params.kind,title:info?.title??params.title,cover:info?.coverArt??params.cover,route:'/spoken'}}>{params.kind==='show'&&<Button icon="queue" label="Follow in Podcast inbox" onPress={()=>router.push({pathname:'/podcast-inbox',params:{account:account.id,show:params.id,title:info?.title??params.title}})}/>} {params.kind==='book'&&<Button primary icon="play" label="Play / resume book" disabled={list.busy} onPress={()=>void play('book',params.id)}/>} {params.kind==='book'&&<Button icon="queue" label="Add to spoken queue" onPress={()=>void spoken.enqueue(account.id,'book',params.id,'',info?.title??params.title).then(()=>app.setNotice('Added to spoken queue')).catch(e=>app.setNotice(message(e)))}/>}{params.kind==='book'&&<Button icon="download" label="Cache book" onPress={()=>void spoken.cache(account.id,'book',params.id).then(()=>app.setNotice('Added to Cache transfers')).catch(e=>app.setNotice(message(e)))}/>}</MediaHero>{params.kind==='book'&&info?.series?.map(series=><Button key={series.id} icon="book" label={'Series · '+series.title+(series.sequence?' · #'+series.sequence:'')} onPress={()=>router.push({pathname:'/book-series',params:{account:account.id,book:params.id,series:series.id,title:series.title}})}/>)}<T title style={{fontSize:21}}>{params.kind==='book'?'Chapters':'Episodes'}</T><TextInput accessibilityLabel="Search episodes or chapters" placeholder="Search episodes or chapters" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} style={{padding:14,color:c.text,backgroundColor:c.panel,borderRadius:12,fontFamily:'DMSans_400Regular'}}/>{params.kind==='show'&&<><TrackSort value={sort} onChange={setSort} count={list.items.length}/>{list.items.length>1&&<Button label="Play visible episodes" icon="play" onPress={()=>{const entries=orderTracks(list.items,sort).filter(t=>t.kind==='episode'&&matchesText(t,query));if(!entries.length)return;void spoken.queue(entries.map(t=>({account:account.id,kind:'episode',item:t.showId!,episode:t.id,title:t.title}))).then(()=>router.push('/player')).catch(e=>app.setNotice(message(e)))}}/>}</>} {info?.chapters?.filter(chapter=>matchesText(chapter,query)).map((chapter,index)=><Pressable accessibilityLabel={"Play chapter "+chapter.title} onPress={()=>void play('book',params.id,'',chapter.start)} key={index} style={[layout.row,{paddingVertical:8}]}><T muted style={{width:24}}>{index+1}</T><T style={{flex:1}}>{chapter.title}</T><T muted>{time(chapter.start)}</T></Pressable>)}</View>:undefined}

 renderItem={({item})=><Pressable accessibilityLabel={'Open '+item.title} onPress={()=>open(item)} onLongPress={()=>actions(item)} style={grid?{flex:1,maxWidth:`${100/columns-2}%`,gap:8,paddingBottom:20}:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:12}}>{item.coverArt&&<View style={grid?{width:'100%',aspectRatio:item.kind==='book'?2/3:1,borderRadius:14,overflow:'hidden'}:{width:64,height:64,borderRadius:10,overflow:'hidden'}}><RemoteArt account={account!.id} id={item.coverArt||item.id}/></View>}<View style={{flex:1,gap:4}}><T strong numberOfLines={2}>{item.title}</T><T muted>{item.artist??(item.kind==='show'?'Podcast show':item.kind==='library'?'Browse library':'')}{item.duration?' · '+time(item.duration):''}</T></View>{item.kind==='episode'&&<IconButton icon="menu" label={"Actions for "+item.title} onPress={()=>actions(item)}/>}</Pressable>}

 ListEmptyComponent={list.busy?<LoadingContent rows={!grid} columns={columns}/>:undefined}
 ListFooterComponent={<View style={{paddingVertical:20,gap:12}}>{list.busy?<ActivityIndicator color={c.accent}/>:list.error?<><T>{list.error}</T><Button label="Retry" onPress={()=>void list.retry()}/></>:!list.items.length&&params.kind!=='book'?<T muted>No items in this library.</T>:null}</View>}/>{sheet&&<ActionSheet title={sheet.title} actions={sheet.items} onClose={()=>setSheet(null)}/>}</Shell>

}

