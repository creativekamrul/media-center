import {afterEach,describe,expect,it,vi} from 'vitest'
import {LastfmArtwork,publicArtwork} from '../src/main/lastfm'
import type {Store} from '../src/main/store'

const cover='https://lastfm.freetls.fastly.net/i/u/300x300/album.png'
const metadata={artist:'Shunno',album:'Tagged album',title:'Shono Mohajon'}
function fixture(){
  const cache=new Map<string,{value:unknown;updated:number}>()
  const store={secret:()=> 'a'.repeat(32),cache:(key:string)=>cache.get(key),cacheSet:(key:string,value:unknown)=>cache.set(key,{value,updated:Date.now()})} as unknown as Store
  const fetcher=vi.fn<typeof fetch>(),client=new LastfmArtwork(store,fetcher)
  return {store,cache,fetcher,client}
}
const response=(body:unknown)=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}})
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks()})
describe('Last.fm artwork lookup',()=>{
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
