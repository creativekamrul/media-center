import {Icon} from './Icon';
import React,{useRef,useState,useEffect} from 'react';
import {View,FlatList,Pressable,PanResponder} from 'react-native';
import {useApp,usePalette,usePlayer} from './AppState';
import {T,Button,IconButton,layout} from './ui';
import {RemoteArt} from './RemoteLibrary';
import {playback,message,type PlayingTrack} from './library';
function QueueRow({item,index,current,count,remove,move}:{item:PlayingTrack;index:number;current:boolean;count:number;remove:()=>void;move:(to:number)=>void}){
 const c=usePalette(),app=useApp();const [dragging,setDragging]=useState(false);
 const drag=PanResponder.create({onStartShouldSetPanResponder:()=>true,onPanResponderGrant:()=>setDragging(true),onPanResponderRelease:(_,g)=>{setDragging(false);move(Math.max(0,Math.min(count-1,index+Math.round(g.dy/80))))},onPanResponderTerminate:()=>setDragging(false)});
 const swipe=PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>!current&&Math.abs(g.dx)>24&&Math.abs(g.dx)>Math.abs(g.dy)*2,onPanResponderRelease:(_,g)=>{if(Math.abs(g.dx)>70)remove()}});
 return <View {...swipe.panHandlers} style={{height:80,padding:10,borderRadius:12,backgroundColor:dragging?c.accent+'30':current?c.panel:'transparent',flexDirection:'row',alignItems:'center',gap:10}}><Pressable accessibilityRole="button" accessibilityLabel={'Play '+(item.title||'queued track')} onPress={()=>void playback.control('queue-index',index).catch(e=>app.setNotice(message(e)))} style={[layout.row,{flex:1}]}><View style={{width:44,height:44,borderRadius:8,overflow:'hidden'}}><RemoteArt account={item.account} id={item.coverArt||item.id}/></View><View style={{flex:1}}><T strong numberOfLines={1} style={{color:current?c.accent:c.text}}>{item.title||'Queued track'}</T><T muted numberOfLines={1}>{item.artist}</T></View></Pressable><View {...drag.panHandlers} accessibilityLabel={'Drag to reorder '+(item.title||'queued track')} style={{padding:8}}><Icon name="menu" size={20} color={c.muted}/></View><IconButton icon="up" label={'Move up '+(item.title||'queued track')} onPress={()=>move(Math.max(0,index-1))}/>{!current&&<IconButton icon="close" label={'Remove '+(item.title||'queued track')} onPress={remove}/>}</View>
}
function QueueContent({queue,currentIndex}:{queue:PlayingTrack[];currentIndex:number}){const app=useApp(),ref=useRef<FlatList<PlayingTrack>>(null),header=useRef(0),[undo,setUndo]=useState(false);
 const control=async(action:string,value=0)=>{try{await playback.control(action,value);return true}catch(e){app.setNotice(message(e));return false}};
 useEffect(()=>{if(!undo)return;const timer=setTimeout(()=>setUndo(false),10000);return()=>clearTimeout(timer)},[undo]);
 const jump=()=>ref.current?.scrollToOffset({offset:Math.max(0,header.current+currentIndex*80-80),animated:true});
 return <FlatList ref={ref} data={queue} keyExtractor={(_,i)=>String(i)} initialNumToRender={12} maxToRenderPerBatch={8} windowSize={5} contentContainerStyle={{padding:16,paddingBottom:40}} ListHeaderComponent={<View onLayout={e=>{header.current=e.nativeEvent.layout.height}} style={{gap:8,marginBottom:12}}><Button label="Jump to current track" onPress={jump}/>{queue.length>1&&<Button label="Clear upcoming" onPress={()=>void control('clear-upcoming')}/>} {undo&&<Button label="Undo removal" onPress={()=>{void control('undo-remove');setUndo(false)}}/>}<T muted style={{fontSize:12}}>Drag the handle to reorder. Swipe a queued track to remove it.</T></View>} ListEmptyComponent={<T muted>Your queue is empty.</T>} renderItem={({item,index})=><QueueRow item={item} index={index} count={queue.length} current={index===currentIndex} move={to=>void control('move-to',index*100000+to)} remove={()=>{void control('remove',index).then(ok=>{if(ok)setUndo(true)})}}/>}/>;
}

const MemoQueue=React.memo(QueueContent);
const emptyQueue:PlayingTrack[]=[];
export function QueueSheet(){const p=usePlayer();return <MemoQueue queue={p.queue??emptyQueue} currentIndex={p.index??0}/>;}
