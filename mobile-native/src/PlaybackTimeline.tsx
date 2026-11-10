import {useFocusEffect} from 'expo-router';
import {useAppVisibility} from './useAppVisibility';
import React,{useEffect,useRef,useState,useCallback} from 'react';
import {View} from 'react-native';
import Slider from '@react-native-community/slider';
import {SeekWave} from './SeekWave';
import {T,layout} from './ui';
import {time} from './catalog';
import {awaitingSeek} from './seekAcknowledgement';

// The fast display clock belongs here, never in the artwork/queue/settings tree.
export function PlaybackTimeline({position,duration,playing,speed,enabled,loading,accent,muted,text,onSeek}:{position:number;duration:number;playing:boolean;speed:number;enabled:boolean;loading:boolean;accent:string;muted:string;text:string;onSeek:(value:number)=>Promise<unknown>}) {
 const foreground=useAppVisibility();
 const [display,setDisplay]=useState(position),[drag,setDrag]=useState<number|null>(null);
 const anchor=useRef({position,time:0});
 const pending=useRef<{position:number;time:number}|null>(null);
 const [gestureStart,setGestureStart]=useState(position);
 useEffect(()=>{
  const now=Date.now(),seek=pending.current;
  // Ignore old native samples while the seek command is in flight.
  if(seek&&awaitingSeek(position,seek.position,now-seek.time))return;
  pending.current=null;anchor.current={position,time:now};
 },[position]);
 useFocusEffect(useCallback(()=>{
  if(!foreground||drag!==null)return;
  const tick=()=>{const now=Date.now();if(pending.current&&now-pending.current.time>=2000){pending.current=null;anchor.current={position,time:now}}
   setDisplay(Math.max(0,Math.min(duration,anchor.current.position+(playing?(now-anchor.current.time)/1000*speed:0))));};
  tick();const timer=setInterval(tick,32);return()=>clearInterval(timer);
 },[foreground,drag,playing,speed,duration,position]));
 const shown=drag??display;
 return <View><View><SeekWave progress={shown/Math.max(1,duration)} color={accent}/><Slider accessibilityLabel="Seek" style={{height:32,marginHorizontal:-14}} minimumValue={0} maximumValue={Math.max(1,duration)} value={drag===null?display:gestureStart} disabled={!enabled}
  onSlidingStart={value=>{setGestureStart(value);setDrag(value)}} onValueChange={setDrag}
  onSlidingComplete={value=>{const now=Date.now();pending.current={position:value,time:now};anchor.current={position:value,time:now};setDisplay(value);setDrag(null);void onSeek(value).catch(()=>{pending.current=null;anchor.current={position,time:Date.now()};setDisplay(position)})}}
  minimumTrackTintColor={accent} maximumTrackTintColor={muted+'50'} thumbTintColor={text}/></View><View style={[layout.row,{justifyContent:'space-between'}]}><T muted style={{fontSize:11,lineHeight:16}}>{time(shown)}</T><T muted style={{fontSize:11,lineHeight:16}}>{loading?'Loading…':'−'+time(Math.max(0,duration-shown))}</T></View></View>;
}
