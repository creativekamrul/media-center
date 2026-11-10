import {buildRuleMix,mediaKey,type MixCandidate} from './mixRules.ts';
import {allowedRecommendation,readFeedback} from './recommendationFeedback.ts';
export type RadioSource={id:string;kind:'navidrome'|'downtify'|'jellyfin'|'device'};
export type RadioTrack=MixCandidate&{kind?:string;album?:string};
export type RadioRow=Omit<RadioTrack,'account'>&{account?:string};
export type RadioPorts={similar:(source:RadioSource,seed:RadioTrack)=>Promise<RadioRow[]>;search:(source:RadioSource,artist:string)=>Promise<RadioRow[]>};
const normalized=(s:string)=>s.normalize('NFKC').trim().toLocaleLowerCase();
const music=(t:RadioRow)=>typeof t?.id==='string'&&t.id.length>0&&t.id.length<=512&&(t.artist===undefined||typeof t.artist==='string')&&(!t.kind||['track','music','local'].includes(t.kind));
const recordingKey=(t:RadioTrack)=>typeof t.title==='string'&&!!t.title.trim()&&typeof t.artist==='string'&&!!t.artist.trim()&&typeof t.album==='string'&&!!t.album.trim()&&Number.isFinite(t.duration)&&(t.duration??0)>0?JSON.stringify([t.title,t.artist,t.album].map(normalized)):'';
async function bounded<T>(work:Promise<T>,ms:number):Promise<T>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Radio source timed out')),ms)})])}finally{if(timer)clearTimeout(timer)}}
/** Discovery metadata supplies artist names only; every enqueued candidate must be a saved-library lookup. */
export async function planLibraryRadio(input:RadioSource[],seed:RadioTrack,ports:RadioPorts,feedback:unknown,timeout=8000,now=Date.now()){
 const eligible=input.filter(s=>typeof s.id==='string'&&s.id.length>0&&s.id.length<=512&&['navidrome','downtify','jellyfin','device'].includes(s.kind));const source=eligible.find(s=>s.id===seed.account);if(!source||!music(seed))throw Error('Choose a saved music track for radio.');
 const sources=[source,...eligible.filter(s=>s.id!==source.id)].filter((s,i,all)=>all.findIndex(v=>v.id===s.id)===i).slice(0,8);
 let failed=0;const semantic=new Set<string>();let related:RadioRow[]=[];
 if(source.kind!=='device')try{related=(await bounded(ports.similar(source,seed),timeout)).filter(music).slice(0,60)}catch{failed++}
 // Navidrome and Jellyfin similarity responses contain only that user's library tracks.
 const direct=source.kind==='downtify'?[]:related.map(t=>({...t,account:source.id}));direct.forEach(t=>semantic.add(mediaKey(t)));
 const artists=[seed.artist??'',...related.map(t=>t.artist??'')].filter(a=>!!a.trim()&&a.length<=200);const seen=new Set<string>();const queries=artists.filter(a=>{const k=normalized(a);if(seen.has(k))return false;seen.add(k);return true}).slice(0,4);
 const artistMatches=(artist:string|undefined,query:string)=>{const value=normalized(artist??''),name=normalized(query);return value===name||value.split(/\s*(?:,|;|\s&\s|\sfeat\.?\s|\sfeaturing\s)\s*/).includes(name)};
 const requests=sources.flatMap(s=>queries.map(artist=>({source:s,artist})));
 const results=await Promise.allSettled(requests.map(async r=>{const rows=await bounded(ports.search(r.source,r.artist),timeout);return rows.filter(music).filter(t=>artistMatches(t.artist,r.artist)).slice(0,60).map(t=>({...t,account:r.source.id}))}));
 const candidates=[...direct];for(let i=0;i<results.length;i++){const result=results[i];if(result.status==='rejected'){failed++;continue}const rows=result.value;candidates.push(...rows);if(normalized(requests[i].artist)!==normalized(seed.artist??''))rows.forEach(t=>semantic.add(mediaKey(t)))}
 const f=readFeedback(feedback),filtered:RadioTrack[]=[],identities=new Set([mediaKey(seed)]),recordings=new Map<string,Map<number,number>>();
 const repeatedRecording=(t:RadioTrack)=>{const key=recordingKey(t);if(!key)return false;const second=Math.floor(t.duration!),known=recordings.get(key)??new Map<number,number>();for(let i=second-2;i<=second+2;i++){const duration=known.get(i);if(duration!==undefined&&Math.abs(duration-t.duration!)<=2)return true}known.set(second,t.duration!);recordings.set(key,known);return false};
 repeatedRecording(seed);
 for(const t of candidates){const key=mediaKey(t);if(identities.has(key)||!allowedRecommendation(f,t.account,t)||repeatedRecording(t))continue;identities.add(key);filtered.push(t)}
 const tracks=buildRuleMix(filtered,{id:'library-radio',name:'Library radio',sources:sources.map(s=>s.id),genres:[],artists:[],count:29,familiarity:'balanced',refresh:'daily',seed:[seed.account,seed.id].join(':').split('').reduce((s,c)=>Math.imul(s^c.charCodeAt(0),16777619),1)},[],[],now);
 if(!tracks.length)throw Error('No related saved music was available. Try another track or reconnect a library.');
 return {tracks:[seed,...tracks],related:tracks.filter(t=>semantic.has(mediaKey(t))).length,failed,limited:input.length>sources.length};
}
