import { createServer, type Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Jellyfin, JfSource } from './providers/jellyfin'
import type { JfItem } from '../shared/jellyfin'

// Only this capability URL reaches MPV. Server credentials and authenticated URLs
// stay in the main process; redirects cannot forward credentials to another host.
export class JellyfinRelay {
 private server?:Server
 private active=new Set<AbortController>()
 async open(provider:Jellyfin,item:JfItem,source:JfSource){
  await this.close()
  const capability=randomBytes(24).toString('hex')
  const external=source.MediaStreams.filter(s=>s.Type==='Subtitle'&&s.IsExternal&&['srt','ass','ssa','vtt','subrip','webvtt'].includes(s.Codec??''))
  const server=createServer(async(req,res)=>{
   if(!['GET','HEAD'].includes(req.method??'')||!req.url?.startsWith(`/${capability}/`)){res.writeHead(404).end();return}
   const route=req.url.slice(capability.length+2)
   let target:URL
   if(route==='media')target=provider.url(`${item.kind==='Audio'?'Audio':'Videos'}/${item.id}/stream`,{Static:true,MediaSourceId:source.Id})
   else {const sub=external.find(s=>route===`sub/${s.Index}`);if(!sub){res.writeHead(404).end();return};const format=sub.Codec==='subrip'?'srt':sub.Codec==='webvtt'?'vtt':sub.Codec!;target=provider.url(`Videos/${item.id}/${source.Id}/Subtitles/${sub.Index}/Stream.${format}`)}
   const abort=new AbortController();this.active.add(abort);res.on('close',()=>abort.abort())
   const timer=setTimeout(()=>abort.abort(),20000)
   try{
    const headers:Record<string,string>={...provider.headers()};if(req.headers.range)headers.Range=req.headers.range;if(typeof req.headers['if-range']==='string')headers['If-Range']=req.headers['if-range']
    const upstream=await fetch(target,{method:req.method,headers,signal:abort.signal,redirect:'error'});clearTimeout(timer)
    for(const h of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){const v=upstream.headers.get(h);if(v)res.setHeader(h,v)}
    res.setHeader('Cache-Control','no-store');res.writeHead(upstream.status)
    if(req.method==='HEAD'||!upstream.body)res.end();else await pipeline(Readable.fromWeb(upstream.body as never),res)
   }catch{if(!res.headersSent)res.writeHead(502);res.end()}finally{clearTimeout(timer);this.active.delete(abort)}
  })
  this.server=server
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve()})})
  const address=server.address();if(!address||typeof address==='string')throw Error('Cannot start the local media connection.')
  const base=`http://127.0.0.1:${address.port}/${capability}`
  return {url:`${base}/media`,subtitles:external.map(s=>({url:`${base}/sub/${s.Index}`,title:s.DisplayTitle??s.Language??'Subtitle',language:s.Language??''}))}
 }
 async close(){for(const a of this.active)a.abort();this.active.clear();const server=this.server;this.server=undefined;if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}}
}
