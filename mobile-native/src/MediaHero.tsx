import {CoverButton} from './CoverButton';
import React from 'react';
import {View,useWindowDimensions} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {RemoteArt} from './RemoteLibrary';
import {usePalette,useApp} from './AppState';
import {T,IconButton} from './ui';
import {togglePin,pinKey,type Pin} from './pins';

export function PinButton({pin}:{pin:Pin}){const app=useApp();const active=(app.prefs.pins??[]).some(p=>pinKey(p)===pinKey(pin));return <IconButton icon={active?'check':'pin'} label={active?'Unpin from Library':'Pin to Library'} onPress={()=>app.setPrefs({pins:togglePin(app.prefs.pins??[],pin)})}/>;}

export function MediaHero({account,cover,title,subtitle,eyebrow,shape='square',pin,children}:{account:string;cover?:string;title:string;subtitle?:string;eyebrow:string;shape?:'square'|'portrait'|'landscape'|'circle';pin?:Pin;children?:React.ReactNode}){
 const c=usePalette();const {width,height}=useWindowDimensions();const wide=width>height&&width>=600;
 if(wide)return <View style={{flexDirection:'row',gap:24,paddingTop:48,paddingBottom:20,alignItems:'center'}}><View style={{height:Math.min(240,height-110),aspectRatio:shape==='portrait'?2/3:shape==='landscape'?16/9:1,borderRadius:shape==='circle'?140:16,overflow:'hidden'}}><RemoteArt account={account} id={cover||pin?.id}/></View><View style={{flex:1,gap:10}}><T muted style={{fontSize:11,letterSpacing:1.3,textTransform:'uppercase'}}>{eyebrow}</T><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><T title numberOfLines={2} style={{flex:1,fontSize:27,lineHeight:33}}>{title}</T><CoverButton account={account} id={cover||pin?.id}/>{pin&&<PinButton pin={pin}/>}</View>{!!subtitle&&<T muted>{subtitle}</T>}{children}</View></View>;
 return <View style={{marginHorizontal:-20,marginTop:-20,marginBottom:16}}><View style={{height:shape==='landscape'?300:370,overflow:'hidden'}}><RemoteArt account={account} id={cover||pin?.id} blurRadius={26}/><LinearGradient colors={[c.bg+'33',c.bg]} style={{position:'absolute',inset:0}}/><View style={{position:'absolute',inset:0,alignItems:'center',justifyContent:'flex-end',paddingTop:70,paddingBottom:20}}><View style={{height:shape==='landscape'?195:260,aspectRatio:shape==='portrait'?2/3:shape==='landscape'?16/9:1,borderRadius:shape==='circle'?140:18,overflow:'hidden',boxShadow:'0 14px 32px #0005'}}><RemoteArt account={account} id={cover||pin?.id}/></View></View></View><View style={{paddingHorizontal:20,gap:12}}><T muted style={{fontSize:11,letterSpacing:1.6,textTransform:'uppercase'}}>{eyebrow}</T><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><T title style={{flex:1,fontSize:29,lineHeight:37}}>{title}</T><CoverButton account={account} id={cover||pin?.id}/>{pin&&<PinButton pin={pin}/>}</View>{!!subtitle&&<T muted>{subtitle}</T>}{children}</View></View>
}
