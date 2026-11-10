import React,{useState} from 'react';

import {View,Text,TextInput,Pressable,Switch,ActivityIndicator,Alert,StyleSheet} from 'react-native';

import {usePalette,type Palette} from './AppState';

import {Icon} from './Icon';

import {saveAccount,testAccount,removeAccount,message,clearCovers,type Account} from './library';

export function Connections({items,changed}:{items:Account[];changed:()=>Promise<void>}){

 const c=usePalette(),s=styles(c);

 const [editing,setEditing]=useState<Partial<Account>|null>(null),[name,setName]=useState(''),[url,setUrl]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[allowHttp,setAllowHttp]=useState(false);

 const [apiKey,setApiKey]=useState('');

 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');

 function edit(account:Partial<Account>){setEditing(account);setApiKey('');setName(account.name??(account.type==='jellyfin'?'Jellyfin':account.type==='downtify'?'Downtify':account.type==='audiobookshelf'?'Audiobookshelf':'Navidrome'));setUrl(account.url??'');setUsername(account.username??'');setPassword('');setAllowHttp(account.allowHttp??false);setStatus('')}

 async function save(){setBusy(true);setStatus('');try{await saveAccount({...editing,name,url,username,password,apiKey,allowHttp});setPassword('');clearCovers();setEditing(null);await changed();setStatus('Connection tested and saved.')}catch(e){setStatus(message(e))}finally{setBusy(false)}}

 async function test(account:Account){setBusy(true);try{const version=await testAccount(account.id);setStatus(account.name+' connected · '+version)}catch(e){setStatus(message(e))}finally{setBusy(false)}}

 function remove(account:Account){Alert.alert('Remove '+account.name+'?','This removes the saved connection from this phone. It does not change your server.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{setBusy(true);try{await removeAccount(account.id);clearCovers();await changed();setStatus('Connection removed.')}catch(e){setStatus(message(e))}finally{setBusy(false)}}}])}

 return <View style={s.section}><Text style={s.heading}>Connections</Text><Text style={s.muted}>Connect your music, audiobook and podcast libraries. Original audio plays through the native MPV engine.</Text>

 {items.map(a=><View style={s.account} key={a.id}><View style={s.line}><Icon color={c.text} name="server"/><View style={{flex:1}}><Text style={s.strong}>{a.name}</Text><Text style={s.muted}>{a.url}</Text><Text style={s.muted}>{a.username} · {a.version}</Text></View></View><View style={s.line}><Pressable disabled={busy} style={s.action} onPress={()=>test(a)}><Icon color={c.text} name="refresh" size={18}/><Text style={s.text}>Test</Text></Pressable><Pressable disabled={busy} style={s.action} onPress={()=>edit(a)}><Icon color={c.text} name="edit" size={18}/><Text style={s.text}>Edit</Text></Pressable><Pressable disabled={busy} accessibilityLabel={'Remove '+a.name} style={s.action} onPress={()=>remove(a)}><Icon color={c.text} name="trash" size={18}/></Pressable></View></View>)}

 {editing===null?<View style={[s.line,{flexWrap:'wrap'}]}><Pressable style={s.primary} disabled={busy} onPress={()=>edit({type:'navidrome'})}><Icon name="plus" color={c.bg}/><Text style={s.primaryText}>Add Navidrome</Text></Pressable><Pressable style={s.action} disabled={busy} onPress={()=>edit({type:'downtify'})}><Text style={s.text}>Add Downtify</Text></Pressable><Pressable style={s.action} disabled={busy} onPress={()=>edit({type:'audiobookshelf'})}><Text style={s.text}>Add Audiobookshelf</Text></Pressable><Pressable style={s.action} disabled={busy} onPress={()=>edit({type:'jellyfin'})}><Text style={s.text}>Add Jellyfin</Text></Pressable></View>:<View style={s.form}>

 <Text style={s.strong}>{editing.id?'Edit connection':'New '+(editing.type==='jellyfin'?'Jellyfin':editing.type==='downtify'?'Downtify':editing.type==='audiobookshelf'?'Audiobookshelf':'Navidrome')+' connection'}</Text>

 {([{label:'Name',value:name,set:setName},{label:'Server URL',value:url,set:setUrl},...(editing.type==='audiobookshelf'?[{label:'API key',value:apiKey,set:setApiKey}]:[{label:'Username',value:username,set:setUsername},{label:'Password',value:password,set:setPassword}])] as const).map(f=><View key={f.label}><Text style={s.label}>{f.label}{(f.label==='Password'||f.label==='API key')&&editing.id?' · Leave blank to keep current':''}</Text><TextInput accessibilityLabel={f.label} style={s.input} value={f.value} onChangeText={f.set} editable={!busy} secureTextEntry={(f.label==='Password'||f.label==='API key')} autoCapitalize="none" autoCorrect={false} keyboardType={f.label==='Server URL'?'url':'default'} placeholder={f.label==='Server URL'?'https://music.example.com':''} placeholderTextColor={c.muted}/></View>)}

 <View style={s.line}><Text style={[s.text,{flex:1}]}>Allow unencrypted HTTP</Text><Switch accessibilityLabel="Allow unencrypted HTTP" disabled={busy} value={allowHttp} onValueChange={setAllowHttp}/></View>{allowHttp&&<Text style={s.muted}>HTTP exposes authentication tokens and library traffic to the network. Use it only on a network you trust.</Text>}

 <View style={s.line}><Pressable disabled={busy} style={s.primary} onPress={save}><Text style={s.primaryText}>Test & save</Text></Pressable><Pressable disabled={busy} style={s.action} onPress={()=>{setEditing(null);setPassword('');setStatus('')}}><Text style={s.text}>Cancel</Text></Pressable></View>

 </View>}{busy&&<ActivityIndicator color={c.accent}/>}{!!status&&<Text accessibilityLiveRegion="polite" style={s.status}>{status}</Text>}

 <Text style={s.muted}>Your desktop connections are not copied automatically. Jellyfin plays original files without server transcoding.</Text>

 </View>

}

const styles=(c:Palette)=>StyleSheet.create({section:{gap:16},heading:{fontFamily:'Sora_600SemiBold',fontSize:21,color:c.text},muted:{fontFamily:'DMSans_400Regular',fontSize:13,lineHeight:20,color:c.muted},text:{fontFamily:'DMSans_400Regular',fontSize:15,color:c.text},strong:{fontFamily:'DMSans_700Bold',fontSize:16,color:c.text},line:{flexDirection:'row',alignItems:'center',gap:12},account:{backgroundColor:c.panel,borderRadius:16,padding:16,gap:12},action:{flexDirection:'row',alignItems:'center',gap:8,padding:12,minHeight:48},primary:{backgroundColor:c.accent,borderRadius:12,padding:14,minHeight:48,alignItems:'center',flexDirection:'row',gap:8,justifyContent:'center'},primaryText:{color:c.bg,fontFamily:'DMSans_700Bold',fontSize:15},form:{gap:18},label:{fontFamily:'DMSans_600SemiBold',fontSize:13,color:c.muted,marginBottom:7},input:{backgroundColor:c.panel,borderRadius:10,padding:14,minHeight:48,color:c.text,fontFamily:'DMSans_400Regular',fontSize:15},status:{fontFamily:'DMSans_600SemiBold',fontSize:14,lineHeight:21,color:c.text}});

