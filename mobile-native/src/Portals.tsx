import {LoadingContent} from './LoadingContent';
import {homeItems} from './homeShelves';
import {homeContentKind} from './homeContent';
import React,{useEffect,useState} from 'react';

import {View,FlatList,Pressable,ActivityIndicator} from 'react-native';

import {router} from 'expo-router';

import {LinearGradient} from 'expo-linear-gradient';

import {DiscoveryShelves} from './DiscoveryShelves';
import {Shell} from './Shell';import {useApp,usePalette} from './AppState';import {T,IconButton,layout} from './ui';import {Icon} from './Icon';import {RemoteArt} from './RemoteLibrary';import {spoken,playback,message,type Entry,type Account} from './library';

export const HOME_SECTIONS=['Recently added','Recently played','Favorites','Most played','Playlists'];

type Shelf={key:string;title:string;account:Account;kind:'album'|'playlist'|'track'|'book'|'show';items:Entry[]};

function open(account:Account,rawKind:unknown,item:Entry,onError:(s:string)=>void){let kind:Shelf['kind'];try{kind=homeContentKind(account.type??'navidrome',rawKind)}catch(e){onError(message(e));return}if(kind==='track'){void playback.play(account.id,[item.id]).then(()=>router.push('/player')).catch(e=>onError(message(e)));return}router.push(kind==='book'||kind==='show'?{pathname:'/spoken',params:{account:account.id,kind,id:item.id,title:item.title??item.name??''}}:{pathname:'/detail',params:{account:account.id,kind,id:item.id,title:item.title??item.name??'',cover:item.coverArt??''}})}

