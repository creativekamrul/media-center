import {z} from 'zod'
import type {LocalFile} from './types'
export const localViews=['albums','songs','artists','genres','favorites','newest','recent','playlists','folders'] as const
export const localQuerySchema=z.object({rootId:z.string().min(1).max(200),view:z.enum(localViews),page:z.number().int().min(0).max(100000),search:z.string().max(500),sort:z.enum(['title','artist','year','duration']).default('title'),group:z.string().max(4096).optional(),refresh:z.boolean().optional()}).strict()
export type LocalQuery=z.infer<typeof localQuerySchema>
export interface LocalIndexedTrack extends LocalFile {favorite:boolean}
export interface LocalGroup {id:string;title:string;subtitle:string;count:number;fileId?:string}
export interface LocalPageData {tracks:LocalIndexedTrack[];groups:LocalGroup[];total:number;trackCount:number;page:number;updatedAt:number;warnings:string[]}
export const localPlaylistSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),rootId:z.string().min(1).max(200),name:z.string().trim().min(1).max(200),files:z.array(z.string().min(1).max(4096)).min(1).max(5000)}).strict(),
 z.object({action:z.literal('update'),rootId:z.string().min(1).max(200),id:z.string().min(1).max(200),name:z.string().trim().min(1).max(200),files:z.array(z.string().min(1).max(4096)).max(5000)}).strict(),
 z.object({action:z.literal('delete'),rootId:z.string().min(1).max(200),id:z.string().min(1).max(200)}).strict()
])
export type LocalPlaylistCommand=z.infer<typeof localPlaylistSchema>
export interface LocalPlaylist {id:string;name:string;files:string[]}
export function localAlbumKey(f:LocalFile) {return JSON.stringify([f.albumArtist||f.artist,f.album||f.id.replace(/[^\\/]+$/,'')||'Unsorted audio'])}
