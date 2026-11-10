import React,{useState,useEffect} from 'react';

import {View,Pressable,ActivityIndicator,TextInput} from 'react-native';

import {lyrics,customLyrics,message,playback,searchLyrics,customMedia,type LyricResult} from './library';import {parseLyrics} from './lyrics';import {T,Button} from './ui';import {useApp,usePalette,usePlayer} from './AppState';

export function Lyrics({identity,position}:{identity:string;position:number}){

 const [attempt,setAttempt]=useState(0);

 return <LyricsRequest key={identity+":"+attempt} identity={identity} position={position} retry={()=>setAttempt(v=>v+1)}/>;

}

function LyricsRequest({identity,position,retry}:{identity:string;position:number;retry:()=>void}){

 const c=usePalette(),app=useApp(),{prefs}=app;const player=usePlayer();const [finding,setFinding]=useState(false),[query,setQuery]=useState(''),[results,setResults]=useState<LyricResult[]>([]),[searching,setSearching]=useState(false),[preview,setPreview]=useState<LyricResult|null>(null);const [editing,setEditing]=useState(false),[text,setText]=useState(''),[saving,setSaving]=useState(false);const offsets=(prefs.lyricsOffsets??{}) as Record<string,number>,offset=offsets[identity]??0;const save=async(value:string)=>{setSaving(true);try{await customLyrics(identity,value);retry()}catch(e){app.setNotice(message(e))}finally{setSaving(false)}};const [data,setData]=useState<Awaited<ReturnType<typeof lyrics>>>(),[error,setError]=useState('');

 useEffect(()=>{let alive=true;lyrics().then(d=>{if(alive)setData(d)}).catch(e=>{if(alive)setError(message(e))});return()=>{alive=false}},[]);

 const lines=parseLyrics(data?.synced??'');const active=lines.findLastIndex(l=>l.time<=position+offset);

 async function importFile(){setSaving(true);try{if(await customMedia.importLyrics(identity))retry()}catch(e){app.setNotice(message(e))}finally{setSaving(false)}}
 async function exportFile(){setSaving(true);try{if(await customMedia.exportLyrics(identity,data?.synced||data?.plain||''))app.setNotice('Lyrics exported.')}catch(e){app.setNotice(message(e))}finally{setSaving(false)}}
 async function find(){setSearching(true);setResults([]);setPreview(null);try{setResults(await searchLyrics(identity,query))}catch(e){app.setNotice(message(e))}finally{setSearching(false)}}
 return <View style={{gap:20,minHeight:280}}><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button label="Find lyrics" icon="search" onPress={()=>{setQuery([player.track?.artist,player.track?.title].filter(Boolean).join(' '));setFinding(!finding)}}/><Button label="Import LRC / text" disabled={saving} icon="plus" onPress={()=>void importFile()}/><Button label="Export lyrics file" disabled={saving||!(data?.synced||data?.plain)} icon="download" onPress={()=>void exportFile()}/></View>{finding&&<View style={{gap:12}}><TextInput accessibilityLabel="Search lyrics" value={query} onChangeText={setQuery} maxLength={200} placeholder="Artist and song title" placeholderTextColor={c.muted} style={{padding:14,borderRadius:12,backgroundColor:c.panel,color:c.text,fontFamily:'DMSans_400Regular'}}/><Button disabled={searching||query.trim().length<2} label={searching?'Searching…':'Search LRCLIB'} onPress={()=>void find()}/>{results.map(r=><Pressable key={r.id} onPress={()=>setPreview(r)} style={{padding:14,borderRadius:12,backgroundColor:c.panel,gap:4}}><T strong>{r.title}</T><T muted>{r.artist} · {Math.round(r.duration)} sec · {r.synced?'Synced':'Plain'}</T><T muted>{r.album}</T></Pressable>)}{preview&&<View style={{gap:12}}><T strong>{preview.title}</T><T numberOfLines={12}>{preview.synced||preview.plain||'Instrumental'}</T><Button primary disabled={saving||!(preview.synced||preview.plain)} label="Download and use these lyrics" onPress={()=>void save(preview.synced||preview.plain||'')}/></View>}<T muted>Choose a match before downloading. Saved lyrics remain available offline. Export writes an LRC or text file to the location you choose.</T></View>}<Button label={editing?'Close lyrics editor':'Edit / paste lyrics'} icon="edit" onPress={()=>{setText(data?.synced||data?.plain||'');setEditing(!editing)}}/>{editing&&<View style={{gap:12}}><TextInput accessibilityLabel="Custom lyrics" multiline value={text} onChangeText={setText} maxLength={100000} placeholder="Paste LRC timestamps or plain lyrics" placeholderTextColor={c.muted} style={{minHeight:200,color:c.text,backgroundColor:c.panel,padding:14,borderRadius:12,textAlignVertical:'top',fontFamily:'DMSans_400Regular'}}/><Button label="Save lyrics on this device" disabled={saving} onPress={()=>void save(text)}/><Button label="Restore automatic lyrics" disabled={saving} onPress={()=>void save('')}/></View>}{!!lines.length&&<View style={{gap:8}}><T muted>Lyrics timing · {offset.toFixed(2)} seconds</T><View style={{flexDirection:'row',gap:8}}><Button label="Earlier" onPress={()=>app.setPrefs({lyricsOffsets:{...offsets,[identity]:Math.min(30,offset+.25)}})}/><Button label="Later" onPress={()=>app.setPrefs({lyricsOffsets:{...offsets,[identity]:Math.max(-30,offset-.25)}})}/><Button label="Reset" onPress={()=>app.setPrefs({lyricsOffsets:{...offsets,[identity]:0}})}/></View></View>}{error?<><T>{error}</T><Button label="Retry lyrics" onPress={retry}/></>:!data?<ActivityIndicator color={c.accent}/>:lines.length?lines.map((line,i)=><Pressable key={i} onPress={()=>void playback.control('seek',Math.max(0,line.time-offset))}><T strong style={{fontSize:prefs.lyricsSize??23,lineHeight:(prefs.lyricsSize??23)*1.45,textAlign:prefs.lyricsAlign??'left',color:i===active?c.text:c.muted}}>{line.text||'♪'}</T></Pressable>):<T muted>{data.instrumental?'Instrumental':data.plain||'No lyrics found for this track.'}</T>}</View>

}

