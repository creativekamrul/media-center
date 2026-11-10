import {Transcript} from "../TranscriptView";
import {CoverButton} from '../CoverButton';
import {QueueSheet} from '../QueueSheet';
import {SignalPath} from '../PlaybackSettings';
import React,{useState} from 'react';

import {View,ScrollView,Pressable,Modal,StyleSheet,useWindowDimensions} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';

import {router} from 'expo-router';

import {StatusBar} from 'expo-status-bar';

import {LinearGradient} from 'expo-linear-gradient';

import Slider from '@react-native-community/slider';

import {Icon} from '../Icon';

import {Lyrics} from '../LyricsView';

import {PlaybackTimeline} from '../PlaybackTimeline';

import {RemoteArt} from '../RemoteLibrary';

import {useApp,usePalette,usePlayer} from '../AppState';

import {T,Button,IconButton,layout} from '../ui';

import {playback,message,favorite} from '../library';

import {time} from '../catalog';



type Sheet='Queue'|'Lyrics'|'Transcript'|'Playback options'|null;

export default function Player(){

 const {width,height}=useWindowDimensions();const wide=width>height&&width>=600;
 const app=useApp(),player=usePlayer(),c=usePalette(),p=player,t=p.track;

 const [sheet,setSheet]=useState<Sheet>(null);

 const [artSize,setArtSize]=useState(0),[locked,setLocked]=useState(false);

 const control=(action:string,value=0)=>void playback.control(action,value).catch(e=>app.setNotice(message(e)));

 const key=t?t.account+':'+t.id:'',liked=app.prefs.likes.includes(key),music=!t?.kind||['music','local'].includes(t.kind),spoken=['book','podcast'].includes(t?.kind??'');

 const back=()=>router.canGoBack()?router.back():router.replace('/');

 const toggleFavorite=()=>{if(!t)return;const account=app.connections.find(a=>a.id===t.account);void (account?.type==='navidrome'?favorite(t.account,t.id,!liked):Promise.resolve()).then(()=>app.setPrefs({likes:liked?app.prefs.likes.filter(x=>x!==key):[...app.prefs.likes,key]})).catch(e=>app.setNotice(message(e)))};

 return <LinearGradient colors={[c.panel,c.bg]} style={{flex:1}}>{app.prefs.playerBackdrop&&t&&<View pointerEvents="none" style={StyleSheet.absoluteFill}><RemoteArt account={t.account} id={t.coverArt||t.id} blurRadius={45}/><View style={[StyleSheet.absoluteFill,{backgroundColor:c.bg+'b8'}]}/></View>}<SafeAreaView style={{flex:1}}><StatusBar style={['paper','snow','sand'].includes(app.prefs.palette)?'dark':'light'}/>

 <View style={layout.header}><IconButton icon="down" label="Back" onPress={back}/><View style={{flex:1,alignItems:'center'}}><T muted style={{fontSize:10,letterSpacing:1.5,lineHeight:16}}>NOW PLAYING</T><T strong numberOfLines={1} style={{fontSize:12}}>{t?.album|| (music?'Your music':t?.kind==='book'?'Audiobook':t?.kind==='radio'?'Radio':'Podcast')}</T></View><IconButton icon="settings" label="Playback options" onPress={()=>setSheet('Playback options')}/></View>

 {!t?<View style={{flex:1,justifyContent:'center',padding:28}}><T title>Ready when you are.</T><T muted>{p.error||'Choose something from your library.'}</T></View>:<View style={{flex:1,paddingHorizontal:wide?20:28,paddingBottom:8,flexDirection:wide?'row':'column',gap:wide?24:0}}>

 <View style={{flex:wide?.9:1,minHeight:0,alignItems:'center',justifyContent:'center'}} onLayout={e=>{const {width,height}=e.nativeEvent.layout;setArtSize(Math.max(0,Math.min(width,height-24)))}}><View style={{width:artSize,height:artSize,borderRadius:16,overflow:'hidden'}}><RemoteArt account={t.account} id={t.coverArt||t.id}/></View></View>

 <View style={{flex:wide?1.2:undefined,justifyContent:wide?'center':undefined}}><View style={[layout.row,{paddingTop:wide?0:12,paddingBottom:wide?6:16}]}><View style={{flex:1,gap:4}}><T title numberOfLines={wide?1:2} style={{fontSize:wide?21:23,lineHeight:wide?26:29}}>{t.title||'Loading track…'}</T><T muted numberOfLines={1}>{t.artist}</T></View>{music&&<Pressable accessibilityRole="button" accessibilityLabel={liked?'Remove favorite':'Favorite track'} onPress={toggleFavorite} style={styles.icon}><Icon name="heart" filled={liked} color={liked?c.accent:c.text}/></Pressable>}</View>

 {t.fallbackFrom&&<T muted style={{fontSize:12}}>Matching copy from {app.connections.find(a=>a.id===t.account)?.name??'another music source'}</T>}{(p.error||p.syncError||app.notice)&&<Pressable onPress={()=>{app.setNotice('');setSheet('Playback options')}}><T numberOfLines={1} style={{fontSize:12,color:c.text}}>{p.error||p.syncError||app.notice}</T></Pressable>}

 <View pointerEvents={locked?'none':'auto'} style={{opacity:locked?.4:1}}><PlaybackTimeline key={key} position={p.position??0} duration={p.duration??0} playing={!!p.playing} speed={p.speed??1} enabled={!!p.loaded&&t?.kind!=='radio'} loading={!p.loaded&&!p.error} accent={c.accent} muted={c.muted} text={c.text} onSeek={v=>playback.control('seek',v).catch(e=>{app.setNotice(message(e));throw e})}/>


 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:wide?2:14}}><IconButton icon="shuffle" label="Shuffle" active={p.shuffle} onPress={()=>control('shuffle')}/><IconButton icon="previous" label="Previous" size={28} onPress={()=>control('previous')}/><Pressable accessibilityRole="button" accessibilityLabel={p.playing?'Pause':'Play'} onPress={()=>control('toggle')} style={[styles.play,{backgroundColor:c.text,width:wide?56:72,height:wide?56:72}]}><Icon name={p.playing?'pause':'play'} color={c.bg} size={32}/></Pressable><IconButton icon="next" label="Next" size={28} onPress={()=>control('next')}/><IconButton icon="repeat" label={'Repeat '+(p.repeat??'off')} active={!!p.repeat&&p.repeat!=='off'} onPress={()=>control('repeat')}/></View>

 <View style={[layout.row,{justifyContent:'space-between'}]}><IconButton icon="volume" label="Audio controls" onPress={()=>setSheet('Playback options')}/>{music?<Pressable accessibilityRole="button" accessibilityLabel="Open lyrics" onPress={()=>setSheet('Lyrics')} style={[layout.row,{minHeight:48,gap:8}]}><Icon name="lyrics" color={c.muted} size={18}/><T muted style={{fontSize:12}}>Lyrics</T></Pressable>:<Button label={'Speed '+(p.speed??1)+'x'} onPress={()=>setSheet('Playback options')}/>}<IconButton icon="queue" label="Open queue" onPress={()=>setSheet('Queue')}/></View>

 </View>{spoken&&<Pressable accessibilityRole="button" accessibilityLabel={locked?'Unlock playback controls':'Lock playback controls'} onPress={()=>setLocked(v=>!v)} style={{alignItems:'center',padding:wide?2:12}}><T strong style={{fontSize:12}}>{locked?'Unlock controls':'Lock controls'}</T></Pressable>}</View></View>}

 <Modal visible={sheet!==null} transparent animationType={app.prefs.reduceMotion?'none':'slide'} onRequestClose={()=>setSheet(null)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'}}><Pressable accessibilityLabel="Dismiss panel" onPress={()=>setSheet(null)} style={StyleSheet.absoluteFill}/><SafeAreaView edges={['bottom']} style={{height:'84%',backgroundColor:c.bg,borderTopLeftRadius:28,borderTopRightRadius:28,overflow:'hidden'}}><View style={{width:36,height:4,borderRadius:2,backgroundColor:c.muted+'70',alignSelf:'center',marginTop:12}}/><View style={layout.header}><T title style={{flex:1,fontSize:22}}>{sheet}</T><IconButton icon="close" label="Close panel" onPress={()=>setSheet(null)}/></View>

 {sheet==='Transcript'?<Transcript key={key} identity={key} duration={p.duration??0} locked={locked}/>:sheet==='Queue'?<QueueSheet/>:<ScrollView contentContainerStyle={layout.page}>{sheet==='Lyrics'?<Lyrics identity={key} position={p.position??0}/>:<>

 {!!(p.error||p.syncError)&&<T>{p.error||p.syncError}</T>}<View style={layout.row}><T strong style={{flex:1}}>Cover artwork</T>{p.track&&<CoverButton account={p.track.account} id={p.track.coverArt||p.track.id}/>}</View><T strong>Volume</T><Slider accessibilityLabel="Volume" value={p.volume??100} minimumValue={0} maximumValue={100} onSlidingComplete={v=>control('volume',v)} minimumTrackTintColor={c.accent} thumbTintColor={c.accent}/><T strong>Playback</T><View style={[layout.row,{flexWrap:'wrap'}]}><Button label="-5 sec" onPress={()=>control('skip',-5)}/><Button label="+5 sec" onPress={()=>control('skip',5)}/><Button label={(p.speed??1)+'x speed'} onPress={()=>control('speed',(p.speed??1)>=2?1:(p.speed??1)+.25)}/></View><T strong>Sleep timer</T><View style={[layout.row,{flexWrap:'wrap'}]}>{[0,15,30,60].map(v=><Button key={v} label={v?v+' minutes':'Off'} onPress={()=>control('sleep',v)}/>)}</View><Button label={p.sleepAtEnd?"Cancel end-of-item timer":"Stop at end of track / episode / book"} onPress={()=>control('sleep-end',p.sleepAtEnd?0:1)}/><T muted>{p.sleepAtEnd?'Will stop at the end of this item':p.sleepUntil?'Timer ends at '+new Date(p.sleepUntil).toLocaleTimeString(): 'Sleep timer is off'}</T>{spoken&&<><Button label="Open transcript" icon="search" onPress={()=>setSheet("Transcript")}/><T strong>Saved positions</T><Button label="Save this timestamp" onPress={()=>app.setPrefs({bookmarks:[...(app.prefs.bookmarks??[]),{key,position:p.position??0,title:time(p.position??0),mediaTitle:p.track?.title,created:Date.now()}]})}/>{(app.prefs.bookmarks??[]).filter(b=>b.key===key).map(b=><View key={b.created} style={layout.row}><Button label={'Go to '+b.title} onPress={()=>control('seek',b.position)}/><IconButton icon="trash" label="Remove saved timestamp" onPress={()=>app.setPrefs({bookmarks:(app.prefs.bookmarks??[]).filter(x=>x.created!==b.created)})}/></View>)}</>}<Button label="EQ & audio settings" onPress={()=>{setSheet(null);router.push({pathname:'/settings',params:{tab:'Audio'}})}}/><SignalPath/></>}</ScrollView>}

 </SafeAreaView></View></Modal>

 </SafeAreaView></LinearGradient>

}

const styles=StyleSheet.create({icon:{width:48,height:48,alignItems:'center',justifyContent:'center'},play:{width:72,height:72,borderRadius:36,alignItems:'center',justifyContent:'center'},time:{fontSize:11,lineHeight:16}});


