import React,{useCallback,useState} from 'react';import {View} from 'react-native';import {router,useFocusEffect} from 'expo-router';
import {musicSession,spokenSession,spokenQueueSession,spoken,message,type SpokenResume} from './library';import {useApp} from './AppState';import {Button,T,LibraryShortcut} from './ui';
export function ResumeSession({compact=false}:{compact?:boolean}){const app=useApp();const [saved,setSaved]=useState<Awaited<ReturnType<typeof musicSession.get>>>(),[book,setBook]=useState<SpokenResume>(),[queue,setQueue]=useState<Awaited<ReturnType<typeof spokenQueueSession.get>>>();const [busy,setBusy]=useState(false);
 useFocusEffect(useCallback(()=>{let live=true;void Promise.allSettled([musicSession.get(),spokenSession(),spokenQueueSession.get()]).then(([music,story,spokenQueue])=>{if(!live)return;if(music.status==='fulfilled')setSaved(music.value);if(story.status==='fulfilled')setBook(story.value);if(spokenQueue.status==='fulfilled')setQueue(spokenQueue.value)});return()=>{live=false}},[]));
 const queued=!!queue?.queue?.length&&(queue.updated??0)>=(book?.updated??0);const current=queued?queue!.queue![queue!.index??0]:book;const updated=queued?queue?.updated:book?.updated;
 const story=!!current?.account&&app.connections.some(a=>a.id===current.account)&&(updated??0)>(saved?.updated??0);
 if(!story&&!saved?.queue?.length)return null;
 const resume=()=>{setBusy(true);void(story?(queued?spokenQueueSession.restore():spoken.play(book!.account!,book!.kind,book!.item,book!.episode,book!.position??0)):musicSession.restore()).then(()=>router.push('/player')).catch(e=>app.setNotice(message(e))).finally(()=>setBusy(false))};
 if(compact)return <LibraryShortcut label="Resume session" icon="play" disabled={busy} onPress={resume}/>;
 return <View style={{gap:8}}><T strong>{story?'Last spoken session':'Last music session'}</T><T muted>{story?current!.title:saved?.queue?.[saved.index??0]?.title||'Saved queue'}</T>{story&&<T muted style={{fontSize:12}}>{queued?queue!.queue!.length+' queued items. ':''}Resume from this device’s saved position.</T>}<Button disabled={busy} label="Resume saved session" icon="play" onPress={resume}/></View>
}
