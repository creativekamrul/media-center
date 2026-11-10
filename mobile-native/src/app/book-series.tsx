import React,{useState} from 'react';
import {ActivityIndicator,FlatList,Pressable,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Shell} from '../Shell';import {useApp,usePalette} from '../AppState';
import {T,Button,layout} from '../ui';import {RemoteArt} from '../RemoteLibrary';import {LoadingContent} from '../LoadingContent';
import {bookSeries,spoken,message,type SeriesBook} from '../library';import {useInfinite} from '../useInfinite';

export default function BookSeriesScreen(){
 const params=useLocalSearchParams<{account:string;book:string;series:string;title?:string}>(),app=useApp(),c=usePalette();const [title,setTitle]=useState(params.title??'Audiobook series'),[total,setTotal]=useState(0),[starting,setStarting]=useState(false);
 const source=app.connections.find(a=>a.id===params.account);
 const list=useInfinite<SeriesBook>(JSON.stringify([params.account,params.book,params.series,app.refresh]),async offset=>{const result=await bookSeries(params.account,params.book,params.series,offset);setTitle(result.title);setTotal(result.total);return {items:result.items,next:result.items.length&&offset+result.items.length<result.total?offset+result.items.length:null}});
 // Unknown progress prevents suggesting a later book ahead of an uncertain one.
 const first=list.items.find(row=>!row.progressKnown||!row.finished),next=first?.progressKnown?first:undefined;
 const play=async(book:SeriesBook)=>{if(starting)return;setStarting(true);try{await spoken.play(params.account,'book',book.id);router.push('/player')}catch(e){app.setNotice(message(e))}finally{setStarting(false)}};
 const open=(book:SeriesBook)=>router.push({pathname:'/spoken',params:{account:params.account,id:book.id,kind:'book',title:book.title,cover:book.coverArt}});
 return <Shell title="Audiobook series"><FlatList data={list.items} keyExtractor={row=>row.id} initialNumToRender={12} windowSize={7} contentContainerStyle={[layout.page,{paddingBottom:190}]} onEndReached={list.load} onEndReachedThreshold={.6}
 ListHeaderComponent={<View style={{gap:16,marginBottom:12}}><View style={{gap:6}}><T muted>{source?.name??'Audiobookshelf'} · {total} books</T><T title>{title}</T><T muted>In your server’s series order. Open a book to see its chapters, or continue with the first unfinished book.</T></View>{next&&<View style={{gap:10,padding:18,borderRadius:18,backgroundColor:c.panel}}><T muted style={{fontSize:12}}>CONTINUE THIS SERIES</T><T strong>{next.sequence?'#'+next.sequence+' · ':''}{next.title}</T><Button primary icon="play" label={starting?'Opening book…':'Play / resume '+next.title} disabled={starting} onPress={()=>void play(next)}/></View>}</View>}
 renderItem={({item})=><Pressable accessibilityLabel={'Open series book '+item.title} onPress={()=>open(item)} style={[layout.row,{paddingVertical:12}]}><View style={{width:66,height:92,borderRadius:10,overflow:'hidden'}}><RemoteArt account={params.account} id={item.coverArt??item.id}/></View><View style={{flex:1,gap:5}}><T strong numberOfLines={2}>{item.title}</T><T muted numberOfLines={1}>{item.artist}</T><T muted style={{fontSize:12}}>{item.sequence?'Book '+item.sequence+' · ':''}{item.progressKnown?(item.finished?'Finished':'Unfinished'):'Progress unavailable'}{item.current?' · Current book':''}</T></View></Pressable>}
 ListEmptyComponent={list.busy?<LoadingContent rows columns={1}/>:undefined}
 ListFooterComponent={<View style={{gap:12,paddingVertical:18}}>{list.busy?<ActivityIndicator color={c.accent}/>:list.error?<><T>{list.error}</T><Button label="Retry series" onPress={()=>void list.retry()}/></>:!list.items.length?<T muted>No books available in this series.</T>:!list.more&&!next?<T muted>{first?'Check the server for the latest progress.':'You have finished every book in this series.'}</T>:null}</View>}/></Shell>
}
