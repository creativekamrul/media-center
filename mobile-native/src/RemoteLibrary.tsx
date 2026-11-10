import {useApp} from './AppState';
import React,{useEffect,useRef,useState} from 'react';

import {View,Text,Pressable,TextInput,Image,PixelRatio,ActivityIndicator,ScrollView,StyleSheet} from 'react-native';

import {browse,cover,message,type Account,type Entry} from './library';

import {Icon} from './Icon';
import {artworkSize} from './artworkSize';

import {time} from './catalog';

type Kind='Albums'|'Artists'|'Playlists'|'Tracks';

type Detail={kind:'album'|'artist'|'playlist';entry:Entry;parentPage:number};

export type LibraryNavigation={back:(()=>void)|null};

export function RemoteArt({account,id,blurRadius=0}:{account:string;id?:string;blurRadius?:number}){return <Artwork key={account+":"+id} account={account} id={id} blurRadius={blurRadius}/>;}

const Artwork=React.memo(function Artwork({account,id,blurRadius}:{account:string;id?:string;blurRadius:number}){
 const {prefs}=useApp();const revision=prefs.artworkRevision;
 const [uri,setUri]=useState<string|null>(null),[size,setSize]=useState(0);
 useEffect(()=>{let live=true;if(id&&size)cover(account,id,size).then(v=>{if(live)setUri(v)}).catch(()=>{if(live)setUri(null)});return()=>{live=false}},[account,id,size,revision]);
 return <View style={{width:'100%',height:'100%'}} onLayout={e=>{const {width,height}=e.nativeEvent.layout;const pixels=Math.max(width,height)*PixelRatio.get();if(pixels>0)setSize(artworkSize(pixels,blurRadius>0))}}>{uri?<Image source={{uri}} blurRadius={blurRadius} resizeMode="cover" style={{width:'100%',height:'100%'}}/>:<View style={s.placeholder}><Icon name="music" size={30} color="#92b5a0"/></View>}</View>
});

