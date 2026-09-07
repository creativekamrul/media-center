import {describe,it,expect,vi,afterEach} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {Store} from '../src/main/store'
import {LyricsClient} from '../src/main/lyrics'
import {parseLrc,activeLyricIndex} from '../src/shared/lyrics'
import {progressKey} from '../src/shared/timeline'
const signature={title:'Fixture song',artist:'Fixture artist',album:'Fixture album',duration:120}
const payload={instrumental:false,duration:120,plainLyrics:'First fixture line',syncedLyrics:'[00:01.50]First fixture line\n[00:03.25]Second fixture line'}
afterEach(()=>vi.useRealTimers())
describe('LRCLIB integration',()=>{
 it('searches and retrieves a chosen record, and keeps the binding outside the evictable cache',async()=>{
  const record={...payload,id:42,trackName:'Chosen version',artistName:'Artist',albumName:'Album'},store=new Store(':memory:')
  const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify([record]))).mockResolvedValueOnce(new Response(JSON.stringify(record)))
  try{
   const client=new LyricsClient(store,fetcher),results=await client.search('Chosen Artist')
   expect(results[0].title).toBe('Chosen version');expect(results[0].lines).toHaveLength(2)
   const chosen=await client.get(42),key=progressKey({kind:'music-track',serverId:'one',trackId:'song'})
   client.save(key,chosen);store.cacheClear()
   const offline=vi.fn<typeof fetch>().mockRejectedValue(new Error('Offline')),restarted=new LyricsClient(store,offline)
   expect(restarted.saved(key)).toEqual(chosen)
   expect(restarted.saved(progressKey({kind:'music-track',serverId:'two',trackId:'song'}))).toBeUndefined()
   expect(restarted.saved(progressKey({kind:'local-file',serverId:'local',rootId:'one',fileId:'song'}))).toBeUndefined()
   restarted.clear(key);expect(restarted.saved(key)).toBeUndefined();expect(offline).not.toHaveBeenCalled()
   expect(String(fetcher.mock.calls[0][0])).toContain('/api/search?q=Chosen+Artist');expect(String(fetcher.mock.calls[1][0])).toContain('/api/get/42')
  }finally{store.close()}
 })
 it('rejects an incorrect record ID and shares rate limits between search and automatic lookup',async()=>{
  const store=new Store(':memory:');try{
   const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({...payload,id:43,trackName:'Wrong',artistName:'Artist',albumName:''}))).mockResolvedValueOnce(new Response('',{status:429,headers:{'Retry-After':'60'}}))
   const client=new LyricsClient(store,fetcher);await expect(client.get(42)).rejects.toThrow('different lyrics record')
   await expect(client.search('Artist')).rejects.toThrow('rate limiting');await expect(client.lookup(signature)).rejects.toThrow('wait');expect(fetcher).toHaveBeenCalledTimes(2)
  }finally{store.close()}
 })
 it('parses multiple timestamps, fractional seconds, blank breaks and out-of-order lines',()=>{
  const rows=parseLrc('[ar:Test]\n[00:04.250]Last\n[00:01.5][00:03]Repeat\n[00:02.00]\n[00:99]Invalid')
  expect(rows).toEqual([{time:1.5,text:'Repeat'},{time:2,text:''},{time:3,text:'Repeat'},{time:4.25,text:'Last'}])
  expect(activeLyricIndex(rows,0)).toBe(-1);expect(activeLyricIndex(rows,3)).toBe(2);expect(activeLyricIndex(rows,1.6)).toBe(0);expect(activeLyricIndex(rows,2.999999)).toBe(2)
 })
 it('uses public metadata only, deduplicates lookups and caches success',async()=>{
  const store=new Store(':memory:'),fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)))
  try{const client=new LyricsClient(store,fetcher);const [a,b]=await Promise.all([client.lookup(signature),client.lookup(signature)]);expect(a).toEqual(b);expect(a.lines).toHaveLength(2);await client.lookup(signature);expect(fetcher).toHaveBeenCalledTimes(1)
   const [url,options]=fetcher.mock.calls[0];expect(String(url)).toContain('duration=120');expect(String(url)).toContain('artist_name=Fixture+artist');expect(options?.headers).not.toHaveProperty('Authorization');expect(options?.headers).toHaveProperty('User-Agent');expect(options?.redirect).toBe('error')
  }finally{store.close()}
 })
 it.each([['plain',{...payload,syncedLyrics:null},'found'],['instrumental',{...payload,instrumental:true},'instrumental'],['wrong duration',{...payload,duration:150},'missing']])('handles %s responses',async(_name,data,status)=>{
  const store=new Store(':memory:');try{const client=new LyricsClient(store,vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(data))));const result=await client.lookup(signature);expect(result.status).toBe(status);expect(result.lines).toHaveLength(0)}finally{store.close()}
 })
 it('caches missing lyrics without repeated requests',async()=>{
  const store=new Store(':memory:'),fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status:404}));try{const client=new LyricsClient(store,fetcher);expect((await client.lookup(signature)).status).toBe('missing');await client.lookup(signature);expect(fetcher).toHaveBeenCalledTimes(1)}finally{store.close()}
 })
 it('honours Retry-After across requests and client restarts',async()=>{
  const store=new Store(':memory:'),fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status:429,headers:{'Retry-After':'120'}}));try{await expect(new LyricsClient(store,fetcher).lookup(signature)).rejects.toThrow('rate limiting');await expect(new LyricsClient(store,fetcher).lookup({...signature,title:'Other'})).rejects.toThrow('wait');expect(fetcher).toHaveBeenCalledTimes(1)}finally{store.close()}
 })
 it('rejects oversized or malformed responses rather than caching them',async()=>{
  const store=new Store(':memory:');try{
   await expect(new LyricsClient(store,vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(524289)))).lookup(signature)).rejects.toThrow('too large')
   await expect(new LyricsClient(store,vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))).lookup(signature)).rejects.toThrow('unsupported')
  }finally{store.close()}
 })
})
