import {z} from 'zod'
import type {QueueItem} from './types'
import {progressKey} from './timeline'

const id=z.string().min(1).max(2048)
export const mixSourceSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('navidrome'),serverId:id,libraryId:id}).strict(),
  z.object({kind:z.literal('local'),rootId:id}).strict(),
])
export type MixSource=z.infer<typeof mixSourceSchema>
export const textFields=['title','artist','album','genre','format'] as const
export const numberFields=['year','duration','rating','playCount'] as const
export const mixConditionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('text'),field:z.enum(textFields),operator:z.enum(['contains','equals','excludes']),value:z.string().trim().min(1).max(300)}).strict(),
  z.object({type:z.literal('number'),field:z.enum(numberFields),operator:z.enum(['atLeast','atMost','equals']),value:z.number().finite().min(0).max(1000000)}).strict(),
  z.object({type:z.literal('favorite'),value:z.boolean()}).strict(),
])
export const mixDefinitionSchema=z.object({
  id:z.string().uuid(),name:z.string().trim().min(1).max(100),description:z.string().max(1000),
  sources:z.array(mixSourceSchema).min(1).max(10).refine(a=>new Set(a.map(sourceKey)).size===a.length,'Choose each source once.'),
  match:z.enum(['all','any']),groups:z.array(z.object({match:z.enum(['all','any','none']),conditions:z.array(mixConditionSchema).min(1).max(12)}).strict()).max(8),
  sort:z.enum(['random','title','artist','album','year','duration','playCount']),descending:z.boolean(),limit:z.number().int().min(1).max(1000),
  artistLimit:z.number().int().min(0).max(100),
}).strict()
export type MixDefinition=z.infer<typeof mixDefinitionSchema>
export type MixCondition=z.infer<typeof mixConditionSchema>
export interface MixTrack {item:QueueItem;title:string;artist:string;album:string;genre?:string;format?:string;year?:number;duration:number;rating?:number;playCount?:number;favorite:boolean}
export interface MixPreview {items:QueueItem[];matched:number;scanned:number;warnings:string[];artists:string[];genres:string[]}
export function sourceKey(s:MixSource){return s.kind==='local'?JSON.stringify(['local',s.rootId]):JSON.stringify(['navidrome',s.serverId,s.libraryId])}
const normalized=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().trim()
export function matchesMix(t:MixTrack,m:MixDefinition):boolean{
  const condition=(c:MixCondition)=>{
    if(c.type==='favorite')return t.favorite===c.value
    const value=t[c.field]
    // Missing metadata cannot satisfy a negative or numeric condition.
    if(value===undefined||value==='')return false
    if(c.type==='text'){const a=normalized(String(value)),b=normalized(c.value);return c.operator==='contains'?a.includes(b):c.operator==='excludes'?!a.includes(b):a===b}
    return c.operator==='atLeast'?Number(value)>=c.value:c.operator==='atMost'?Number(value)<=c.value:Number(value)===c.value
  }
  if(!m.groups.length)return true
  const groups=m.groups.map(g=>g.match==='all'?g.conditions.every(condition):g.match==='any'?g.conditions.some(condition):!g.conditions.some(condition))
  return m.match==='all'?groups.every(Boolean):groups.some(Boolean)
}
export function selectMix(tracks:MixTrack[],m:MixDefinition,random= Math.random){
  const unique=[...new Map(tracks.map(t=>[progressKey(t.item.target),t])).values()]
  let selected=unique.filter(t=>matchesMix(t,m));const matched=selected.length
  if(m.sort==='random'){for(let i=selected.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]]}}
  else {const field=m.sort;selected.sort((a,b)=>{const av=a[field],bv=b[field];if(av===undefined)return bv===undefined?0:1;if(bv===undefined)return -1;const cmp=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});return (m.descending?-1:1)*cmp})}
  const artists=new Map<string,number>()
  selected=selected.filter(t=>{const key=normalized(t.artist);if(!key||!m.artistLimit)return true;const n=artists.get(key)??0;if(n>=m.artistLimit)return false;artists.set(key,n+1);return true}).slice(0,m.limit)
  return {items:selected.map(t=>t.item),matched,scanned:unique.length}
}