export function Landing({explore=false}:{explore?:boolean}){

 const app=useApp(),c=usePalette();const [shelves,setShelves]=useState<Shelf[]>([]),[pending,setPending]=useState(0);const sections=app.prefs.homeSections??HOME_SECTIONS;

 const connectionKey=app.connections.map(a=>a.id).join('|');

 useEffect(()=>{let live=true;const jobs:{account:Account;title:string;kind:Shelf['kind'];load:()=>Promise<Entry[]>}[]=[];

 for(const account of app.connections){if(account.type==='jellyfin')continue;if(account.type==='audiobookshelf'){jobs.push({account,title:'Books & podcasts',kind:'book',load:async()=>{const libs=(await spoken.browse(account.id,'libraries')).items??[];const batches=await Promise.allSettled(libs.map(l=>spoken.browse(account.id,'items',l.id)));return batches.flatMap(r=>r.status==='fulfilled'?(r.value.items??[]).map(i=>({...i,name:i.title})):[]).slice(0,16)}});continue}

 const types=explore?['Rediscover','Recently added']:sections;

 for(const title of types)jobs.push({account,title,kind:['Favorites','Most played','Recently played'].includes(title)?'track':title==='Playlists'?'playlist':'album',load:async()=>(await homeItems(account,title,app.prefs.likes)).items})}

 // A new source list starts independent requests; results render as each server finishes.

 // eslint-disable-next-line react-hooks/set-state-in-effect
 setShelves(old=>old.filter(s=>jobs.some(j=>j.account.id===s.account.id&&j.title===s.title)));setPending(jobs.length);jobs.forEach(job=>job.load().then(items=>{if(live&&items.length)setShelves(v=>{const next={...job,key:job.account.id+job.title,items};const index=v.findIndex(s=>s.key===next.key);return index<0?[...v,next]:v.map((s,i)=>i===index?next:s)})}).catch(()=>{}).finally(()=>{if(live)setPending(v=>v-1)}));return()=>{live=false};

 // Stable source identities and explicit refresh control network work, not the playback clock.

 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[connectionKey,app.refresh,explore,JSON.stringify(sections),JSON.stringify(app.prefs.likes)]);

 const ordered=shelves.filter(s=>app.health[s.account.id]!=='offline').sort((a,b)=>(sections.indexOf(a.title)<0?99:sections.indexOf(a.title))-(sections.indexOf(b.title)<0?99:sections.indexOf(b.title)));

 const featured=ordered.find(s=>s.items.length);const pick=featured?.items[0];
 return <Shell root title={explore?'Explore':'Home'}><FlatList data={ordered} keyExtractor={s=>s.key} initialNumToRender={2} windowSize={3} contentContainerStyle={{padding:20,paddingTop:12,paddingBottom:210,gap:20}} ListHeaderComponent={<View style={{gap:20}}>

 <View style={{gap:8}}><T muted style={{fontSize:11,letterSpacing:1.6}}>YOUR COLLECTION, AT A GLANCE</T><T title style={{fontSize:30,lineHeight:38}}>Back to your favorites.</T></View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{ordered.flatMap(s=>s.items.slice(0,2).map(item=>({s,item}))).slice(0,6).map(({s,item},i)=><Pressable key={s.key+item.id+i} onPress={()=>open(s.account,(item as any).kind??s.kind,item,app.setNotice)} style={{width:'48%',minHeight:56,backgroundColor:c.panel,borderRadius:12,flexDirection:'row',alignItems:'center',gap:9,overflow:'hidden'}}><View style={{width:50,height:56}}><RemoteArt account={s.account.id} id={item.coverArt||item.id}/></View><T strong numberOfLines={2} style={{flex:1,fontSize:12,paddingRight:8}}>{item.title??item.name}</T></Pressable>)}</View>
 {featured&&pick&&<Pressable accessibilityLabel={'Featured '+(pick.title??pick.name)} onPress={()=>open(featured.account,(pick as any).kind??featured.kind,pick,app.setNotice)}><LinearGradient colors={[c.panel,c.bg]} style={{padding:18,borderRadius:22,flexDirection:'row',gap:18,alignItems:'center'}}><View style={{width:104,height:104,borderRadius:15,overflow:'hidden'}}><RemoteArt account={featured.account.id} id={pick.coverArt}/></View><View style={{flex:1,gap:7}}><T muted style={{fontSize:10,letterSpacing:1.2}}>{explore?'TAKE ANOTHER LOOK':'IN YOUR COLLECTION'}</T><T title numberOfLines={2} style={{fontSize:21,lineHeight:28}}>{pick.title??pick.name}</T><T muted numberOfLines={1} style={{fontSize:12}}>{pick.artist??featured.account.name}</T></View><Icon name="arrow" color={c.accent}/></LinearGradient></Pressable>}
 

 {!app.connections.length&&<Pressable onPress={()=>router.push('/settings')}><T strong>Add your first connection</T><T muted>Your own libraries, in one place.</T></Pressable>}

 </View>} renderItem={({item:shelf})=><View key={shelf.key} style={{gap:14}}><View style={layout.row}><View style={{flex:1}}><T title style={{fontSize:21,lineHeight:28}}>{shelf.title}</T><T muted style={{fontSize:12}}>{shelf.account.name}</T></View><Pressable accessibilityRole="button" onPress={()=>router.push(shelf.account.type==='audiobookshelf'?{pathname:'/spoken',params:{account:shelf.account.id}}:{pathname:'/shelf',params:{account:shelf.account.id,title:shelf.title,kind:shelf.kind}})} style={{padding:10}}><T strong style={{color:c.accent}}>See all</T></Pressable></View><FlatList horizontal data={shelf.items.slice(0,12)} keyExtractor={(item,index)=>item.id+':'+index} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3} getItemLayout={(_,index)=>({length:172,offset:172*index,index})} showsHorizontalScrollIndicator={false} ItemSeparatorComponent={()=><View style={{width:14}}/>} renderItem={({item,index})=><Pressable key={item.id+':'+index} accessibilityLabel={'Open '+(item.title??item.name)} onPress={()=>open(shelf.account,(item as any).kind??shelf.kind,item,app.setNotice)} style={{width:158,gap:8}}><View style={{width:158,height:158,borderRadius:16,overflow:'hidden'}}><RemoteArt account={shelf.account.id} id={item.coverArt||item.id}/></View><T strong numberOfLines={2}>{item.title??item.name}</T><T muted numberOfLines={1} style={{fontSize:12}}>{item.artist??''}</T></Pressable>}/></View>} ListFooterComponent={<View style={{gap:20}}>

 {pending>0&&!shelves.length&&<LoadingContent columns={3}/>}<DiscoveryShelves home/>
 {!!pending&&<ActivityIndicator color={c.accent}/>} {!pending&&!shelves.length&&!!app.connections.length&&<View style={{gap:8}}><T strong>Your shelves are quiet right now.</T><T muted>Available libraries and downloads are still accessible. Check connection status in Your space.</T><IconButton icon="refresh" label="Refresh shelves" onPress={app.refreshLibrary}/></View>}

 </View>}/></Shell>

}

export {LibraryHub} from './LibraryHub';
