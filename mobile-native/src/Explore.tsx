import {saveDiscovery} from './discoveryInbox';
import {readFeedback,hideRecommendation,allowedRecommendation} from './recommendationFeedback';
import {ActionSheet,type MediaAction} from './ActionSheet';
import React,{useEffect,useState} from 'react';

import {View,ScrollView,FlatList,Pressable,ActivityIndicator} from 'react-native';

import {LinearGradient} from 'expo-linear-gradient';

import {router} from 'expo-router';

import {DiscoveryShelves} from './DiscoveryShelves';
import {Shell} from './Shell';

import {useApp,usePalette} from './AppState';

import {T,Button,layout} from './ui';

import {RemoteArt} from './RemoteLibrary';

import {browse,listeningHistory,playback,message,type Account,type Entry} from './library';

import {createMix,recommendationReason} from './recommendations';

type Mix={key:string;title:string;reason:string;account:Account;tracks:Entry[];reasons?:Record<string,string>};

export function Explore(){

 const app=useApp(),c=usePalette(),[mixes,setMixes]=useState<Mix[]>([]),[pending,setPending]=useState(0),[actions,setActions]=useState<MediaAction[]|null>(null);

 const connectionKey=app.connections.map(a=>a.id).join('|');

 useEffect(()=>{let live=true;const sources=app.connections.filter(a=>a.type!=='audiobookshelf'&&a.type!=='jellyfin');

 // eslint-disable-next-line react-hooks/set-state-in-effect
 setMixes([]);setPending(sources.length);

 const historyPromise=listeningHistory('most').catch(()=>[]);

 sources.forEach(async account=>{try{

 const [history,albums,starred]=await Promise.all([historyPromise,browse(account.id,'getAlbumList2',{type:'random',size:'12',offset:'0'}),browse(account.id,'getStarred2').catch(()=>({}))]);

 const batches=await Promise.allSettled((albums.albumList2?.album??[]).slice(0,12).map((a:Entry)=>browse(account.id,'getAlbum',{id:a.id})));

 const candidates:Entry[]=batches.flatMap(r=>r.status==='fulfilled'?(r.value.album?.song??[]):[]);

 const personal=history.filter(t=>t.account===account.id&&(!t.kind||t.kind==='music')),favorites:Entry[]=starred.starred2?.song??[];

 const seed=Math.floor(Date.now()/86400000),personalized=personal.length>0;

 const built=(['familiar','discovery'] as const).map(mode=>({key:account.id+mode,account,title:mode==='familiar'?(personalized?'Your daily rotation':'Library shuffle'):'A different direction',reason:mode==='familiar'?(personalized?'Built around artists you play and tracks you love':'A fresh order from your available music'):(personalized?'Less-played tracks, guided by your listening':'More of your collection to try'),tracks:createMix(candidates,personal,favorites,seed,mode),reasons:Object.fromEntries([...candidates,...personal,...favorites].map(t=>[t.id,recommendationReason(t,personal,favorites)]))})).filter(m=>m.tracks.length>0);

 if(live)setMixes(v=>[...v,...built]);

 }catch{/* An unavailable source never blocks the others. */}finally{if(live)setPending(v=>v-1)}});

 return()=>{live=false};

 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[connectionKey,app.refresh]);

 const feedback=readFeedback(app.prefs.recommendationFeedback);
 const visible=mixes.map(m=>({...m,tracks:m.tracks.filter(t=>allowedRecommendation(feedback,m.account.id,t))})).filter(m=>m.tracks.length);
 const feedbackActions=(account:string,track:Entry)=>setActions([{label:'Save for later',run:()=>{app.setPrefs({discoveryInbox:saveDiscovery(app.prefs.discoveryInbox,{account,id:track.id,kind:'track',title:track.title??track.name??'Track',cover:track.coverArt,route:'/detail'})});app.setNotice('Saved to Discovery inbox.')}},{label:'Hide this track from recommendations',run:()=>app.setPrefs({recommendationFeedback:hideRecommendation(feedback,account,track)})},...(track.artist?[{label:'Hide this artist from recommendations',run:()=>app.setPrefs({recommendationFeedback:hideRecommendation(feedback,account,track,true)})}]:[])]);
 const play=(mix:Mix)=>void playback.play(mix.account.id,mix.tracks.map(t=>t.id)).then(()=>router.push('/player')).catch(e=>app.setNotice(message(e)));

 return <Shell root title="Explore"><ScrollView contentContainerStyle={{padding:20,paddingBottom:210,gap:26}}>

 <View style={{gap:8}}><T muted style={{fontSize:11,letterSpacing:1.6}}>FROM YOUR COLLECTIONS</T><T title style={{fontSize:32,lineHeight:40}}>Find your next favorite.</T><T muted>Music mixes, stories and something to watch.</T></View>

 <FlatList horizontal data={visible} keyExtractor={mix=>mix.key} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3} snapToInterval={308} decelerationRate="fast" getItemLayout={(_,index)=>({length:308,offset:308*index,index})} showsHorizontalScrollIndicator={false} ItemSeparatorComponent={()=><View style={{width:16}}/>} renderItem={({item:mix,index:i})=><View key={mix.key} style={{width:292,borderRadius:24,overflow:'hidden',backgroundColor:c.panel}}><View style={{height:210}}><RemoteArt account={mix.account.id} id={mix.tracks[0]?.coverArt}/><LinearGradient colors={['transparent',c.panel]} style={{position:'absolute',inset:0}}/><View style={{position:'absolute',bottom:16,left:20}}><T strong style={{fontSize:11,letterSpacing:2}}>DAILY MIX {String(i+1).padStart(2,'0')}</T></View></View><View style={{padding:20,paddingTop:0,gap:12}}><T title style={{fontSize:25,lineHeight:32}}>{mix.title}</T><T muted style={{minHeight:44}}>{mix.reason}</T><T muted style={{fontSize:12}}>{mix.account.name} · {mix.tracks.length} tracks</T><Button label="Play mix" icon="play" onPress={()=>play(mix)}/></View></View>}/>

 {visible[0]&&<View style={{gap:14}}><T title style={{fontSize:23}}>Try something from this mix</T>{visible[0].tracks.slice(0,5).map(track=><Pressable key={track.id} onLongPress={()=>feedbackActions(visible[0].account.id,track)} onPress={()=>void playback.play(visible[0].account.id,[track.id]).then(()=>router.push('/player')).catch(e=>app.setNotice(message(e)))} style={[layout.row,{paddingVertical:6}]}><View style={{width:52,height:52,borderRadius:10,overflow:'hidden'}}><RemoteArt account={visible[0].account.id} id={track.coverArt}/></View><View style={{flex:1}}><T strong numberOfLines={1}>{track.title??track.name}</T><T muted numberOfLines={1}>{track.artist}</T><T muted style={{fontSize:11}}>{visible[0].reasons?.[track.id]}</T></View></Pressable>)}</View>}

 <Button label="Create your own mix" icon="plus" onPress={()=>router.push('/mixes')}/><DiscoveryShelves/>
 {!!pending&&<ActivityIndicator color={c.accent}/>} {!pending&&!mixes.length&&<View style={{gap:12}}><T strong>No mixes available yet</T><T muted>Music mixes appear when a music library has available tracks. Other connected collections appear above.</T></View>}

 <T muted style={{fontSize:12}}>Press and hold a suggested track to tune recommendations. Hidden items remain in your library.</T>{(feedback.tracks.length+feedback.artists.length)>0&&<Button label="Reset hidden recommendations" onPress={()=>app.setPrefs({recommendationFeedback:{tracks:[],artists:[]}})}/>}<Button label="Refresh recommendations" icon="refresh" onPress={app.refreshLibrary}/>

 </ScrollView>{actions&&<ActionSheet title="Tune your recommendations" actions={actions} onClose={()=>setActions(null)}/>}</Shell>

}

