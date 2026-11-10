import {browse,jellyfin,deviceLibrary,type Account,type Entry} from './library';
import type {MixCandidate} from './mixRules';
export async function readMixSource(account:Account|undefined,onProgress:(n:number)=>void,isCancelled:()=>boolean):Promise<{tracks:MixCandidate[];limited:boolean}>{
 if(!account){const data=await deviceLibrary.list();return {tracks:data.files.map(t=>({...t,account:'device'})),limited:false}}
 if(account.type==='audiobookshelf')throw Error('Spoken libraries cannot be used in a music mix.');
 const tracks:MixCandidate[]=[],seen=new Set<string>();let offset=0;
 while(!isCancelled()&&offset<20000){let rows:Entry[];
  if(account.type==='jellyfin'){const r=await jellyfin.browse(account.id,'music','',offset);rows=(r.items??[]).filter(t=>t.kind==='track')}
  else{const r=await browse(account.id,'search3',{query:'',songCount:'40',songOffset:String(offset),albumCount:'0',artistCount:'0'});rows=r.searchResult3?.song??[]}
  let added=0;for(const t of rows){if(!seen.has(t.id)){seen.add(t.id);tracks.push({...t,account:account.id});added++}}
  offset+=rows.length;onProgress(tracks.length);if(rows.length<40||!added)return {tracks,limited:false};
 }
 return {tracks,limited:offset>=20000};
}
