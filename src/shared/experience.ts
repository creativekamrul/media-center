import {z} from 'zod'
import type {QueueItem} from './types'
export const homeSections=['hero','pins','mixes','continue','albums','episodes','later'] as const
export const shortcutActions=['search','queue','favorite','mini','lyrics','toggle','next','previous'] as const
export const defaultShortcuts={search:'Ctrl+K',queue:'Ctrl+J',favorite:'Ctrl+D',mini:'Ctrl+M',lyrics:'Ctrl+L',toggle:'Space',next:'Ctrl+Right',previous:'Ctrl+Left'}
export const pinSchema=z.object({kind:z.enum(['music','local']),source:z.string().min(1).max(2048),id:z.string().min(1).max(2048),title:z.string().max(200)}).strict()
export const shortcutSchema=z.string().max(40).refine(v=>!v||/^(?:(?:Ctrl|Alt|Shift|Meta)\+)*(?:[A-Z0-9]|Space|Left|Right|Up|Down|F[1-9]|F1[0-2])$/.test(v),'Use a letter, number, arrow, Space or function key with optional modifiers.').refine(v=>!['F11','Alt+F4','Ctrl+W','Ctrl+R'].includes(v),'That shortcut is reserved.')
export const collectionKeys=['music','audiobooks','podcasts','local','tools'] as const
export const collectionIcons=['music','book','podcast','folder','sliders','disc','headphones','library','radio','star','heart','sparkles'] as const
export const collectionDefaults={music:{name:'Music',icon:'music'},audiobooks:{name:'Audiobooks',icon:'book'},podcasts:{name:'Podcasts',icon:'podcast'},local:{name:'Local music',icon:'folder'},tools:{name:'Library tools',icon:'sliders'}} as const
const collectionSchema=z.object({name:z.string().trim().min(1).max(40).refine(v=>!/[\x00-\x1f\x7f]/.test(v),'Use a name without control characters.'),icon:z.enum(collectionIcons)}).strict()
export const collectionsSchema=z.object({music:collectionSchema,audiobooks:collectionSchema,podcasts:collectionSchema,local:collectionSchema,tools:collectionSchema}).strict()
export const orderedCollectionKeys=['music','audiobooks','podcasts','local'] as const
export const collectionOrderSchema=z.array(z.enum(orderedCollectionKeys)).length(4).refine(v=>new Set(v).size===4,'Include each collection exactly once.')
export const navigationSchema=z.object({collections:collectionsSchema.default(collectionDefaults),collectionOrder:collectionOrderSchema.default([...orderedCollectionKeys]),queueBelowHome:z.boolean().default(false),playlistsBelowHome:z.boolean().default(false),listeningCollapsed:z.boolean().default(false),sidebarCollapsed:z.boolean().default(false)}).strict()
export const navigationChangeSchema=z.discriminatedUnion('action',[z.object({action:z.literal('collections'),collections:collectionsSchema,collectionOrder:collectionOrderSchema.optional(),queueBelowHome:z.boolean().optional(),playlistsBelowHome:z.boolean().optional()}).strict(),z.object({action:z.literal('listening'),collapsed:z.boolean()}).strict(),z.object({action:z.literal('sidebar'),collapsed:z.boolean()}).strict()])
export const experienceSchema=z.object({
 navigation:navigationSchema.default({}),
 homeOrder:z.array(z.enum(homeSections)).length(homeSections.length).refine(v=>new Set(v).size===homeSections.length).default([...homeSections]),
 hiddenSections:z.array(z.enum(homeSections)).max(homeSections.length).default([]),hiddenMixes:z.array(z.string().max(2048)).max(100).default([]),
 pins:z.array(pinSchema).max(30).default([]),autoplay:z.boolean().default(false),watchLocal:z.boolean().default(true),
 shortcuts:z.record(z.enum(shortcutActions),shortcutSchema).default(defaultShortcuts),
 podcastRules:z.array(z.object({serverId:z.string().min(1).max(2048),showId:z.string().min(1).max(2048),title:z.string().max(2000),enabled:z.boolean(),keep:z.number().int().min(1).max(50),removeFinished:z.boolean()}).strict()).max(100).default([])
}).strict()
export type Experience=z.infer<typeof experienceSchema>
export const defaultExperience=experienceSchema.parse({})
export interface SearchGroup {name:string;items:QueueItem[];unavailable?:string[]}
export interface ExperienceAPI {
 experience():Promise<Experience>
 saveNavigation(input:z.infer<typeof navigationChangeSchema>):Promise<void>
 saveExperience(input:Experience):Promise<void>
 onExperience(listener:(input:Experience)=>void):()=>void
 unifiedSearch(query:string):Promise<{groups:SearchGroup[];warnings:string[]}>
 mediaDetails(item:QueueItem):Promise<{item:QueueItem;favorite?:boolean;details:Record<string,string>}>
 mediaPlaylists(item:QueueItem):Promise<{id:string;title:string}[]>
 mediaAddPlaylist(input:{item:QueueItem;id:string}):Promise<void>
 saveMix(input:{name:string;items:QueueItem[]}):Promise<string>
 pinnedMusic():Promise<{pin:z.infer<typeof pinSchema>;items:QueueItem[]}[]>
 lyricOffset(input:{key:string;seconds?:number}):Promise<number>
 resetData(scope:'cache'|'personal'|'all'):Promise<boolean>
 localPlaylistContents(input:{rootId:string;id:string}):Promise<import('./local-library').LocalPlaylist>
 localPlaylistFile(input:{rootId:string;action:'import'|'export';id?:string}):Promise<{name:string;count:number}|null>
 onShortcut(listener:(action:string)=>void):()=>void
}
