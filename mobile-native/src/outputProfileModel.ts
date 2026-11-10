import type {AudioOptions,PlaybackPolicy} from './library';
import {validateEqProfile} from './eqProfiles.ts';
export type OutputProfile={id:string;name:string;audio:AudioOptions;policy:PlaybackPolicy;volume:number};
export function outputProfile(raw:unknown):OutputProfile {
 const p=raw as OutputProfile;
 if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>48||!p.audio||!p.policy)throw Error('Choose a name and valid audio settings.');
 const a=p.audio,eq=validateEqProfile({id:p.id,name:p.name,bands:a.bands,eqPreamp:a.eqPreamp,parametric:a.parametric,filters:a.filters});
 if(!['no','track','album'].includes(a.replayGain)||!Number.isFinite(a.preamp)||a.preamp< -12||a.preamp>6||!Number.isFinite(a.fallback??0)||(a.fallback??0)< -12||(a.fallback??0)>0||typeof a.equalizer!=='boolean'||!Number.isFinite(p.volume)||p.volume<0||p.volume>100||![0,5,10,15,30].includes(p.policy.rewind)||!['track','seek','disabled'].includes(p.policy.headset))throw Error('Invalid audio profile.');
 return {id:p.id,name:p.name.trim(),audio:{replayGain:a.replayGain,preamp:a.preamp,fallback:a.fallback??0,equalizer:a.equalizer,speech:!!a.speech,silence:["off","gentle","balanced","strong"].includes(a.silence??"off")?a.silence??"off":"off",bands:eq.bands,eqPreamp:eq.eqPreamp,parametric:!!eq.parametric,filters:eq.filters??[]},policy:{...p.policy},volume:p.volume};
}
export function readOutputProfiles(raw:unknown):OutputProfile[]{return Array.isArray(raw)?raw.slice(0,30).flatMap(p=>{try{return [outputProfile(p)]}catch{return []}}):[]}
export function saveOutputProfile(rows:OutputProfile[],raw:unknown){const p=outputProfile(raw);if(rows.some(r=>r.id!==p.id&&r.name.toLocaleLowerCase()===p.name.toLocaleLowerCase()))throw Error('A profile with that name already exists.');if(rows.length>=30&&!rows.some(r=>r.id===p.id))throw Error('You can save up to 30 output profiles.');return [...rows.filter(r=>r.id!==p.id),p]}
export function safeProfileVolume(saved:number,current:number){return Math.min(saved,Number.isFinite(current)?Math.max(0,Math.min(100,current)):0)}
