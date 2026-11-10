import {connectionHelp} from './connectionStatus';
import React,{useState,useRef,useCallback} from 'react';

import {View,Pressable,Modal,ScrollView,StyleSheet,BackHandler,findNodeHandle,useWindowDimensions} from 'react-native';

import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';

import {StatusBar} from 'expo-status-bar';

import {router,useFocusEffect} from 'expo-router';

import {BlurView,BlurTargetView} from 'expo-blur';

import {LiquidGlass} from './LiquidGlass';

import {useApp,usePalette,usePlayer} from './AppState';

import {T,Button,IconButton,layout} from './ui';

import {Icon} from './Icon';

import {playback} from './library';

const tabs=[['Home','/','home'],['Explore','/explore','explore'],['Library','/library','library'],['Search','/search','search'],['Menu','/customize','menu']] as const;

export function Shell({title,root=false,artwork=false,children}:{title:string;root?:boolean;artwork?:boolean;children:React.ReactNode}){

 const {width,height}=useWindowDimensions();const wide=width>height&&width>=600;
 const app=useApp(),c=usePalette(),insets=useSafeAreaInsets();const [menu,setMenu]=useState(false),[targetTag,setTargetTag]=useState(0),[light,setLight]=useState(.25);const target=useRef<React.ElementRef<typeof View>>(null);

 useFocusEffect(useCallback(()=>{if(!root||title==='Home')return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>{router.navigate('/');return true});return()=>sub.remove()},[root,title]));

 const back=()=>router.canGoBack()?router.back():router.replace('/');

 return <SafeAreaView style={{flex:1,backgroundColor:c.bg}}><StatusBar style={['paper','snow','sand'].includes(app.prefs.palette)?'dark':'light'}/><BlurTargetView ref={target} onLayout={()=>setTargetTag(findNodeHandle(target.current)??0)} style={{flex:1,paddingLeft:wide&&root?100:0}}>

 {!root&&!artwork&&<View style={layout.header}>{!root&&<IconButton icon="back" label="Back" onPress={back}/>}<T title numberOfLines={1} style={{flex:1,fontSize:root?29:20}}>{title}</T></View>}

 {!!app.notice&&<Pressable onPress={()=>app.setNotice('')} style={{padding:12,backgroundColor:c.panel}}><T>{app.notice}</T></Pressable>}

 <View style={{flex:1}}>{children}</View>

 </BlurTargetView>
 {artwork&&<View style={{position:'absolute',top:insets.top+12,left:18,width:48,height:48,borderRadius:24,overflow:'hidden'}}>{app.prefs.material==='glass'?<LiquidGlass pointerEvents="none" targetTag={targetTag} tone={c.panel} light={.2} opacity={app.prefs.glassOpacity??.26} refraction={app.prefs.glassRefraction??.7} style={StyleSheet.absoluteFill}/>:<View style={[StyleSheet.absoluteFill,{backgroundColor:c.panel+'DD'}]}/>}<IconButton icon="back" label="Back" onPress={back}/></View>}
 <View pointerEvents="box-none" style={{position:'absolute',left:wide&&root?112:14,right:14,bottom:wide?10:24,gap:8}}>
{title!=='Now playing'&&<MiniPlayer/>}
 {root&&!wide&&<View style={{borderRadius:24,overflow:'hidden'}}>
 {app.prefs.material==='glass'?<LiquidGlass pointerEvents="none" targetTag={targetTag} tone={c.panel} light={light} opacity={app.prefs.glassOpacity??.26} refraction={app.prefs.glassRefraction??.7} style={StyleSheet.absoluteFill}/>:['frosted','blurred'].includes(app.prefs.material)?<BlurView blurTarget={target} blurMethod="dimezisBlurViewSdk31Plus" tint={['paper','snow','sand'].includes(app.prefs.palette)?'light':'dark'} intensity={app.prefs.material==='blurred'?35:70} style={StyleSheet.absoluteFill}/>:null}
 <View style={{flexDirection:'row',padding:7,backgroundColor:app.prefs.material==='solid'?c.panel:app.prefs.material==='frosted'?c.panel+'88':app.prefs.material==='blurred'?c.panel+'44':'transparent'}}>{tabs.map(([name,path,icon],index)=><Pressable key={name} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{selected:title===name}} onPressIn={()=>{if(!app.prefs.reduceMotion)setLight((index+.5)/5)}} onPress={()=>name==='Menu'?setMenu(true):title!==name&&router.navigate(path)} style={{flex:1,minHeight:58,borderRadius:18,alignItems:'center',justifyContent:'center',gap:5,backgroundColor:title===name?c.accent+'22':'transparent'}}><Icon name={icon} color={title===name?c.accent:c.text}/><T style={{fontSize:11,lineHeight:16,color:title===name?c.accent:c.text}} strong>{name}</T></Pressable>)}</View></View>}



 </View>
 {root&&wide&&<View style={{position:'absolute',left:12,top:insets.top+8,bottom:insets.bottom+8,width:78,borderRadius:20,backgroundColor:c.panel,justifyContent:'space-evenly',paddingVertical:6}}>{tabs.map(([name,path,icon])=><Pressable key={name} accessibilityRole="tab" accessibilityLabel={name} accessibilityState={{selected:title===name}} onPress={()=>name==='Menu'?setMenu(true):title!==name&&router.navigate(path)} style={{minHeight:48,alignItems:'center',justifyContent:'center',gap:3}}><Icon name={icon} size={21} color={title===name?c.accent:c.text}/><T strong style={{fontSize:10,lineHeight:13,color:title===name?c.accent:c.muted}}>{name}</T></Pressable>)}</View>}
 <Modal visible={menu} transparent animationType="fade" onRequestClose={()=>setMenu(false)}><View style={{flex:1,backgroundColor:'#0008',alignItems:'flex-end'}}><Pressable accessibilityLabel="Close menu" style={StyleSheet.absoluteFill} onPress={()=>setMenu(false)}/><SafeAreaView style={{width:wide?380:'87%',height:'100%',backgroundColor:c.bg,borderTopLeftRadius:24,borderBottomLeftRadius:24}}><View style={layout.header}><T title style={{flex:1}}>Your space</T><IconButton icon="close" label="Close menu" onPress={()=>setMenu(false)}/></View><ScrollView contentContainerStyle={layout.page}><T muted>LIBRARIES</T>{app.connections.map(a=><Pressable key={a.id} style={[layout.row,{minHeight:60}]} onPress={()=>{app.select(a.id);setMenu(false);router.replace('/library')}}><Icon name="server" color={c.text}/><View style={{flex:1}}><T strong>{a.name}</T>{app.health[a.id]==='offline'&&<T muted style={{fontSize:11}}>{connectionHelp(app.connectionErrors[a.id]??'').title}{' · '}{connectionHelp(app.connectionErrors[a.id]??'').help}</T>}</View>{app.health[a.id]==='offline'?<IconButton icon="refresh" label={'Retry '+a.name} onPress={()=>{app.refreshLibrary();app.setNotice('Checking library connections…')}}/>:app.selected?.id===a.id&&<Icon name="check" color={c.accent}/>}</Pressable>)}<Button label="Refresh library" icon="refresh" onPress={()=>{app.refreshLibrary();setMenu(false)}}/><Button label="Podcast inbox" icon="queue" onPress={()=>{setMenu(false);router.push('/podcast-inbox')}}/><Button label="Cache" icon="download" onPress={()=>{setMenu(false);router.push('/downloads')}}/><Button label="Settings" icon="settings" onPress={()=>{setMenu(false);router.push('/settings')}}/></ScrollView></SafeAreaView></View></Modal>

 </SafeAreaView>

}


function MiniPlayer(){const player=usePlayer(),c=usePalette();return <>{player.track&&true&&<Pressable accessibilityLabel="Open player" onPress={()=>router.push('/player')} style={{padding:12,minHeight:68,backgroundColor:c.panel,borderRadius:14,flexDirection:'row',alignItems:'center'}}><View style={{flex:1}}><T strong numberOfLines={1}>{player.track.title}</T><T muted numberOfLines={1}>{player.track.artist}</T></View><IconButton icon={player.playing?'pause':'play'} label="Toggle playback" onPress={()=>void playback.control('toggle')}/></Pressable>}</>}
