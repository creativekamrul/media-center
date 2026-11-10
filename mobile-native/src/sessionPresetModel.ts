export type SessionPreset={id:string;name:string;speed:number;volume:number;sleepMinutes:number};
export function sessionPreset(value:SessionPreset):SessionPreset {
 if(!value||typeof value.id!=='string'||!value.id||typeof value.name!=='string'||!value.name.trim()||value.name.length>48||!Number.isFinite(value.speed)||value.speed<.5||value.speed>3||!Number.isFinite(value.volume)||value.volume<0||value.volume>100||!Number.isFinite(value.sleepMinutes)||value.sleepMinutes<0||value.sleepMinutes>240)throw Error('Enter a name and valid playback levels.');
 return {id:value.id,name:value.name.trim(),speed:value.speed,volume:value.volume,sleepMinutes:value.sleepMinutes};
}
export function readSessions(raw:unknown):SessionPreset[]{return Array.isArray(raw)?raw.slice(0,30).flatMap(v=>{try{return [sessionPreset(v)]}catch{return []}}):[];}
