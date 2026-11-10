import React from 'react';

import {Text,Pressable,StyleSheet,useWindowDimensions,type TextProps} from 'react-native';

import {Icon,type IconName} from './Icon';

import {usePalette} from './AppState';

export function T({strong=false,title=false,muted=false,style,...props}:TextProps&{strong?:boolean;title?:boolean;muted?:boolean}){const c=usePalette();return <Text {...props} style={[{fontFamily:title?'Sora_600SemiBold':strong?'DMSans_700Bold':'DMSans_400Regular',fontSize:title?27:15,lineHeight:title?35:22,color:muted?c.muted:c.text},style]}/>}

export function Button({label,icon,onPress,primary=false,disabled=false}:{label:string;icon?:IconName;onPress:()=>void;primary?:boolean;disabled?:boolean}){const c=usePalette();return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={{minHeight:48,paddingHorizontal:16,paddingVertical:12,borderRadius:12,backgroundColor:primary?c.accent:c.panel,flexDirection:'row',gap:9,alignItems:'center',justifyContent:'center',opacity:disabled?.4:1}}>{icon&&<Icon name={icon} color={primary?c.bg:c.text}/>}<T strong style={{color:primary?c.bg:c.text}}>{label}</T></Pressable>}

export function IconButton({icon,label,onPress,active=false,size=23}:{icon:IconName;label:string;onPress:()=>void;active?:boolean;size?:number}){const c=usePalette();return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{width:48,height:48,alignItems:'center',justifyContent:'center'}}><Icon name={icon} color={active?c.accent:c.text} size={size}/></Pressable>}

export const layout=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:12},page:{padding:20,gap:18},header:{paddingHorizontal:16,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:12},grow:{flex:1},section:{gap:12,marginBottom:24}});


// Compact library actions share equal widths and retain a comfortable touch target.
export function LibraryShortcut({label,icon,onPress,disabled=false}:{label:string;icon:IconName;onPress:()=>void;disabled?:boolean}){
 const c=usePalette();const {width,height}=useWindowDimensions();
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>({width:width>height?'31%':'48%',flexGrow:1,minHeight:64,paddingHorizontal:12,paddingVertical:12,borderRadius:12,backgroundColor:c.panel,flexDirection:'row',gap:9,alignItems:'center',opacity:disabled?.4:pressed?.7:1})}><Icon name={icon} size={20} color={c.accent}/><T strong style={{flex:1,fontSize:12,lineHeight:17}}>{label}</T></Pressable>
}
