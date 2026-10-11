import { z } from 'zod'

export const jfId = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/)
export const jfRef = z.object({ serverId: jfId, itemId: jfId }).strict()
export const jfBrowse = z.object({ serverId: jfId, libraryId: jfId, parentId: jfId.optional(), kind: z.enum(['music','movies','tvshows']), view: z.enum(['all','continue','favorites','songs','artists','playlists']).default('all'), search: z.string().max(200).default(''), page: z.number().int().min(0).max(100000).default(0), sort: z.enum(['SortName','DateCreated','PremiereDate','Album,ParentIndexNumber,IndexNumber','IndexNumber']).default('SortName'), descending: z.boolean().default(false) }).strict()
export type JfBrowse = z.infer<typeof jfBrowse>
export type JfRef = z.infer<typeof jfRef>
export interface JfConnection { id: string; name: string; url: string; username: string; userId: string; version: string }
export interface JfLibrary { id: string; name: string; kind: 'music'|'movies'|'tvshows' }
export type JfKind = 'Audio'|'MusicAlbum'|'MusicArtist'|'Playlist'|'Movie'|'Series'|'Season'|'Episode'
export interface JfItem { id: string; serverId: string; kind: JfKind; title: string; subtitle: string; overview: string; duration: number; position: number; played: boolean; favorite: boolean; year?: number; index?: number; season?: number; seriesId?: string; coverId: string; genres: string[]; rating?:number; certification?:string; studios?:string[]; people?:{id:string;name:string;role:string;type:string}[]; logoId?:string }
export interface JfPage { items: JfItem[]; total: number }
export interface JfTrack { id: number; type: 'audio'|'sub'; title: string; language?: string; selected: boolean }
export const jfVideoPreferences=z.object({audioLanguage:z.string().regex(/^(?:[a-z]{2,3}(?:-[A-Z]{2})?)?$/).default(''),subtitleLanguage:z.string().regex(/^(?:[a-z]{2,3}(?:-[A-Z]{2})?)?$/).default(''),subtitles:z.enum(['auto','off']).default('auto'),subtitleScale:z.number().finite().min(.5).max(2).default(1),subtitleBackground:z.boolean().default(false),nextDelay:z.union([z.literal(0),z.literal(5),z.literal(10)]).default(0),hideControls:z.boolean().default(true)}).strict()
export type JfVideoPreferences=z.infer<typeof jfVideoPreferences>
export interface JfState { foreground:boolean; status: 'idle'|'loading'|'playing'|'paused'|'error'; queue: JfItem[]; index: number; position: number; duration: number; volume: number; buffering: boolean; fullscreen: boolean; tracks: JfTrack[]; chapters: {title:string;time:number}[]; codec: string; quality: string; video: string; hwdec: string; error?: string; syncError?: string; autoNext: boolean;preferences:JfVideoPreferences;nextIn?:number }
export const emptyJfState: JfState = {foreground:false,status:'idle',queue:[],index:0,position:0,duration:0,volume:100,buffering:false,fullscreen:false,tracks:[],chapters:[],codec:'',quality:'',video:'',hwdec:'',autoNext:true,preferences:jfVideoPreferences.parse({})}
export const jfCommand = z.discriminatedUnion('action',[
 z.object({action:z.literal('preferences'),value:jfVideoPreferences}).strict(),
 z.object({action:z.literal('queueIndex'),value:z.number().int().min(0).max(4999)}).strict(),
 z.object({action:z.enum(['toggle','stop','next','previous','fullscreen','retry','sync','cancelNext'])}).strict(),
 z.object({action:z.literal('seekRelative'),value:z.union([z.literal(-5),z.literal(5)])}).strict(),
 z.object({action:z.literal('seek'),value:z.number().finite().min(0)}).strict(),
 z.object({action:z.literal('volume'),value:z.number().finite().min(0).max(100)}).strict(),
 z.object({action:z.literal('autoNext'),value:z.boolean()}).strict(),
 z.object({action:z.enum(['audio','subtitle']),value:z.number().int().min(-1).max(10000)}).strict()
])
export type JfCommand = z.infer<typeof jfCommand>
export interface JellyfinAPI {
 jfPointerActive():Promise<boolean>
 jfVideoBounds(input:{x:number;y:number;width:number;height:number;visible:boolean;occlusions?:{x:number;y:number;width:number;height:number}[]}):Promise<void>
 jfConnections():Promise<JfConnection[]>
 jfConnect(input:{id?:string;name:string;url:string;username:string;password:string}):Promise<JfConnection>
 jfTest(id:string):Promise<string>
 jfRemove(id:string):Promise<void>
 jfLibraries(serverId:string):Promise<JfLibrary[]>
 jfBrowse(input:JfBrowse):Promise<JfPage>
 jfRelated(input:JfRef):Promise<JfPage>
 jfNextUp(input:JfRef):Promise<JfPage>
 jfDetail(input:JfRef):Promise<JfItem>
 jfCover(input:JfRef&{image?:'Primary'|'Backdrop'|'Logo'}):Promise<string|null>
 jfMark(input:JfRef&{field:'favorite'|'played';value:boolean}):Promise<void>
 jfPlay(input:{serverId:string;itemIds:string[];index:number;restart?:boolean}):Promise<void>
 jfPlayCollection(input:JfBrowse&{shuffle?:boolean;index?:number}):Promise<void>
 jfPlayback():Promise<JfState>
 jfCommand(input:JfCommand):Promise<void>
 onJfPlayback(listener:(state:JfState)=>void):()=>void
}
