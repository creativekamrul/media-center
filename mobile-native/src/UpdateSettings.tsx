import {useApp} from './AppState';
import React,{useState} from 'react';
import {View,ActivityIndicator} from 'react-native';
import {updates,message} from './library';
import {T,Button} from './ui';
export function UpdateSettings(){
 const app=useApp();const [notes,setNotes]=useState('');const [busy,setBusy]=useState(false),[available,setAvailable]=useState(false),[status,setStatus]=useState('Android updates from GitHub.');
 async function check(){setBusy(true);setAvailable(false);try{const r=await updates.check();setAvailable(r.available);setNotes(r.notes??'');setStatus(r.available?`${r.name} · installed ${r.installed}`:r.message??'No update available.')}catch(e){setStatus(message(e))}finally{setBusy(false)}}
 async function install(){setBusy(true);setStatus('Downloading and verifying the update…');try{setStatus(await updates.install())}catch(e){setStatus(message(e))}finally{setBusy(false)}}
 return <View style={{gap:12}}><T strong>App updates</T><View style={{flexDirection:'row',gap:12}}>{['stable','preview'].map(channel=><Button key={channel} label={channel} primary={(app.prefs.updateChannel??'stable')===channel} disabled={busy} onPress={()=>{app.setPrefs({updateChannel:channel});setAvailable(false);setNotes('');setStatus('Channel changed. Check again for matching releases.')}}/>)}</View><T>{status}</T>{!!notes&&<><T strong>Release notes</T><T muted>{notes}</T></>}{busy&&<ActivityIndicator/>}<Button disabled={busy} label="Check GitHub for updates" onPress={check}/>{available&&<Button disabled={busy} label="Download & install update" onPress={install}/>}</View>;
}
