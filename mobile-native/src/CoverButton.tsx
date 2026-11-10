import React,{useState} from 'react';
import {useApp} from './AppState';import {IconButton} from './ui';import {ActionSheet} from './ActionSheet';import {customMedia,clearCovers,message} from './library';
export function CoverButton({account,id}:{account:string;id?:string}){const app=useApp(),[open,setOpen]=useState(false),[busy,setBusy]=useState(false);if(!id)return null;
 async function change(reset=false){setBusy(true);try{const changed=await(reset?customMedia.resetCover(account,id!):customMedia.cover(account,id!));if(changed){clearCovers();app.setPrefs({artworkRevision:Date.now()});app.setNotice(reset?'Server cover restored.':'Custom cover saved on this device.')}}catch(e){app.setNotice(message(e))}finally{setBusy(false)}}
 return <><IconButton icon="edit" label={busy?'Saving cover':'Change cover'} onPress={()=>{if(!busy)setOpen(true)}}/>{open&&<ActionSheet title="Cover artwork" onClose={()=>setOpen(false)} actions={[{label:'Choose cover image',icon:'edit',run:()=>void change()},{label:'Restore server cover',icon:'refresh',run:()=>void change(true)}]}/>}</>;
}
