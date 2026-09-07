import {afterEach,describe,expect,it,vi} from 'vitest'
import {createHash} from 'node:crypto'
import {LastfmArtwork,publicArtwork} from '../src/main/lastfm'
import type {Store} from '../src/main/store'

const cover='https://lastfm.freetls.fastly.net/i/u/300x300/album.png'
const metadata={artist:'Shunno',album:'Tagged album',title:'Shono Mohajon'}
function fixture(){
  const cache=new Map<string,{value:unknown;updated:number}>()
  const store={secret:()=> 'a'.repeat(32),cache:(key:string)=>cache.get(key),cacheSet:(key:string,value:unknown)=>cache.set(key,{value,updated:Date.now()})} as unknown as Store
  const fetcher=vi.fn<typeof fetch>(),imageFetcher=vi.fn<typeof fetch>().mockImplementation(async()=>new Response(null,{headers:{'content-type':'image/jpeg'}}))
  const client=new LastfmArtwork(store,(input,init)=>new URL(String(input)).hostname==='ws.audioscrobbler.com'?fetcher(input,init):imageFetcher(input,init))
  return {store,cache,fetcher,imageFetcher,client}
}
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks()})
describe('Last.fm artwork lookup',()=>{
  it('checks a missing current-CDN cover at the same path on the legacy CDN without credentials',async()=>{
    const {client,fetcher,imageFetcher}=fixture()
    const currentCover=cover.replace('lastfm.','lastfm-img.')
    fetcher.mockResolvedValueOnce(response({album:{image:[{'#text':currentCover,size:'mega'}]}}))
    imageFetcher.mockResolvedValueOnce(new Response(null,{status:404}))
    expect((await client.lookup({...metadata,corrected:true})).url).toBe(cover)
    expect(imageFetcher.mock.calls.map(call=>call[0])).toEqual([currentCover,cover])
    for(const [,options] of imageFetcher.mock.calls){expect(options?.credentials).toBe('omit');expect(options?.redirect).toBe('error');expect(options?.headers).toBeUndefined()}
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('does not send nonexistent covers or cache image server failures as missing matches',async()=>{
    const {client,fetcher,imageFetcher,cache}=fixture()
    const currentCover=cover.replace('lastfm.','lastfm-img.')
    fetcher.mockImplementation(async()=>response({album:{image:[{'#text':currentCover,size:'mega'}]}}))
    imageFetcher.mockImplementation(async()=>new Response(null,{status:404}))
    expect((await client.lookup({...metadata,corrected:true})).url).toBeUndefined()
    expect(imageFetcher).toHaveBeenCalledTimes(2)
    cache.clear();imageFetcher.mockResolvedValueOnce(new Response(null,{status:503}))
    await expect(client.lookup(metadata)).rejects.toThrow('artwork server failed');expect(cache.size).toBe(0)
    client.reset();imageFetcher.mockResolvedValueOnce(new Response('<html>Not an image</html>',{headers:{'content-type':'text/html'}}))
    await expect(client.lookup(metadata)).rejects.toThrow('unsupported image');expect(cache.size).toBe(0)
  })
  it('accepts the current Last.fm image CDN for a corrected album and bypasses old cached misses',async()=>{
    const {client,fetcher,cache}=fixture()
    const corrected={artist:'Pritam',album:'Ae Dil Hai Mushkil (Original Motion Picture Soundtrack) [Deluxe Edition]',title:'Ae Dil Hai Mushkil (Title Track)',corrected:true}
    const currentCover='https://lastfm-img.freetls.fastly.net/i/u/300x300/98a9460a6ebe178b5524ac41d5bbfda4.jpg'
    const oldKey='lastfm:v2:'+createHash('sha256').update(JSON.stringify(corrected)).digest('hex')
    cache.set(oldKey,{value:{message:'No public cover found'},updated:Date.now()})
    fetcher.mockResolvedValueOnce(response({album:{image:[{'#text':currentCover.replace('300x300','34s'),size:'small'},{'#text':currentCover,size:'mega'}]}}))
    expect((await client.lookup(corrected)).url).toBe(currentCover)
    expect((await client.lookup(corrected)).url).toBe(currentCover)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('prefers the largest album image and caches without storing an API key',async()=>{
    const {client,fetcher,cache}=fixture()
    fetcher.mockResolvedValue(response({album:{image:[{'#text':cover,size:'extralarge'},{'#text':cover.replace('300x300','34s'),size:'small'}]}}))
    expect((await client.lookup(metadata)).url).toBe(cover)
    expect((await client.lookup(metadata)).url).toBe(cover)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.stringify([...cache])).not.toContain('a'.repeat(32))
    const request=new URL(String(fetcher.mock.calls[0][0]));expect(request.searchParams.get('method')).toBe('album.getInfo')
    expect(fetcher.mock.calls[0][1]?.redirect).toBe('error')
  })
  it('falls back to track matching when the album is missing',async()=>{
    const {client,fetcher}=fixture()
    fetcher.mockResolvedValueOnce(response({error:6})).mockResolvedValueOnce(response({track:{album:{image:[{'#text':cover,size:'large'}]}}}))
    const result=await client.lookup(metadata);expect(result.url).toBe(cover);expect(result.message).toContain('track matching')
    const request=new URL(String(fetcher.mock.calls[1][0]));expect(request.searchParams.get('track')).toBe(metadata.title);expect(request.searchParams.get('artist')).toBe(metadata.artist)
  })
  it('reads an HTTP 404 album API error and continues to the track cover',async()=>{
    const {client,fetcher}=fixture()
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:6,message:'Album not found'}),{status:404}))
      .mockResolvedValueOnce(response({track:{album:{image:[{'#text':cover,size:'large'}]}}}))
    expect((await client.lookup(metadata)).url).toBe(cover)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('method')).toBe('track.getInfo')
  })
  it('reports and caches a missing match when both HTTP 404 responses identify missing resources',async()=>{
    const {client,fetcher}=fixture()
    fetcher.mockImplementation(async()=>new Response(JSON.stringify({error:6,message:'Not found'}),{status:404}))
    expect((await client.lookup(metadata)).message).toContain('No public cover')
    await client.lookup(metadata);expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('shows authentication errors from HTTP 403 without falling back or caching',async()=>{
    const {client,fetcher,cache}=fixture()
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:10,message:'Invalid API key'}),{status:403}))
    await expect(client.lookup(metadata)).rejects.toThrow('API key')
    expect(fetcher).toHaveBeenCalledTimes(1);expect(cache.size).toBe(0)
  })
  it('does not mislabel an HTML/proxy 404 or server failure as missing album artwork',async()=>{
    const {client,fetcher,cache}=fixture()
    fetcher.mockResolvedValueOnce(new Response('<html>Not found</html>',{status:404}))
    await expect(client.lookup(metadata)).rejects.toThrow('HTTP 404')
    expect(cache.size).toBe(0);expect(fetcher).toHaveBeenCalledTimes(1)
    client.reset();fetcher.mockResolvedValueOnce(new Response('Offline',{status:503}))
    await expect(client.lookup(metadata)).rejects.toThrow('HTTP 503');expect(cache.size).toBe(0)
  })
  it('can find a cover without an album tag and does not fall back past explicit corrections',async()=>{
    const {client,fetcher}=fixture()
    fetcher.mockResolvedValueOnce(response({track:{album:{image:[{'#text':cover,size:'large'}]}}}))
    expect((await client.lookup({...metadata,album:''})).url).toBe(cover)
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get('method')).toBe('track.getInfo')
    fetcher.mockResolvedValueOnce(response({error:6}))
    expect((await client.lookup({...metadata,corrected:true})).url).toBeUndefined();expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('rejects placeholder, private and credential-bearing images, reports a miss, and permits refresh',async()=>{
    const {client,fetcher}=fixture()
    const invalid=['https://lastfm.freetls.fastly.net/i/u/2a96cbd8b46e442fc41c2b86b821562f.png','https://private.test/art?token=secret','https://lastfm.freetls.fastly.net:444/art.png']
    for(const url of invalid)expect(publicArtwork(url)).toBeUndefined()
    fetcher.mockImplementation(async()=>response({album:{image:invalid.map(url=>({'#text':url,size:'large'}))},track:{}}))
    expect((await client.lookup(metadata)).message).toContain('No public cover')
    await client.lookup(metadata);expect(fetcher).toHaveBeenCalledTimes(2)
    fetcher.mockResolvedValueOnce(response({album:{image:[{'#text':cover,size:'large'}]}}))
    expect((await client.lookup(metadata,true)).url).toBe(cover)
  })
  it('does not cache authentication failures and recovers when the key is replaced',async()=>{
    const {client,fetcher,cache}=fixture()
    fetcher.mockResolvedValueOnce(response({error:10}));await expect(client.lookup(metadata)).rejects.toThrow('API key')
    expect(cache.size).toBe(0);client.reset()
    fetcher.mockResolvedValueOnce(response({album:{image:[{'#text':cover,size:'large'}]}}))
    expect((await client.lookup(metadata)).url).toBe(cover)
  })
  it('retries transient failures after backoff even on the same track',async()=>{
    vi.useFakeTimers();const {client,fetcher}=fixture()
    fetcher.mockRejectedValueOnce(new TypeError('Network failure including a secret URL'))
    await expect(client.lookup(metadata)).rejects.toThrow('could not be reached')
    await expect(client.lookup(metadata,true)).rejects.toThrow('could not be reached');expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60001)
    fetcher.mockResolvedValueOnce(response({album:{image:[{'#text':cover,size:'large'}]}}))
    expect((await client.lookup(metadata)).url).toBe(cover)
  })
  it('explains rate limits and bounds responses',async()=>{
    const {client,fetcher}=fixture()
    fetcher.mockResolvedValueOnce(response({error:29}));await expect(client.lookup(metadata)).rejects.toThrow('rate limiting')
    client.reset();fetcher.mockResolvedValueOnce(new Response('x'.repeat(524289)))
    await expect(client.lookup(metadata)).rejects.toThrow('oversized')
  })
  it('makes no request without the key or enough metadata',async()=>{
    const {client,store,fetcher}=fixture()
    expect((await client.lookup({...metadata,artist:''})).message).toContain('audio tags')
    vi.spyOn(store,'secret').mockReturnValue('')
    expect((await client.lookup(metadata)).message).toContain('API key');expect(fetcher).not.toHaveBeenCalled()
  })
})
