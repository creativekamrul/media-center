import {createHash,randomUUID} from 'node:crypto'
import type {Store} from './store'
import type {Downtify,DtRecord} from './providers/downtify'
import {normalizeDt,DtHttpError} from './providers/downtify'
import type {DtStatus,DtPlaylist,DtPlaylistEdit} from '../shared/downtify'

type Row=Record<string,any>
interface Snapshot {cursor:number;etag:string;updated:number;rows:Row[]}
const remote=(id:unknown)=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,160}$/.test(id))throw Error('The server returned an invalid stable track identity.');return id}
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
/** Additive compatibility: no connection IDs, old records, settings or cached files are rewritten. */
export class DowntifyClient {
 private info?:Row;private checked=0;private syncing?:Promise<DtRecord[]>;private socket?:WebSocket;private retry?:ReturnType<typeof setTimeout>;private stopped=false
 private key:string
 private lastRecords?:DtRecord[];private lastSync=0
 constructor(readonly p:Downtify,private store:Store,private changed:()=>void=()=>{}){this.key='downtify:v1:'+p.connection.id}
 async available(force=false){
  if(!force&&this.checked&&Date.now()-this.checked<60000)return !!this.info
  let info:Row
  try{info=await this.p.json('api/server/info')}catch(e){if(e instanceof DtHttpError&&e.status===404){this.checked=Date.now();this.info=undefined;return false}throw e}
  if(info.product!=='Downtify'||info.api_version!==1||!info.server_id)throw Error('This address does not expose a supported Downtify client API.')
  const old=this.p.connection.serverIdentity??this.store.get<string>(this.key+':server')
  if(old&&old!==info.server_id)throw Error('This address now belongs to a different Downtify server. Add a separate connection; existing data has been kept.')
  this.store.set(this.key+':server',info.server_id);this.info=info;this.checked=Date.now();return true
 }
 async status():Promise<DtStatus>{const modern=await this.available();const auth=await this.p.json('api/auth/status');const snap=this.store.get<Snapshot>(this.key+':snapshot');return {modern,serverIdentity:this.info?.server_id,version:this.info?.version??this.p.connection.version,libraryOnly:!!this.info?.library_only,role:String(auth.user?.role??(auth.auth_disabled?'admin':'')),webSession:!this.p.isDevice()&&auth.via!=='device',webAdmin:(auth.user?.role==='admin'||auth.auth_disabled===true)&&auth.via!=='device'&&!this.p.isDevice(),capabilities:modern?Object.fromEntries(Object.entries(this.info?.capabilities??{}).map(([k,v])=>[k,v===true])):{},syncUpdated:snap?.updated}}
 assertExternal(){if(this.info?.library_only)throw Error('This Downtify server is in library-only mode. External discovery and streaming are disabled.')}
 normalize(row:Row):DtRecord {
  const rid=remote(row.id),mapKey=this.key+':identity:'+rid
  let local=this.store.get<string>(mapKey)
  if(!local){const legacy=normalizeDt({...row,name:row.title},this.p.connection.id).track.id;local=this.store.get<DtRecord>(`downtify:track:${this.p.connection.id}:${legacy}`)?legacy:digest(['downtify-v1',rid]);this.store.set(mapKey,local)}
  const record=normalizeDt({...row,name:row.title},this.p.connection.id)
  record.remoteId=rid;record.track={...record.track,id:local,remoteId:rid,albumId:row.album_id==null?undefined:String(row.album_id),artistId:row.artist_id==null?undefined:String(row.artist_id),explicit:row.explicit===true,revision:row.revision,genre:row.genre,releaseDate:row.release_date,codec:row.codec,sampleRate:row.sample_rate,bytes:row.size};this.store.set(`downtify:track:${this.p.connection.id}:${local}`,record);return record
 }
 async sync(refresh=false):Promise<DtRecord[]> {
  if(this.syncing)return this.syncing
  if(!refresh&&this.lastRecords&&Date.now()-this.lastSync<10000)return this.lastRecords
  this.syncing=this.performSync(refresh).finally(()=>{this.syncing=undefined});return this.syncing
 }
 private async performSync(refresh:boolean){
  if(!await this.available())return this.p.legacyBrowse({serverId:this.p.connection.id,view:'library'})
  const old=this.store.get<Snapshot>(this.key+':snapshot'),response=await this.p.response('api/v1/library',{since:String(old?.cursor??0),...(refresh?{refresh:'true'}:{})},undefined,'GET',old?.etag?{'If-None-Match':old.etag}:{})
  if(response.status===304){if(!old)throw Error('The server returned an unchanged library before the first sync.');this.lastSync=Date.now();if(this.lastRecords)return this.lastRecords;const restore=()=>old.rows.map(r=>this.normalize(r));return this.lastRecords=this.store.atomic?this.store.atomic(restore):restore()}
  const data=await response.json();if(!Number.isSafeInteger(data.cursor)||data.cursor<0||typeof data.full!=='boolean'||!Array.isArray(data.tracks)||!Array.isArray(data.deleted))throw Error('Incomplete Downtify library sync. The previous catalog has been kept.')
  for(const r of data.tracks){remote(r.id);if(typeof r.title!=='string'||typeof r.file!=='string')throw Error('Invalid track in Downtify sync; previous catalog kept.')}
  data.deleted.forEach(remote)
  if(old&&!data.full&&data.cursor<old.cursor)throw Error('The Downtify cursor moved backwards. The previous catalog has been kept.')
  const rows=new Map<string,Row>(data.full?[]:(old?.rows??[]).map(r=>[r.id,r]));for(const id of data.deleted)rows.delete(id);for(const row of data.tracks)rows.set(row.id,row)
  const all=[...rows.values()],commit=()=>{const changed=new Set(data.tracks.map((r:Row)=>r.id)),known=new Map((this.lastRecords??[]).map(r=>[r.remoteId,r]));const records=all.map(r=>{if(!changed.has(r.id)){const local=this.store.get<string>(this.key+':identity:'+r.id),cached=known.get(r.id)??(local?this.store.get<DtRecord>(`downtify:track:${this.p.connection.id}:${local}`):undefined);if(cached&&cached.remoteId===r.id)return cached}return this.normalize(r)});this.store.set(this.key+':snapshot',{cursor:data.cursor,rows:all,etag:response.headers.get('etag')??'',updated:Date.now()} satisfies Snapshot);return records},records=this.store.atomic?this.store.atomic(commit):commit()
  this.lastRecords=records;this.lastSync=Date.now();void this.startEvents();return records
 }
 async playlists(){if(!await this.available())return this.p.json('playlists');const rows=await this.p.json('api/v1/playlists');if(!Array.isArray(rows))throw Error('Invalid playlist listing.');return rows}
 async playlist(name:string):Promise<DtPlaylist>{
  const rows=await this.playlists(),row=rows.find((r:Row)=>r.name===name);if(!row)throw Error('Playlist not found. Refresh your collection.')
  const saved=await this.sync(),byRemote=new Map(saved.map(r=>[r.remoteId,r])),byFile=new Map(saved.map(r=>[r.file,r]));const ids=Array.isArray(row.track_ids)?row.track_ids:row.files??[];const records=ids.map((id:string)=>byRemote.get(id)??byFile.get(id));if(records.some((r:DtRecord|undefined)=>!r))throw Error('This playlist changed while loading. Refresh before editing; nothing has been changed.')
  return {name:row.name,manual:row.manual===true,mine:row.mine===true,canEdit:row.can_edit_tracks===true,owner:String(row.owner??''),visibility:String(row.visibility??'private'),followed:row.followed===true,liked:row.liked===true,hiddenCount:Number(row.hidden_count)||0,sharedWith:Array.isArray(row.shared_with)?row.shared_with:[],editors:Array.isArray(row.editors)?row.editors:[],tracks:records.map((r:DtRecord)=>r.track),revision:digest([row.name,ids,row.manual,row.mine,row.can_edit_tracks])}
 }
 private saved(id:string){const r=this.store.get<DtRecord>(`downtify:track:${this.p.connection.id}:${id}`);if(!r?.remoteId)throw Error('Refresh this saved track before editing the playlist.');return remote(r.remoteId)}
 record(id:string){const r=this.store.get<DtRecord>(`downtify:track:${this.p.connection.id}:${id}`);if(!r)throw Error('Refresh this track before playing.');return r}
 resume(showId:string,episodeId:string){return this.store.get<{position:number;updatedAt:number;syncPending?:boolean}>(`resume:${JSON.stringify([this.p.connection.id,'downtify-episode',showId,episodeId])}`)}
 async edit(input:DtPlaylistEdit):Promise<DtPlaylist>{
  if(!await this.available()||this.info?.capabilities?.playlist_editing!==true)throw Error('This server does not advertise the current playlist editing API.')
  const {action,name}=input
  if(action==='create'){await this.p.json('api/v1/playlists',{}, {name});return this.playlist(name)}
  const current=await this.playlist(name);if(!input.revision||input.revision!==current.revision)throw Error('The playlist changed. Reload it before saving; no write was sent.')
  if(['rename','hide','show'].includes(action)&&!current.mine)throw Error('Only the playlist owner can use this action.')
  if(['order','add','remove'].includes(action)&&(!current.manual||!current.canEdit))throw Error('This playlist is read-only for this account.')
  const ids=(input.ids??[]).map(id=>this.saved(id))
  if(action==='rename'){await this.p.json('api/v1/playlists/rename',{}, {name,new_name:input.newName});return this.playlist(input.newName!)}
  if(action==='order'){const a=ids.slice().sort(),b=current.tracks.map(t=>t.remoteId!).sort();if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Reordering must retain every song occurrence.');await this.p.json('api/v1/playlists/order',{}, {name,track_ids:ids},'PUT')}
  if(action==='add')await this.p.json('api/v1/playlists/tracks',{}, {name,add:ids,allow_duplicates:input.allowDuplicates===true})
  if(action==='remove')await this.p.json('api/v1/playlists/tracks',{}, {name,remove_entries:ids.map(track_id=>({track_id,occurrence:input.occurrence??0}))})
  if(action==='follow'||action==='unfollow')await this.p.json('api/v1/playlists/follow',{}, {name},action==='follow'?'POST':'DELETE')
  if(action==='hide'||action==='show'){if(current.manual||current.liked)throw Error('Hide/show applies only to imported playlists.');await this.p.json('api/v1/playlists/hidden',{}, {name,...(action==='hide'?{hide:ids}:{show:input.keys??[]})})}
  return this.playlist(name)
 }
 async startEvents(){if(this.socket||this.retry||this.stopped||!this.info)return;try{const {ticket}=await this.p.json('api/auth/ws-ticket',{},{});if(this.stopped)return;const url=this.p.url('api/ws',{client_id:this.store.get<string>('deviceId')??randomUUID(),ticket});url.protocol=url.protocol==='https:'?'wss:':'ws:';const ws=this.socket=new WebSocket(url);ws.onmessage=e=>{try{const data=JSON.parse(String(e.data));if(['library_changed','music_policy_changed'].includes(data.type)){this.checked=0;this.lastSync=0;void this.sync().then(()=>this.changed()).catch(()=>{})}else if(['playlists_changed','podcasts_changed'].includes(data.type))this.changed()}catch{}};ws.onclose=e=>{this.socket=undefined;if(!this.stopped&&e.code!==4401)this.retry=setTimeout(()=>{this.retry=undefined;void this.startEvents()},15000)};ws.onerror=()=>{/* Native WebSocket closes failed connections; closing here can recursively emit error. */}}catch{if(!this.stopped)this.retry=setTimeout(()=>{this.retry=undefined;void this.startEvents()},30000)}}
 close(){this.stopped=true;if(this.retry)clearTimeout(this.retry);this.socket?.close();this.socket=undefined}
}