export function RemoteLibrary({account,tab,refresh,onNavigation}:{account:Account;tab:string;refresh:number;onNavigation:(state:LibraryNavigation)=>void}){

 const [kind,setKind]=useState<Kind>('Albums'),[query,setQuery]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[items,setItems]=useState<Entry[]>([]),[detail,setDetail]=useState<Detail[]>([]),[track,setTrack]=useState<Entry|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[more,setMore]=useState(false),[revision,setRevision]=useState(0);

 const [folders,setFolders]=useState<{id:string;name:string}[]>([]),[folder,setFolder]=useState('');

 useEffect(()=>{onNavigation({back:track?()=>setTrack(null):detail.length?()=>{setPage(detail[detail.length-1].parentPage);setDetail(v=>v.slice(0,-1))}:null})},[track,detail,onNavigation]);

 useEffect(()=>()=>onNavigation({back:null}),[onNavigation]);

 const requestId=useRef(0);const active=detail.at(-1);const effective=tab==='Search'?'Tracks':kind;

 useEffect(()=>{let live=true;browse(account.id,'getMusicFolders').then(v=>{if(live)setFolders(v.musicFolders?.musicFolder??[])}).catch(()=>{});return()=>{live=false}},[account.id]);

 // The legacy preview resets navigation when its externally selected tab changes.

 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{setPage(0);setDetail([]);setTrack(null)},[tab]);

 useEffect(()=>{

  // Clear the previous server response while starting this external request.

  // eslint-disable-next-line react-hooks/set-state-in-effect
  const token=++requestId.current;setBusy(true);setError('');setItems([]);setMore(false);

  (async()=>{

   const scope:Record<string,string>=folder?{musicFolderId:folder}:{};let rows:Entry[]=[];let hasMore=false;

   if(active){const method={album:'getAlbum',artist:'getArtist',playlist:'getPlaylist'}[active.kind];const r=await browse(account.id,method,{id:active.entry.id});rows=active.kind==='album'?r.album?.song??[]:active.kind==='artist'?r.artist?.album??[]:r.playlist?.entry??[];hasMore=rows.length>(page+1)*40;rows=rows.slice(page*40,(page+1)*40)}

   else if(effective==='Albums'){const r=await browse(account.id,'getAlbumList2',{type:tab==='Home'||tab==='Explore'?'newest':'alphabeticalByName',size:'40',offset:String(page*40),...scope});rows=r.albumList2?.album??[];hasMore=rows.length===40}

   else if(effective==='Artists'){const r=await browse(account.id,'getArtists',scope);rows=(r.artists?.index??[]).flatMap((x:any)=>x.artist??[]);hasMore=rows.length>(page+1)*40;rows=rows.slice(page*40,(page+1)*40)}

   else if(effective==='Playlists'){const r=await browse(account.id,'getPlaylists');rows=r.playlists?.playlist??[];hasMore=rows.length>(page+1)*40;rows=rows.slice(page*40,(page+1)*40)}

   else{const r=await browse(account.id,'search3',{query:search,songCount:'40',songOffset:String(page*40),albumCount:'0',artistCount:'0',...scope});rows=r.searchResult3?.song??[];hasMore=rows.length===40}

   if(token===requestId.current){setItems(rows);setMore(hasMore)}

  })().catch(e=>{if(token===requestId.current)setError(message(e))}).finally(()=>{if(token===requestId.current)setBusy(false)});

  return()=>{requestId.current=token+1};

 },[account.id,effective,active,folder,page,search,revision,refresh,tab]);

 function selectKind(k:Kind){setKind(k);setDetail([]);setTrack(null);setPage(0)}

 function open(entry:Entry){const target=active?.kind==='artist'?'album':active?'track':effective==='Albums'?'album':effective==='Artists'?'artist':effective==='Playlists'?'playlist':'track';if(target==='track'){setTrack(entry);return}setDetail(v=>[...v,{kind:target,entry,parentPage:page}]);setPage(0);setTrack(null)}

 const isTracks=active?active.kind!=='artist':effective==='Tracks';

 return <View style={{gap:18}}>

 {track?<View style={s.trackPanel}><Pressable accessibilityRole="button" accessibilityLabel="Back to tracks" style={[s.line,{minHeight:48}]} onPress={()=>setTrack(null)}><Icon name="back"/><Text style={s.text}>Back to tracks</Text></Pressable><View style={s.largeArt}><RemoteArt account={account.id} id={track.coverArt}/></View><Text style={s.title}>{track.title}</Text><Text style={s.muted}>{track.artist} · {track.album}</Text><Text style={s.muted}>{track.suffix?.toUpperCase()} · {time(track.duration??0)}</Text><Text style={s.notice}>This is your real server metadata. Playback will be enabled when the native MPV service is ready.</Text></View>:<>

 {active?<View style={s.line}><Pressable accessibilityLabel="Back to library" style={s.icon} onPress={()=>{setPage(active.parentPage);setDetail(v=>v.slice(0,-1))}}><Icon name="back"/></Pressable><Text style={[s.title,{flex:1,fontSize:22}]}>{active.entry.name??active.entry.title}</Text></View>:<><ScrollView horizontal showsHorizontalScrollIndicator={false}>{(['Albums','Artists','Playlists','Tracks'] as Kind[]).map(k=><Pressable accessibilityRole="tab" accessibilityState={{selected:effective===k}} key={k} style={[s.tab,effective===k&&s.active]} onPress={()=>selectKind(k)} disabled={tab==='Search'}><Text style={s.text}>{k}</Text></Pressable>)}</ScrollView>{folders.length>1&&<ScrollView horizontal><Pressable style={s.tab} onPress={()=>{setFolder('');setPage(0)}}><Text style={!folder?s.accent:s.muted}>All libraries</Text></Pressable>{folders.map(f=><Pressable key={f.id} style={s.tab} onPress={()=>{setFolder(f.id);setPage(0)}}><Text style={folder===f.id?s.accent:s.muted}>{f.name}</Text></Pressable>)}</ScrollView>}{effective==='Tracks'&&<View style={s.line}><View style={s.search}><Icon name="search" size={20}/><TextInput style={s.input} accessibilityLabel="Search your music" placeholder="Search your music" placeholderTextColor="#91a198" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={()=>{setSearch(query.trim());setPage(0)}}/></View><Pressable style={s.icon} accessibilityLabel="Submit search" onPress={()=>{setSearch(query.trim());setPage(0)}}><Icon name="arrow"/></Pressable></View>}</>}

 {busy?<ActivityIndicator color="#1ed760"/>:error?<View style={s.trackPanel}><Text style={s.notice}>{error}</Text><Pressable style={s.tab} onPress={()=>setRevision(v=>v+1)}><Text style={s.accent}>Retry</Text></Pressable></View>:<><View style={!isTracks?s.grid:undefined}>{items.map((entry,i)=><Pressable accessibilityRole="button" accessibilityLabel={'Open '+(entry.title??entry.name)} key={entry.id+':'+i} style={isTracks?s.row:s.card} onPress={()=>open(entry)}><View style={isTracks?s.thumb:s.cover}><RemoteArt account={account.id} id={entry.coverArt}/></View><View style={isTracks?{flex:1,gap:3}:s.copy}><Text numberOfLines={2} style={s.strong}>{entry.title??entry.name}</Text><Text numberOfLines={1} style={s.muted}>{entry.artist??(entry.songCount!==undefined?entry.songCount+' tracks':entry.albumCount!==undefined?entry.albumCount+' albums':'')}</Text></View>{isTracks&&<Text style={s.muted}>{time(entry.duration??0)}</Text>}</Pressable>)}</View>{!items.length&&<Text style={s.muted}>No results in this view.</Text>}</>}

 <View style={[s.line,{justifyContent:'space-between'}]}><Pressable disabled={!page||busy} style={s.tab} onPress={()=>setPage(p=>p-1)}><Text style={!page?s.muted:s.accent}>Previous</Text></Pressable><Text style={s.muted}>Page {page+1}</Text><Pressable disabled={!more||busy} style={s.tab} onPress={()=>setPage(p=>p+1)}><Text style={!more?s.muted:s.accent}>Next</Text></Pressable></View>

 </>}

 </View>

}

