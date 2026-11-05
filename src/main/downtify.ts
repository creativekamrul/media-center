import {dtWorkspace} from './downtify-workspace'
import {randomUUID,randomBytes} from 'node:crypto'
import {createServer,type Server} from 'node:http'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import {z} from 'zod'
import type {Store} from './store'
import type {Player} from './player'
import type {Handle} from './features'
import {Downtify,type DtRecord} from './providers/downtify'
import type {DtConnection} from '../shared/downtify'
import {serverUrl} from './providers/http'

// MPV sees a short-lived loopback capability, never a login cookie or remote URL.
export class DowntifyRelay {
 private server?:Server
 private active=new Set<AbortController>()
 async open(url:URL,headers:Record<string,string>){
  await this.close();const path='/'+randomBytes(24).toString('hex')
  const server=createServer(async(req,res)=>{
   if(req.url!==path||!['GET','HEAD'].includes(req.method??'')){res.writeHead(404).end();return}
   const abort=new AbortController();this.active.add(abort);const timer=setTimeout(()=>abort.abort(),120000);res.on('close',()=>abort.abort())
   try{
    const response=await fetch(url,{method:req.method,headers:{...headers,...(req.headers.range?{Range:req.headers.range}:{})},signal:abort.signal,redirect:'error'});clearTimeout(timer)
    for(const h of ['content-type','content-length','content-range','accept-ranges']){const value=response.headers.get(h);if(value)res.setHeader(h,value)}
    res.setHeader('Cache-Control','no-store');res.writeHead(response.status)
    if(req.method==='HEAD'||!response.body)res.end();else await pipeline(Readable.fromWeb(response.body as never),res)
   }catch{if(!res.headersSent)res.writeHead(502);res.end()}finally{clearTimeout(timer);this.active.delete(abort)}
  })
  this.server=server;await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)})
  const address=server.address();if(!address||typeof address==='string')throw Error('Cannot open local stream.')
  return `http://127.0.0.1:${address.port}${path}`
 }
 async close(){for(const abort of this.active)abort.abort();this.active.clear();const server=this.server;this.server=undefined;if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}}
}
export function registerDowntify(handle:Handle,store:Store,player:Player){
 const id=z.string().min(1).max(2048),ref=z.object({serverId:id,trackId:id}).strict()
 const connections=()=>store.get<DtConnection[]>('downtify:connections')??[]
 const provider=(id:string)=>{const connection=connections().find(c=>c.id===id);if(!connection)throw Error('Connect to Downtify in Settings.');return new Downtify(connection,store.secret(`downtify:${id}`)??'')}
 const record=(serverId:string,trackId:string)=>{const r=store.get<DtRecord>(`downtify:track:${serverId}:${trackId}`);if(!r)throw Error('Refresh this track in Downtify before playing.');return r}
 const playable=(serverId:string,trackId:string)=>{if(!/^[a-f0-9]{64}$/.test(trackId))throw Error('Choose a playable track.');return record(serverId,trackId)}
 const relay=new DowntifyRelay()
 player.downtifyStream=async(serverId,trackId)=>{const p=provider(serverId),r=playable(serverId,trackId),url=await p.streamPath(r);const resolved=url.searchParams.get('video_id');if(resolved){r.video=resolved;store.set(`downtify:track:${serverId}:${trackId}`,r)}return relay.open(url,p.headers())}
 handle('downtify:connections',z.undefined(),connections)
 handle('downtify:connect',z.object({id:id.optional(),name:z.string().trim().min(1).max(100),url:z.string().url().max(2000),username:z.string().max(100),password:z.string().max(1000)}).strict(),async input=>{
  const old=input.id?connections().find(c=>c.id===input.id):undefined
  if(input.id&&!old)throw Error('This connection was removed.')
  const url=serverUrl(input.url,'').href
  if(old&&(url!==old.url||input.username!==old.username))throw Error('Add a separate connection for a different server or account to keep queues and history separate.')
  const cookie=old&&!input.password?store.secret(`downtify:${old.id}`)??'':await Downtify.login(url,input.username,input.password)
  const connection:DtConnection={id:old?.id??randomUUID(),name:input.name,url,username:input.username,version:''}
  connection.version=await new Downtify(connection,cookie).test()
  store.setSecret(`downtify:${connection.id}`,cookie);store.set('downtify:connections',[...connections().filter(c=>c.id!==connection.id),connection]);return connection
 })
 handle('downtify:test',id,async id=>`Connected · Downtify ${await provider(id).test()}`)
 handle('downtify:remove',id,async id=>{if(player.state.queue[player.state.queueIndex]?.target.serverId===id)await player.command({action:'stop'});store.set('downtify:connections',connections().filter(c=>c.id!==id));store.setSecret(`downtify:${id}`,'')})
 handle('downtify:browse',z.object({serverId:id,view:z.enum(['discover','search','similar','library','playlist','album','artist']),query:z.string().max(300).optional(),artist:z.string().max(200).optional(),track:z.string().max(200).optional(),playlist:z.string().max(500).optional(),collectionId:z.string().regex(/^\d+$/).optional()}).strict(),async q=>{const rows=await provider(q.serverId).browse(q);for(const r of rows)store.set(`downtify:track:${q.serverId}:${r.track.id}`,r);return rows.map(r=>r.track)})
 handle('downtify:collections',z.object({serverId:id,kind:z.enum(['album','artist']),query:z.string().max(300)}).strict(),async q=>{
  const p=provider(q.serverId),data=await p.json(q.query?'api/finder/search':'api/discover/chart',q.query?{query:q.query,limit:'30'}:{limit:'30'})
  const rows=data[q.kind==='album'?'albums':'artists'];if(!Array.isArray(rows))throw Error('Collections are unavailable on this server.')
  return rows.filter(r=>/^\d+$/.test(String(r[q.kind+'_id']))).map(r=>{const coverId=`${q.kind}-${r[q.kind+'_id']}`;store.set(`downtify:track:${q.serverId}:${coverId}`,{track:{id:coverId,serverId:q.serverId,title:String(r.name),artist:String(r.artist??''),album:'',duration:0,saved:false},file:'',video:'',cover:String(r.cover_url??''),url:''} satisfies DtRecord);return{id:String(r[q.kind+'_id']),coverId,serverId:q.serverId,kind:q.kind,title:String(r.name),artist:String(r.artist??'')}})
 })
 handle('downtify:workspace',z.object({serverId:id,mode:z.enum(['saved','discover','artist','album']),query:z.string().max(300).optional(),id:z.string().regex(/^\d+$/).optional()}).strict(),q=>{if((q.mode==='artist'||q.mode==='album')&&!q.id)throw Error('Choose a collection.');return dtWorkspace(provider(q.serverId),q,r=>store.set(`downtify:track:${q.serverId}:${r.track.id}`,r))})
 handle('downtify:jobs',id,async id=>{const data=await provider(id).json('api/queue');if(!Array.isArray(data))throw Error('Download status unavailable.');return data.slice(-100).reverse().map((r,i)=>({id:String(r.song?.song_id??i),title:String(r.song?.name??'Download'),artist:Array.isArray(r.song?.artists)?r.song.artists.join(', '):'',status:String(r.status??'unknown'),progress:Number.isFinite(Number(r.progress))?Math.max(0,Math.min(100,Number(r.progress))):0}))})
 handle('downtify:playlists',id,id=>provider(id).playlists())
 handle('downtify:save',ref,async q=>{await provider(q.serverId).save(playable(q.serverId,q.trackId));return {message:'Sent to Downtify’s download queue. It will save to the server’s configured library folder.'}})
 return {has:(id:string)=>connections().some(c=>c.id===id),cover:(serverId:string,trackId:string)=>provider(serverId).cover(record(serverId,trackId)),close:()=>relay.close()}
}
