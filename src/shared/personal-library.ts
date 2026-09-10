import {mixDefinitionSchema,type MixDefinition,type MixPreview,type MixSource} from './mixes'
import {z} from 'zod'
import type {QueueItem} from './types'
const id=z.string().min(1).max(2048),text=z.string().trim().max(2000)
export const personalTargetSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('music-track'),serverId:id,trackId:id}).strict(),
 z.object({kind:z.literal('audiobook'),serverId:id,bookId:id}).strict(),
 z.object({kind:z.literal('podcast-episode'),serverId:id,showId:id,episodeId:id}).strict(),
 z.object({kind:z.literal('local-file'),serverId:z.literal('local'),rootId:id,fileId:id}).strict(),
 z.object({kind:z.literal('radio'),serverId:id,stationId:id}).strict()])
export const personalItemSchema=z.object({target:personalTargetSchema,title:text,subtitle:text,cover:id.optional(),context:text.optional(),duration:z.number().finite().nonnegative().optional()}).strict()
export const mediaRefSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('playable'),item:personalItemSchema}).strict(),
 z.object({kind:z.enum(['album','playlist','artist','podcast-show']),serverId:id,id,title:text,subtitle:text.default(''),cover:id.optional()}).strict()])
export type MediaRef=z.infer<typeof mediaRefSchema>
export {progressKey as targetKey} from './timeline'
import {progressKey as targetKey} from './timeline'
export function mediaKey(r:MediaRef){return r.kind==='playable'?targetKey(r.item.target):JSON.stringify([r.serverId,r.kind,r.id])}
export const showPreferenceSchema=z.object({speed:z.number().min(.5).max(3).default(1),intro:z.number().int().min(0).max(600).default(0),outro:z.number().int().min(0).max(600).default(0),order:z.enum(['newest','oldest']).default('newest')}).strict()
export type ShowPreference=z.infer<typeof showPreferenceSchema>
export function showKey(serverId:string,showId:string){return JSON.stringify([serverId,showId])}
export function episodeStart(position:number,duration:number,prefs:ShowPreference,explicit=false){return explicit?position:Math.min(Math.max(0,duration-1),Math.max(position,prefs.intro))}
export function episodeOutro(position:number,duration:number,prefs:ShowPreference){return prefs.outro>0&&duration>prefs.intro+prefs.outro+1&&position>=duration-prefs.outro}
export const metadataSchema=z.object({title:text.optional(),artist:text.optional(),album:text.optional(),author:text.optional(),narrator:text.optional(),genre:text.optional(),year:z.number().int().min(0).max(9999).optional(),description:z.string().max(10000).optional()}).strict()
export type Metadata=z.infer<typeof metadataSchema>
export const columns=['artist','album','duration','format','year','genre','rating','favorite'] as const
export type Column=typeof columns[number]
export const listViewSchema=z.object({id:z.string().max(80),name:z.string().trim().min(1).max(80),columns:z.array(z.enum(columns)).max(columns.length).refine(v=>new Set(v).size===v.length)}).strict()
export const shelfSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),description:z.string().max(2000),entries:z.array(mediaRefSchema).max(500)}).strict()
export const tripSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),items:z.array(personalItemSchema).max(1000)}).strict()
export const personalStateSchema=z.object({mixes:z.array(mixDefinitionSchema).max(100).default([]),shelves:z.array(shelfSchema).max(100).default([]),trips:z.array(tripSchema).max(50).default([]),shows:z.record(showPreferenceSchema).refine(v=>Object.keys(v).length<=1000).default({}),metadata:z.record(metadataSchema).refine(v=>Object.keys(v).length<=5000).default({}),views:z.array(listViewSchema).max(40).default([]),activeView:z.string().max(80).default('default')}).strict()
export type PersonalState=z.infer<typeof personalStateSchema>
export const personalCommandSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('mix-save'),mix:mixDefinitionSchema}).strict(),z.object({action:z.literal('mix-delete'),id:z.string().uuid()}).strict(),
 z.object({action:z.literal('shelf-save'),shelf:shelfSchema}).strict(),z.object({action:z.literal('shelf-delete'),id:z.string().uuid()}).strict(),
 z.object({action:z.literal('trip-save'),trip:tripSchema}).strict(),z.object({action:z.literal('trip-delete'),id:z.string().uuid()}).strict(),
 z.object({action:z.literal('show-save'),serverId:id,showId:id,prefs:showPreferenceSchema}).strict(),
 z.object({action:z.literal('metadata-save'),ref:mediaRefSchema,metadata:metadataSchema.nullable()}).strict(),
 z.object({action:z.literal('view-save'),view:listViewSchema}).strict(),z.object({action:z.literal('view-select'),id:z.string().max(80)}).strict(),z.object({action:z.literal('view-delete'),id:z.string().max(80)}).strict()])
export type PersonalCommand=z.infer<typeof personalCommandSchema>
export interface CoverCandidate{id:string;title:string;artist:string;date:string;source:string;image?:string}
export interface OfflineCheck{items:{item:QueueItem;status:string;bytes:number;error?:string}[];knownBytes:number;unknownSizes:number;ready:number;total:number;freeBudget:number}
export interface PersonResult{ref:MediaRef;role:'artist'|'author'|'narrator';name:string}
export interface PersonalAPI{
 mixPreview(input:{mix:MixDefinition;refresh?:boolean}):Promise<MixPreview>;
 mixSources():Promise<{source:MixSource;name:string}[]>;
 personalMetadata(ref:MediaRef):Promise<Metadata>;
 personalState():Promise<PersonalState>;personalChange(input:PersonalCommand):Promise<void>;onPersonal(listener:()=>void):()=>void;
 personalResolve(refs:MediaRef[]):Promise<QueueItem[]>;offlineCheck(items:QueueItem[]):Promise<OfflineCheck>;
 personalCover(input:{key:string}):Promise<string|null>;importPersonalCover(input:{key:string}):Promise<boolean>;removePersonalCover(input:{key:string}):Promise<void>;
 coverSearch(query:string):Promise<CoverCandidate[]>;coverPreview(id:string):Promise<CoverCandidate>;coverSelect(input:{key:string;id:string}):Promise<void>;
 peopleSearch(input:{query:string;role:'artist'|'author'|'narrator'}):Promise<{items:PersonResult[];warnings:string[]}>;
 exportDefaultCover():Promise<boolean>;
 privateListening(enabled:boolean):Promise<void>
}
