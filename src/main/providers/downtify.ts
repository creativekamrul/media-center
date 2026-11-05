import {createHash} from 'node:crypto'
import {serverUrl,request,coverData} from './http'
import type {DtConnection,DtTrack,DtBrowse} from '../../shared/downtify'

export interface DtRecord {track:DtTrack;file:string;video:string;cover:string;url:string;artists?:string[];sourceId?:string}
const text=(v:unknown)=>typeof v==='string'?v:''
const video=(v:unknown)=>typeof v==='string'&&/^[\w-]{11}$/.test(v)?v:''
export function normalizeDt(row:Record<string,unknown>,serverId:string):DtRecord {
 const file=text(row.file),title=text(row.name)||text(row.title),artist=Array.isArray(row.artists)?row.artists.map(a=>typeof a==='string'?a:'').filter(Boolean).join(', '):text(row.artist)
 if(!title)throw Error('Downtify returned a track without a title.')
 const id=createHash('sha256').update(file||text(row.song_id)||`${artist}\n${title}\n${text(row.album_name)}`).digest('hex')
 return {track:{id,serverId,title,artist,artists:Array.isArray(row.artists)?row.artists.filter((a):a is string=>typeof a==='string'):[artist],album:text(row.album_name)||text(row.album),duration:Number.isFinite(Number(row.duration))?Math.max(0,Number(row.duration)):0,saved:!!file},file,artists:Array.isArray(row.artists)?row.artists.filter((a):a is string=>typeof a==='string'):[artist],sourceId:text(row.song_id),video:video(row.youtube_id)||video(row.video_id)||video(row.song_id),cover:text(row.cover_url),url:text(row.url)}
}
export class Downtify {
 constructor(readonly connection:DtConnection,private cookie:string){}
 url(path:string,params:Record<string,string>={}){const url=serverUrl(this.connection.url,path);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);return url}
 headers(){return {Cookie:this.cookie,Origin:new URL(this.connection.url).origin,'Content-Type':'application/json'}}
 async json(path:string,params:Record<string,string>={},body?:unknown):Promise<any>{
  const response=await request(this.url(path,params),{headers:this.headers(),method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body)})
  return response.json()
 }
 static async login(url:string,username:string,password:string){
  const base=serverUrl(url,'').href
  const status=await (await request(serverUrl(base,'api/auth/status'))).json()
  if(status.auth_disabled)return ''
  const response=await request(serverUrl(base,'api/auth/login'),{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(base).origin},body:JSON.stringify({username,password})})
  const cookie=response.headers.getSetCookie().find(c=>c.startsWith('downtify_session='))?.split(';')[0]
  if(!cookie)throw Error('Downtify did not return a session. Use a local account with password sign-in enabled.')
  return cookie
 }
 async test(){const status=await this.json('api/auth/status');if(!status.auth_disabled&&!status.signed_in)throw Error('Your Downtify session expired. Reconnect in Settings.');const v=await this.json('api/version');return String(v.version??v.current_version??v)}
 async browse(q:DtBrowse):Promise<DtRecord[]>{
  let data:any
  if(q.view==='library'||q.view==='playlist')data=await this.json('tracks',{q:q.query??'',...(q.playlist?{playlist:q.playlist}:{})})
  else if(q.view==='album')data=await this.json('api/finder/album',{album_id:q.collectionId??''})
  else if(q.view==='artist')data=await this.json('api/finder/artist/songs',{artist_id:q.collectionId??'',name:q.artist??''})
  else if(q.view==='search')data=await this.json('api/songs/search',{query:q.query??''})
  else if(q.view==='similar')data=await this.json('api/similar/tracks',{artist:q.artist??'',track:q.track??'',limit:'30'})
  else data=await this.json('api/discover/chart',{limit:'50'})
  const rows=Array.isArray(data)?data:data.tracks??data.songs
  if(!Array.isArray(rows))throw Error('This Downtify version returned an unsupported track listing.')
  return rows.map(row=>normalizeDt(row,this.connection.id))
 }
 async playlists(){const data=await this.json('playlists');if(!Array.isArray(data))throw Error('Unsupported playlist response.');return data.map(p=>typeof p==='string'?p:text(p.name)).filter(Boolean)}
 async streamPath(record:DtRecord){
  if(record.file){if(record.file.split(/[\\/]/).some(p=>p==='..')||/^[\\/]|^[a-z]:/i.test(record.file)||record.file.includes('\\'))throw Error('Invalid Downtify file path.');return this.url('media/'+record.file.split('/').map(encodeURIComponent).join('/'))}
  let id=record.video
  if(!id){const matches=await this.browse({serverId:this.connection.id,view:'search',query:`${record.track.artist} ${record.track.title}`});id=matches.find(m=>m.video)?.video??''}
  if(!id)throw Error('Downtify could not find a playable match for this track.')
  return this.url('api/stream/file',{video_id:id,duration:String(record.track.duration)})
 }
 async save(record:DtRecord){
  if(record.file)return
  const t=record.track
  await this.json('api/download/batch',{}, {songs:[{name:t.title,artists:record.artists??[t.artist],song_id:record.sourceId||t.id,album_name:t.album,duration:t.duration,url:record.url,youtube_id:record.video,cover_url:record.cover}],generate_m3u:false})
 }
 async cover(record:DtRecord){
  // External artwork gets no account headers; authenticated library art stays on the server.
  if(record.file)return coverData(this.url('cover',{file:record.file}),this.headers()).catch(()=>null)
  if(!record.cover)return null
  const url=new URL(record.cover,this.connection.url)
  if(!['https:','http:'].includes(url.protocol))return null
  return coverData(url,url.origin===new URL(this.connection.url).origin?this.headers():{}).catch(()=>null)
 }
}
