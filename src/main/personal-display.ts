import type {PersonalState,MediaRef} from '../shared/personal-library'
import {mediaKey,personalTargetSchema} from '../shared/personal-library'
import {applyMetadata} from '../shared/personal-state'
import type {Store} from './store'
/** Display-only overlay; transport identities and original media remain untouched. */
export function decoratePersonal(value:unknown,store:Store,input?:unknown):unknown{
 const overrides=store.get<PersonalState>('personal-library')?.metadata
 if(!overrides||!Object.keys(overrides).length)return value
 const context=input&&typeof input==='object'?input as Record<string,unknown>:{}
 const walk=(value:unknown):unknown=>{
  if(Array.isArray(value))return value.map(walk)
  if(!value||typeof value!=='object')return value
  const original=value as Record<string,unknown>,v=Object.fromEntries(Object.entries(original).map(([k,v])=>[k,walk(v)]));let ref:MediaRef|undefined
  if(v.target){const t=personalTargetSchema.safeParse(v.target);if(t.success)ref={kind:'playable',item:{target:t.data,title:String(v.title??''),subtitle:String(v.subtitle??'')}}}
  else if(typeof v.id==='string'&&typeof v.serverId==='string'){
   const shared={serverId:v.serverId,id:v.id,title:String(v.title??''),subtitle:String(v.subtitle??'')}
   if(v.kind==='music-track')ref={kind:'playable',item:{title:shared.title,subtitle:String(v.artist??''),target:{kind:'music-track',serverId:v.serverId,trackId:v.id}}}
   else if(v.kind==='audiobook')ref={kind:'playable',item:{title:shared.title,subtitle:shared.subtitle,target:{kind:'audiobook',serverId:v.serverId,bookId:v.id}}}
   else if(v.kind==='podcast-episode'&&typeof v.showId==='string')ref={kind:'playable',item:{title:shared.title,subtitle:shared.subtitle,target:{kind:'podcast-episode',serverId:v.serverId,showId:v.showId,episodeId:v.id}}}
   else if(['album','playlist','artist','podcast-show'].includes(String(v.kind)))ref={...shared,kind:v.kind as 'album'|'playlist'|'artist'|'podcast-show'}
  }else if(typeof context.rootId==='string'&&typeof v.id==='string'&&'hasCover' in v)ref={kind:'playable',item:{title:String(v.title??''),subtitle:String(v.artist??''),target:{kind:'local-file',serverId:'local',rootId:context.rootId,fileId:v.id}}}
  if(ref&&typeof v.title==='string')return applyMetadata(v as {title:string},overrides[mediaKey(ref)])
  return v
 }
 const result=walk(value) as Record<string,unknown>
 if(context.kind&&typeof context.id==='string'&&typeof context.serverId==='string'&&result&&typeof result.title==='string'&&['album','artist','playlist'].includes(String(context.kind))){const ref={kind:context.kind as 'album'|'artist'|'playlist',id:context.id,serverId:context.serverId,title:result.title,subtitle:String(result.subtitle??'')};return applyMetadata(result as {title:string},overrides[mediaKey(ref)])}
 return result
}
