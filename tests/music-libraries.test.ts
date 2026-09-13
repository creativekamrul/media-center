import {afterEach,describe,expect,it,vi} from 'vitest'
import {browseAllMusic,musicQuerySchema} from '../src/main/music-libraries'
import {Navidrome} from '../src/main/providers/navidrome'
import type {Connection,MusicTrack} from '../src/shared/types'

const servers:Connection[]=['First','Second'].map((name,i)=>({id:`server-${i}`,name,provider:'navidrome',url:`https://server-${i}.test`,username:'fixture'}))
const query={view:'songs' as const,page:0,search:''}
const song=(serverId:string,id='same'):MusicTrack=>({kind:'music-track',serverId,id,title:id,artist:'Fixture',album:'Fixture',duration:60})
afterEach(()=>vi.unstubAllGlobals())
describe('combined music libraries',()=>{
  it('keeps colliding IDs separate and advances every server without repeating folder-wide resources',async()=>{
    const browse=vi.fn(async input=>({items:[song(input.serverId)],page:input.page,hasMore:input.serverId===servers[1].id,total:input.serverId===servers[0].id?1:65}))
    const result=await browseAllMusic([...servers,{...servers[0],id:'books',provider:'audiobookshelf'}],{...query,page:1,search:'Fixture',genre:'Rock'},browse)
    expect(result.items.map(i=>i.serverId)).toEqual(['server-0','server-1'])
    expect(result.total).toBe(66);expect(result.hasMore).toBe(true)
    expect(browse.mock.calls.map(([i])=>i)).toEqual(servers.map(s=>({...query,page:1,search:'Fixture',genre:'Rock',serverId:s.id,libraryId:'all'})))
  })
  it('still shows a longer server after another is exhausted',async()=>{
    const result=await browseAllMusic(servers,{...query,page:2},async input=>({items:input.serverId==='server-0'?[]:[song(input.serverId,'tail')],page:2,hasMore:false}))
    expect(result.items.map(i=>i.id)).toEqual(['tail']);expect(result.hasMore).toBe(false);expect(result.total).toBeUndefined()
  })
  it('reports a failed source without hiding healthy results or exposing network details',async()=>{
    const result=await browseAllMusic(servers,query,async input=>{if(input.serverId==='server-1')throw Error('https://secret@server.test');return {items:[song(input.serverId)],page:0,total:1,hasMore:false}})
    expect(result.items).toHaveLength(1);expect(result.total).toBeUndefined();expect(result.errors).toEqual(['Second: Could not load music. Check the connection and retry.'])
    await expect(browseAllMusic(servers,query,async()=>{throw Error('secret')})).rejects.toThrow('First: Could not load music.')
  })
  it('validates the query and rejects renderer-supplied network or server scope',()=>{
    expect(musicQuerySchema.safeParse(query).success).toBe(true)
    for(const extra of [{page:-1},{serverId:'anything'},{url:'https://example.test'},{search:'a'.repeat(501)}])expect(musicQuerySchema.safeParse({...query,...extra}).success).toBe(false)
  })
  it('uses each Navidrome connection for identically numbered folders, records and mutations',async()=>{
    const calls:{host:string;path:string;params:URLSearchParams}[]=[]
    vi.stubGlobal('fetch',vi.fn(async(input,init)=>{
      const url=new URL(String(input)),params=init?.body?new URLSearchParams(init.body):url.searchParams
      calls.push({host:url.host,path:url.pathname,params})
      let data:Record<string,unknown>={}
      if(url.pathname.includes('getMusicFolders'))data={musicFolders:{musicFolder:[{id:1,name:'Music Library'}]}}
      if(url.pathname.includes('search3'))data={searchResult3:{song:[{id:'same',title:url.host,duration:60}]}}
      if(url.pathname.includes('getAlbum.view'))data={album:{id:'same',name:url.host,song:[{id:'same',title:url.host}]}}
      return new Response(JSON.stringify({'subsonic-response':{status:'ok',...data}}))
    }))
    const providers=servers.map(c=>new Navidrome(c,'fixture-only'))
    expect((await Promise.all(providers.map(p=>p.libraries()))).flat().map(l=>[l.serverId,l.id,l.name])).toEqual([['server-0','1','First · Music Library'],['server-1','1','Second · Music Library']])
    const combined=await browseAllMusic(servers,query,i=>providers.find(p=>p.connection.id===i.serverId)!.catalog(i))
    expect(combined.items.map(i=>[i.id,i.serverId])).toEqual([['same','server-0'],['same','server-1']])
    await providers[1].catalog({...query,serverId:'server-1',libraryId:'1'})
    expect(calls.at(-1)?.params.get('musicFolderId')).toBe('1')
    const detail=await providers[1].collection('album','same');expect(detail.tracks[0].serverId).toBe('server-1')
    await providers[1].favorite('song','same',true);await providers[1].rate('same',4)
    expect(calls.slice(-2).map(c=>[c.host,c.params.get('id')])).toEqual([['server-1.test','same'],['server-1.test','same']])
    expect(new URL(providers[1].stream('same')).host).toBe('server-1.test')
    expect(calls.filter(c=>c.path.includes('search3')).slice(0,2).every(c=>!c.params.has('musicFolderId'))).toBe(true)
  })
})