const s=StyleSheet.create({line:{flexDirection:'row',alignItems:'center',gap:12},eyebrow:{fontFamily:'DMSans_600SemiBold',fontSize:11,letterSpacing:1.4,color:'#c9ded2'},muted:{fontFamily:'DMSans_400Regular',fontSize:13,lineHeight:20,color:'#a5afa9'},text:{fontFamily:'DMSans_400Regular',fontSize:15,color:'#eff3ef'},strong:{fontFamily:'DMSans_700Bold',fontSize:15,color:'#eff3ef'},title:{fontFamily:'Sora_600SemiBold',fontSize:26,color:'#eff3ef'},icon:{height:48,width:48,alignItems:'center',justifyContent:'center'},tab:{paddingHorizontal:14,paddingVertical:15,minHeight:48},active:{borderBottomWidth:2,borderColor:'#1ed760'},accent:{fontFamily:'DMSans_600SemiBold',color:'#1ed760',fontSize:14},search:{flex:1,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#202a24',borderRadius:12,paddingHorizontal:14},input:{flex:1,color:'#eff3ef',fontFamily:'DMSans_400Regular',fontSize:15,minHeight:50},grid:{flexDirection:'row',flexWrap:'wrap',gap:14},card:{width:'47%',marginBottom:12},cover:{width:'100%',aspectRatio:1,borderRadius:12,overflow:'hidden'},copy:{gap:4,paddingTop:9},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10},thumb:{width:48,height:48,borderRadius:8,overflow:'hidden'},placeholder:{flex:1,backgroundColor:'#263e32',alignItems:'center',justifyContent:'center'},trackPanel:{gap:16},largeArt:{width:'100%',aspectRatio:1,borderRadius:18,overflow:'hidden'},notice:{backgroundColor:'#1b2921',padding:16,borderRadius:12,color:'#c6d6cc',fontFamily:'DMSans_400Regular',fontSize:14,lineHeight:22}});



