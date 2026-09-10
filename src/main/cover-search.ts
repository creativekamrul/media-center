import {appleArtwork} from '../shared/artwork-source'
import {z} from 'zod'
import {nativeImage} from 'electron'
import {validateArtwork} from './artwork-image'
import {APP_VERSION} from '../shared/version'
import type {CoverCandidate} from '../shared/personal-library'
const uuid=z.string().uuid()
export function artworkHost(url:URL){return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&(url.hostname==='musicbrainz.org'||url.hostname==='coverartarchive.org'||url.hostname==='archive.org'||url.hostname.endsWith('.archive.org')||url.hostname==='itunes.apple.com'||Boolean(appleArtwork(url.href)))}
async function bytes(url:string,limit:number){let current=new URL(url);for(let n=0;n<6;n++){if(!artworkHost(current))throw Error('Artwork provider redirected to an unsupported host.');const r=await fetch(current,{redirect:'manual',headers:{'User-Agent':`MediaCenter/${APP_VERSION} (https://github.com/creativekamrul/media-center)`},signal:AbortSignal.timeout(15000)}).catch(()=>{throw Error(`Unable to connect to ${current.hostname}. Check your connection or try another artwork search later.`)});if([301,302,303,307,308].includes(r.status)){await r.body?.cancel();current=new URL(r.headers.get('location')??'',current);continue}if(!r.ok){await r.body?.cancel();throw Error(r.status===404?'No cover is available for this release.':`Artwork service returned HTTP ${r.status}. Please try again later.`)}if(Number(r.headers.get('content-length'))>limit){await r.body?.cancel();throw Error('Artwork response is too large.')}const reader=r.body?.getReader();if(!reader)throw Error('Artwork response was empty.');const chunks:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Artwork response is too large.');chunks.push(value)}}finally{await reader.cancel()}return Buffer.concat(chunks)}throw Error('Too many artwork redirects.')}
export function artworkData(data:Buffer){validateArtwork(data);const img=nativeImage.createFromBuffer(data);if(img.isEmpty())throw Error('This image could not be decoded.');const size=img.getSize();return img.resize({width:Math.min(768,size.width),quality:'best'}).toDataURL()}
type Result=CoverCandidate&{artworkUrl:string}
export class CoverSearch {
 private results=new Map<string,Result>()
 private tail:Promise<unknown>=Promise.resolve()
 private last=0
 private appleLast=0
 private unavailableUntil=0
 private cache=new Map<string,Result[]>()
 private remember(results:Result[]){for(const r of results)this.results.set(r.id,r);while(this.results.size>256)this.results.delete(this.results.keys().next().value!);return results.map(({artworkUrl,...r})=>r)}
 async search(query:string):Promise<CoverCandidate[]> {
  query=query.trim();const cached=this.cache.get(query);if(cached)return this.remember(cached)
  const work=this.tail.catch(()=>{}).then(async()=>{
   let results:Result[]=[]
   if(Date.now()>=this.unavailableUntil)try {
    await new Promise(r=>setTimeout(r,Math.max(0,1100-(Date.now()-this.last))));this.last=Date.now()
    const url=new URL('https://musicbrainz.org/ws/2/release/');url.search=new URLSearchParams({query,fmt:'json',limit:'16'}).toString()
    const raw=JSON.parse((await bytes(url.href,2*1024*1024)).toString())
    const parsed=z.object({releases:z.array(z.object({id:uuid,title:z.string(),date:z.string().optional(),'artist-credit':z.array(z.object({name:z.string().optional(),artist:z.object({name:z.string()}).optional()})).optional()}))}).parse(raw)
    results=parsed.releases.map(r=>({id:r.id,title:r.title,artist:r['artist-credit']?.map(a=>a.name??a.artist?.name??'').join(', ')??'',date:r.date??'',source:'MusicBrainz · Cover Art Archive',artworkUrl:`https://coverartarchive.org/release/${r.id}/front-500`}))
   }catch{this.unavailableUntil=Date.now()+120000}
   if(!results.length){
    await new Promise(r=>setTimeout(r,Math.max(0,3100-(Date.now()-this.appleLast))));this.appleLast=Date.now()
    const url=new URL('https://itunes.apple.com/search');url.search=new URLSearchParams({term:query,entity:'album',limit:'24'}).toString()
    const raw=JSON.parse((await bytes(url.href,2*1024*1024)).toString())
    const parsed=z.object({results:z.array(z.object({collectionId:z.number().int().positive().safe(),collectionName:z.string(),artistName:z.string(),releaseDate:z.string().optional(),artworkUrl100:z.string().optional()}))}).parse(raw)
    results=parsed.results.flatMap(r=>{const art=appleArtwork(r.artworkUrl100??'');return art?[{id:`itunes:${r.collectionId}`,title:r.collectionName,artist:r.artistName,date:r.releaseDate?.slice(0,10)??'',source:'Apple iTunes',artworkUrl:art.replace('/100x100bb.jpg','/600x600bb.jpg')}]:[]})
   }
   this.cache.set(query,results);if(this.cache.size>12)this.cache.delete(this.cache.keys().next().value!)
   return this.remember(results)
  });this.tail=work;return work
 }
 source(id:string){const r=this.results.get(id);if(!r)throw Error('Search for the cover again before selecting it.');return r.artworkUrl}
 async preview(id:string):Promise<CoverCandidate>{const result=this.results.get(id);if(!result)throw Error('Search for the cover again before selecting it.');if(!result.image)result.image=artworkData(await bytes(result.artworkUrl,5*1024*1024));const {artworkUrl,...publicResult}=result;return publicResult}
}
