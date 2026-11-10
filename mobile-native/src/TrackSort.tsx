import React,{useState} from 'react';
import {Modal,View,ScrollView,Pressable} from 'react-native';
import {usePalette} from './AppState';
import {T,Button,IconButton,layout} from './ui';
import {trackSortOptions,type TrackSort as Sort} from './trackOrdering';
export function TrackSort({value,onChange,count}:{value:Sort;onChange:(s:Sort)=>void;count:number}){const c=usePalette(),[open,setOpen]=useState(false);if(count<2)return null;
 return <><Button label={trackSortOptions.find(s=>s[0]===value)?.[1]??'Sort tracks'} icon="settings" onPress={()=>setOpen(true)}/><Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'}}><View style={{backgroundColor:c.bg,padding:20,paddingBottom:36,borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:'85%',gap:12}}><View style={layout.row}><T title style={{flex:1}}>Sort tracks</T><IconButton icon="close" label="Close sorting" onPress={()=>setOpen(false)}/></View><ScrollView>{trackSortOptions.map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{selected:key===value}} onPress={()=>{onChange(key);setOpen(false)}} style={{padding:14,borderRadius:12,backgroundColor:key===value?c.panel:'transparent'}}><T strong={key===value}>{label}</T></Pressable>)}</ScrollView><T muted style={{fontSize:12}}>Playback follows this order. Missing dates and track numbers stay at the end.</T></View></View></Modal></>
}
