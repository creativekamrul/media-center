import {readOutputProfiles} from './outputProfileModel.ts';
import {readEqProfiles} from './eqProfiles.ts';
const colors=['bg','panel','text','muted','accent'];
const palettes=['amoled','snow','graphite','sand','charcoal','midnight','plum','paper'];
export function portableSettings(raw:Record<string,unknown>){const out:Record<string,unknown>={};
 if(palettes.includes(String(raw.palette)))out.palette=raw.palette;
 if(['solid','blurred','frosted','glass'].includes(String(raw.material)))out.material=raw.material==='glass'?'frosted':raw.material;
 for(const key of ['reduceMotion','playerBackdrop','automaticContinuation','musicSourceFallback'])if(typeof raw[key]==='boolean')out[key]=raw[key];
 for(const [key,min,max] of [['glassOpacity',.08,.85],['glassRefraction',0,1],['lyricsSize',12,64]] as const)if(typeof raw[key]==='number'&&Number.isFinite(raw[key])&&raw[key]>=min&&raw[key]<=max)out[key]=raw[key];
 if(['left','center'].includes(String(raw.lyricsAlign)))out.lyricsAlign=raw.lyricsAlign;
 if(raw.colors&&typeof raw.colors==='object')out.colors=Object.fromEntries(Object.entries(raw.colors).filter(([k,v])=>colors.includes(k)&&typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v)));
 if(Array.isArray(raw.homeSections))out.homeSections=raw.homeSections.filter((x:unknown)=>typeof x==='string'&&x.length<80).slice(0,30);
 if(Array.isArray(raw.eqProfiles))out.eqProfiles=readEqProfiles(raw.eqProfiles);
 if(Array.isArray(raw.outputProfiles))out.outputProfiles=readOutputProfiles(raw.outputProfiles);
 return out;
}
export function encodeSettings(raw:Record<string,unknown>){return JSON.stringify({format:'media-center-settings',version:1,settings:portableSettings(raw)},null,2)}
export function decodeSettings(text:string){if(text.length>250000)throw Error('Settings backup is too large.');const data=JSON.parse(text);if(data?.format!=='media-center-settings'||data.version!==1||!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings))throw Error('Choose a Media Center version 1 settings backup.');return portableSettings(data.settings)}
