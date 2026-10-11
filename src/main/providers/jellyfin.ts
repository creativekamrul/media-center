import { z } from 'zod'
import { serverUrl, json, request, coverData } from './http'
import {jfId} from '../../shared/jellyfin'
import type { JfBrowse, JfConnection, JfItem, JfLibrary, JfPage } from '../../shared/jellyfin'
import { APP_VERSION } from '../../shared/version'

const userData=z.object({PlaybackPositionTicks:z.number().optional(),Played:z.boolean().optional(),IsFavorite:z.boolean().optional()}).nullish()
const itemSchema=z.object({Id:jfId,Type:z.string(),Name:z.string().default('Untitled'),Overview:z.string().nullish(),RunTimeTicks:z.number().nullish(),UserData:userData,ProductionYear:z.number().nullish(),IndexNumber:z.number().nullish(),ParentIndexNumber:z.number().nullish(),SeriesId:jfId.nullish(),SeriesName:z.string().nullish(),Artists:z.array(z.string()).nullish(),AlbumArtist:z.string().nullish(),Album:z.string().nullish(),ImageTags:z.record(z.string()).nullish(),AlbumId:jfId.nullish(),ParentPrimaryImageItemId:jfId.nullish(),Genres:z.array(z.string()).nullish(),CommunityRating:z.number().nullish(),OfficialRating:z.string().nullish(),Studios:z.array(z.object({Name:z.string()})).nullish(),People:z.array(z.object({Id:jfId,Name:z.string(),Role:z.string().nullish(),Type:z.string().nullish()})).nullish(),ParentLogoItemId:jfId.nullish()})
const pageSchema=z.object({Items:z.array(itemSchema),TotalRecordCount:z.number()})
export const streamSchema=z.object({Index:z.number().int().min(0).max(10000),Type:z.string(),Codec:z.string().nullish(),IsExternal:z.boolean().optional(),Language:z.string().nullish(),DisplayTitle:z.string().nullish(),SampleRate:z.number().nullish(),BitDepth:z.number().nullish(),Width:z.number().nullish(),Height:z.number().nullish()})
const sourceSchema=z.object({Id:jfId,SupportsDirectPlay:z.boolean().optional(),RequiresOpening:z.boolean().optional(),IsInfiniteStream:z.boolean().optional(),Container:z.string().nullish(),MediaStreams:z.array(streamSchema).default([]),Bitrate:z.number().nullish()})
export const playbackSchema=z.object({MediaSources:z.array(sourceSchema),PlaySessionId:jfId.optional(),ErrorCode:z.string().nullish()})
export type JfSource=z.infer<typeof sourceSchema>
export const directProfile={Name:'Media Center MPV',MaxStreamingBitrate:2147483647,MaxStaticBitrate:2147483647,DirectPlayProfiles:[{Type:'Audio',Container:'flac,mp3,aac,m4a,mp4,ogg,opus,wav,wma,aiff,ape,alac,dsf,dff,mka'},{Type:'Video',Container:'mkv,mp4,m4v,avi,mov,webm,ts,m2ts,mpg,mpeg,wmv,flv,ogv'}],TranscodingProfiles:[],SubtitleProfiles:[{Format:'srt',Method:'External'},{Format:'ass',Method:'External'},{Format:'ssa',Method:'External'},{Format:'vtt',Method:'External'},{Format:'pgssub',Method:'Embed'},{Format:'dvdsub',Method:'Embed'}]}
const kinds=new Set(['Audio','MusicAlbum','MusicArtist','Playlist','Movie','Series','Season','Episode'])
export function mapJfItem(raw:unknown,serverId:string):JfItem {
 const i=itemSchema.parse(raw)
 if(!kinds.has(i.Type))throw Error(`Unsupported Jellyfin media type: ${i.Type}`)
 return {id:i.Id,serverId,kind:i.Type as JfItem['kind'],title:i.Name,subtitle:i.SeriesName?`${i.SeriesName} · S${i.ParentIndexNumber??0} E${i.IndexNumber??0}`:i.Artists?.join(', ')||i.AlbumArtist||i.Album||'',overview:i.Overview??'',duration:(i.RunTimeTicks??0)/1e7,position:(i.UserData?.PlaybackPositionTicks??0)/1e7,played:i.UserData?.Played??false,favorite:i.UserData?.IsFavorite??false,year:i.ProductionYear??undefined,index:i.IndexNumber??undefined,season:i.ParentIndexNumber??undefined,seriesId:i.SeriesId??undefined,coverId:i.ImageTags?.Primary?i.Id:i.AlbumId||i.ParentPrimaryImageItemId||i.SeriesId||i.Id,genres:i.Genres??[],rating:i.CommunityRating??undefined,certification:i.OfficialRating??undefined,studios:i.Studios?.map(s=>s.Name),people:i.People?.map(p=>({id:p.Id,name:p.Name,role:p.Role??'',type:p.Type??''})),logoId:i.ImageTags?.Logo?i.Id:i.ParentLogoItemId??undefined}
}
export class Jellyfin {
 constructor(readonly config:JfConnection,private token:string,private deviceId:string){}
 headers(){return {'X-Emby-Authorization':`MediaBrowser Client="Media Center", Device="Windows", DeviceId="${this.deviceId}", Version="${APP_VERSION}", Token="${this.token}"`}}
 url(path:string,query:Record<string,string|number|boolean|undefined>={}){const u=serverUrl(this.config.url,path);for(const [k,v]of Object.entries(query))if(v!==undefined)u.searchParams.set(k,String(v));return u}
 async get(path:string,query:Record<string,string|number|boolean|undefined>={}){return json(this.url(path,query),{headers:this.headers()})}
 async send(path:string,body:unknown,method='POST'){await request(this.url(path),{method,headers:{...this.headers(),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:path.startsWith('Sessions/')?AbortSignal.timeout(3000):undefined})}
 static async login(url:string,username:string,password:string,deviceId:string){
  const base={id:'login',name:'',url,username,userId:'',version:''};const p=new Jellyfin(base,'',deviceId)
  const result=z.object({AccessToken:z.string().regex(/^[\w-]+$/),User:z.object({Id:jfId,Name:z.string()})}).parse(await json(p.url('Users/AuthenticateByName'),{method:'POST',headers:{...p.headers(),'Content-Type':'application/json'},body:JSON.stringify({Username:username,Pw:password})}))
  const info=z.object({Version:z.string(),ServerName:z.string().optional()}).parse(await p.get('System/Info/Public'))
  return {token:result.AccessToken,userId:result.User.Id,username:result.User.Name,version:info.Version,serverName:info.ServerName}
 }
 async libraries():Promise<JfLibrary[]>{const data=z.object({Items:z.array(z.object({Id:jfId,Name:z.string(),CollectionType:z.string().nullish()}))}).parse(await this.get(`Users/${this.config.userId}/Views`));return data.Items.filter(i=>['music','movies','tvshows'].includes(i.CollectionType??'')).map(i=>({id:i.Id,name:i.Name,kind:i.CollectionType as JfLibrary['kind']}))}
 async browse(q:JfBrowse):Promise<JfPage>{
  const types=q.kind==='music'?(q.view==='songs'?'Audio':q.view==='artists'?'MusicArtist':q.view==='playlists'?'Playlist':'MusicAlbum'):q.kind==='movies'?'Movie':'Series'
  let path='Items',query:Record<string,string|number|boolean|undefined>={UserId:this.config.userId,ParentId:q.parentId??q.libraryId,Recursive:true,IncludeItemTypes:types,SearchTerm:q.search||undefined,StartIndex:q.page*60,Limit:60,SortBy:q.sort,SortOrder:q.descending?'Descending':'Ascending',Fields:'Overview,Genres,DateCreated',EnableUserData:true}
  if(q.parentId){const parent=await this.detail(q.parentId);query.IncludeItemTypes=parent.kind==='Series'?'Season':parent.kind==='Season'?'Episode':parent.kind==='MusicArtist'?'MusicAlbum':'Audio';query.Recursive=parent.kind==='MusicArtist';query.SortBy=parent.kind==='MusicAlbum'?'ParentIndexNumber,IndexNumber':parent.kind==='MusicArtist'?'SortName':'IndexNumber';if(parent.kind==='MusicArtist'){delete query.ParentId;query.ArtistIds=q.parentId}if(parent.kind==='Playlist'){path=`Playlists/${q.parentId}/Items`;delete query.SortBy;delete query.SortOrder}}
  if(q.view==='continue'){path='UserItems/Resume';query.IncludeItemTypes=q.kind==='music'?'Audio':q.kind==='movies'?'Movie':'Episode';delete query.SortBy;delete query.SortOrder}
  if(q.view==='artists'&&!q.parentId){path='Artists';delete query.IncludeItemTypes}
  if(q.view==='playlists'&&!q.parentId)delete query.ParentId
  if(q.view==='favorites')query.Filters='IsFavorite'
  const data=pageSchema.parse(await this.get(path,query));return {items:data.Items.map(i=>mapJfItem(i,this.config.id)),total:data.TotalRecordCount}
 }
 async related(id:string){const data=pageSchema.parse(await this.get(`Items/${id}/Similar`,{UserId:this.config.userId,Limit:12,Fields:'Overview,Genres',EnableUserData:true}));return {items:data.Items.filter(i=>kinds.has(i.Type)).map(i=>mapJfItem(i,this.config.id)),total:data.TotalRecordCount}}
 async nextUp(id:string){const data=pageSchema.parse(await this.get('Shows/NextUp',{UserId:this.config.userId,SeriesId:id,Limit:1,Fields:'Overview',EnableUserData:true}));return {items:data.Items.map(i=>mapJfItem(i,this.config.id)),total:data.TotalRecordCount}}
 async detail(id:string){return mapJfItem(await this.get(`Users/${this.config.userId}/Items/${id}`),this.config.id)}
 async cover(id:string,image:'Primary'|'Backdrop'|'Logo'='Primary'){return coverData(this.url(`Items/${id}/Images/${image}`,{maxWidth:image==='Backdrop'?1600:500,quality:90}),this.headers()).catch(()=>null)}
 async mark(id:string,field:'favorite'|'played',value:boolean){await this.send(`Users/${this.config.userId}/${field==='favorite'?'FavoriteItems':'PlayedItems'}/${id}`,undefined,value?'POST':'DELETE')}
 async playback(id:string,position:number){
  const data=playbackSchema.parse(await json(this.url(`Items/${id}/PlaybackInfo`),{method:'POST',headers:{...this.headers(),'Content-Type':'application/json'},body:JSON.stringify({UserId:this.config.userId,StartTimeTicks:Math.round(position*1e7),IsPlayback:true,EnableDirectPlay:true,EnableDirectStream:false,EnableTranscoding:false,AutoOpenLiveStream:false,DeviceProfile:directProfile})}))
  if(data.ErrorCode)throw Error('Jellyfin cannot provide an original stream for this item. Check playback permissions.')
  const source=data.MediaSources.find(s=>s.SupportsDirectPlay&&!s.RequiresOpening&&!s.IsInfiniteStream)
  if(!source)throw Error('Original-file playback is unavailable. Media Center does not request server transcoding.')
  return {source,sessionId:data.PlaySessionId}
 }
 async episodes(seriesId:string){const data=pageSchema.parse(await this.get(`Shows/${seriesId}/Episodes`,{UserId:this.config.userId,Fields:'Overview',EnableUserData:true,Limit:5000}));return data.Items.map(i=>mapJfItem(i,this.config.id))}
 async collection(q:JfBrowse){const items:JfItem[]=[];for(let page=0;;page++){const result=await this.browse({...q,page});items.push(...result.items);if(items.length>5000||result.total>5000)throw Error('This collection exceeds the 5,000-item queue limit. Choose a smaller collection.');if(items.length>=result.total||!result.items.length)break}if(items.some(i=>!['Audio','Movie','Episode'].includes(i.kind)))throw Error('Open an album, playlist or season, or switch to Songs before playing a collection.');return items}
}
