import {afterEach,expect,it,vi} from 'vitest'
vi.mock('electron',()=>({nativeImage:{}}))
import {CoverSearch,artworkHost} from '../src/main/cover-search'
import {appleArtwork,coverIdSchema,coverSource} from '../src/shared/artwork-source'

const art='https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/a/b/cover.jpg/100x100bb.jpg'
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers()})
it('falls back after MusicBrainz connection failure, caches trusted artwork and avoids repeated failed connections',async()=>{
 vi.useFakeTimers()
 const fetch=vi.fn(async(input:URL)=>{if(input.hostname==='musicbrainz.org')throw TypeError('fetch failed');return new Response(JSON.stringify({results:[{collectionId:1157937382,collectionName:'1920 London',artistName:'Sharib Toshi',artworkUrl100:art}]}))})
 vi.stubGlobal('fetch',fetch);const search=new CoverSearch()
 const first=search.search('Sharib Sabri 1920 London');await vi.runAllTimersAsync()
 expect(await first).toEqual([{id:'itunes:1157937382',title:'1920 London',artist:'Sharib Toshi',date:'',source:'Apple iTunes'}])
 expect(search.source('itunes:1157937382')).toBe(art.replace('100x100','600x600'))
 await search.search('Sharib Sabri 1920 London');expect(fetch).toHaveBeenCalledTimes(2)
 const next=search.search('another query');await vi.runAllTimersAsync();await next
 expect(fetch.mock.calls.filter(([u])=>u.hostname==='musicbrainz.org')).toHaveLength(1)
})
it('uses MusicBrainz when available and reports actionable failures when both providers fail',async()=>{
 vi.useFakeTimers();const fetch=vi.fn(async()=>new Response(JSON.stringify({releases:[{id:'12345678-1234-1234-1234-123456789abc',title:'Album'}]})));vi.stubGlobal('fetch',fetch)
 const primary=new CoverSearch().search('Album');await vi.runAllTimersAsync();expect((await primary)[0].source).toContain('MusicBrainz');expect(fetch).toHaveBeenCalledTimes(1)
 fetch.mockRejectedValue(TypeError('fetch failed'));const failed=new CoverSearch().search('Album');const assertion=expect(failed).rejects.toThrow('Unable to connect to itunes.apple.com');await vi.runAllTimersAsync();await assertion
})
it('rejects forged image sources, redirects, and IDs before preview or backup use',()=>{
 expect(coverIdSchema.safeParse('itunes:1157937382').success).toBe(true)
 expect(coverSource(art)).toBe(true)
 for(const url of [art+'?token=secret',art.replace('is1-ssl.mzstatic.com','is1-ssl.mzstatic.com.evil.test'),art.replace('https:','http:'),'https://is1-ssl.mzstatic.com/arbitrary','https://localhost/image/thumb/a/100x100bb.jpg']){expect(appleArtwork(url)).toBeUndefined();expect(coverSource(url)).toBe(false);expect(artworkHost(new URL(url))).toBe(false)}
 expect(coverIdSchema.safeParse(art).success).toBe(false)
})
