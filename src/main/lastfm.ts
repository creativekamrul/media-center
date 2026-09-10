import {appleArtwork} from '../shared/artwork-source'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Store } from './store'

export function publicArtwork(value:string):string|undefined {
  try {
    const apple=appleArtwork(value);if(apple)return apple
    const url=new URL(value)
    if(url.protocol==='https:'&&url.hostname==='coverartarchive.org'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&/^\/release\/[0-9a-f-]{36}\/front-500$/i.test(url.pathname))return url.href
    if(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.search&&!url.hash&&
      ['lastfm-img.freetls.fastly.net','lastfm.freetls.fastly.net','lastfm-img2.akamaized.net'].includes(url.hostname)&&
      !url.pathname.toLowerCase().includes('2a96cbd8b46e442fc41c2b86b821562f'))return url.href
  }catch{}
}
export interface ArtworkMetadata { artist:string; album:string; title:string; corrected?:boolean }
export interface ArtworkResult { url?:string; message:string }
const images=z.array(z.object({'#text':z.string().max(2048),size:z.string()})).max(20).default([])
const album=z.object({image:images})
const schema=z.object({error:z.number().optional(),album:album.optional(),track:z.object({album:album.optional()}).optional()})
function bestImage(items:z.infer<typeof images>=[]) {
  const sizes=['small','medium','large','extralarge','mega']
  return [...items].sort((a,b)=>sizes.indexOf(b.size)-sizes.indexOf(a.size)).map(i=>publicArtwork(i['#text'])).find(Boolean)
}

export class LastfmArtwork {
  private retryAt=0
  private error=''
  constructor(private store:Store,private fetcher:typeof fetch=(...args)=>fetch(...args)){}
  reset(){this.retryAt=0;this.error=''}
  async lookup(metadata:ArtworkMetadata,refresh=false):Promise<ArtworkResult> {
    const apiKey=this.store.secret('lastfm')
    if(!apiKey)return {message:'Add a Last.fm API key to look up album covers.'}
    if(!metadata.artist.trim()||(!metadata.album.trim()&&!metadata.title.trim()))return {message:'Artwork needs an artist and an album or track title in the audio tags.'}
    // Older lookups cached misses when Last.fm returned its current image CDN.
    const key='lastfm:v3:'+createHash('sha256').update(JSON.stringify(metadata)).digest('hex')
    const cached=this.store.cache<ArtworkResult>(key)
    if(!refresh&&cached&&Date.now()-cached.updated<(cached.value.url?604800000:3600000)&&(!cached.value.url||publicArtwork(cached.value.url)))return cached.value
    if(this.retryAt>Date.now())throw new Error(this.error)
    try {
      let url:string|undefined,source='album'
      if(metadata.album.trim())url=await this.resolveImage((await this.request('album.getInfo',{artist:metadata.artist,album:metadata.album},apiKey))?.album?.image)
      // A deliberate album correction must not silently fall back to a different release.
      if(!url&&metadata.title.trim()&&!metadata.corrected){source='track';url=await this.resolveImage((await this.request('track.getInfo',{artist:metadata.artist,track:metadata.title},apiKey))?.track?.album?.image)}
      const result:ArtworkResult=url?{url,message:`Album cover found through Last.fm ${source} matching. Discord controls when the image appears.`}:{message:'No public cover found on Last.fm for this track. Try correcting the album match below.'}
      this.store.cacheSet(key,result)
      return result
    }catch(e){
      const message=e instanceof Error&&e.message.startsWith('Last.fm ')?e.message:'Last.fm could not be reached or returned an unsupported response. Check your connection and retry.'
      this.error=message;this.retryAt=Date.now()+60000
      throw new Error(message)
    }
  }
  private async resolveImage(items:z.infer<typeof images>=[]):Promise<string|undefined> {
    const image=bestImage(items)
    if(!image)return undefined
    const candidates=[image],url=new URL(image)
    // Some API covers are missing on the current CDN but exist at the same
    // public path on Last.fm's older CDN. Probe both without sending API keys.
    if(url.hostname==='lastfm-img.freetls.fastly.net'){
      url.hostname='lastfm.freetls.fastly.net';candidates.push(url.href)
    }
    for(const candidate of candidates){
      const response=await this.fetcher(candidate,{signal:AbortSignal.timeout(8000),redirect:'error',credentials:'omit'})
      // GET checks the URL Discord will fetch; cancel immediately after headers.
      await response.body?.cancel()
      if(response.status===404||response.status===410)continue
      if(response.status===429)throw new Error('Last.fm artwork is rate limited. Try again in a minute.')
      if(!response.ok)throw new Error(`Last.fm artwork server failed (HTTP ${response.status}). Try again shortly.`)
      if(!/^image\/(jpeg|png|webp|gif|avif)(?:\s*;|$)/i.test(response.headers.get('content-type')??''))throw new Error('Last.fm artwork server returned an unsupported image response. Try again shortly.')
      return candidate
    }
  }
  private async request(method:string,params:Record<string,string>,apiKey:string) {
    const url=new URL('https://ws.audioscrobbler.com/2.0/')
    url.search=new URLSearchParams({method,...params,api_key:apiKey,autocorrect:'1',format:'json'}).toString()
    const response=await this.fetcher(url,{signal:AbortSignal.timeout(8000),redirect:'error'})
    const httpError=()=>new Error(`Last.fm request failed (HTTP ${response.status}). The service did not return a usable lookup result. Try again later.`)
    if(response.status===429){await response.body?.cancel();throw new Error('Last.fm is rate limiting requests. Try again in a minute.')}
    // Last.fm can attach API errors to non-2xx responses. Read those before
    // deciding whether a missing album should fall back to the track lookup.
    if(!response.ok&&![400,403,404].includes(response.status)){await response.body?.cancel();throw httpError()}
    const reader=response.body?.getReader();if(!reader)throw new Error('Last.fm returned an empty response.')
    const chunks:Uint8Array[]=[];let length=0
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>524288){await reader.cancel();throw new Error('Last.fm returned an oversized response.')}chunks.push(value)}
    let data:z.infer<typeof schema>
    try{data=schema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch(e){if(!response.ok)throw httpError();throw e}
    if(!response.ok&&!data.error)throw httpError()
    if(data.error===6||data.error===7)return undefined
    if(data.error===10||data.error===26)throw new Error('Last.fm rejected the API key. Replace it in Settings and save.')
    if(data.error===29)throw new Error('Last.fm is rate limiting requests. Try again in a minute.')
    if(data.error)throw new Error('Last.fm is temporarily unable to look up artwork. Try again shortly.')
    return data
  }
}
