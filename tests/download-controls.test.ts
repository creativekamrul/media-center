import {afterEach,describe,it,expect,vi} from 'vitest'
import {mkdtemp,mkdir,symlink,rm,readdir,writeFile,readFile,stat} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
vi.mock('electron',()=>({safeStorage:{}}))
import {Downloads} from '../src/main/downloads'
import {Audiobookshelf} from '../src/main/providers/audiobookshelf'
import {Store} from '../src/main/store'
import type {QueueItem} from '../src/shared/types'

afterEach(()=>vi.restoreAllMocks())
describe('download controls',()=>{
  it('refuses removal when an individual download redirects outside the canonical storage root',async()=>{
    const container=await mkdtemp(join(tmpdir(),'media-download-boundary-')),root=join(container,'storage'),outside=join(container,'outside'),id=randomUUID(),store=new Store(':memory:')
    await mkdir(root);await mkdir(outside);await writeFile(join(outside,'keep.txt'),'keep')
    await symlink(outside,join(root,id),'junction')
    store.set('downloads',[{id,item:{target:{kind:'audiobook',serverId:'s',bookId:'book'},title:'Book',subtitle:''},status:'ready',bytes:4,total:4,createdAt:0,duration:1,chapters:[],files:[]}])
    const downloads=new Downloads(root,store,()=>{throw new Error('No server needed')})
    try { expect((await downloads.batch([id],'remove')).failed).toEqual([id]);expect(await readFile(join(outside,'keep.txt'),'utf8')).toBe('keep');expect(downloads.snapshot().entries).toHaveLength(1) }
    finally {await downloads.stop();store.close();await rm(container,{recursive:true,force:true})}
  })
  it.each([false,true])('pauses/resumes/removes books and episodes through a storage alias: %s',async alias=>{
    const container=await mkdtemp(join(tmpdir(),'media-download-control-')),storage=join(container,'storage'),root=alias?join(container,'alias'):storage,store=new Store(':memory:')
    await mkdir(storage)
    if(alias)await symlink(storage,root,'junction')
    const provider=new Audiobookshelf({id:'s',provider:'audiobookshelf',url:'https://example.test',name:'ABS',username:''},'token')
    vi.spyOn(provider,'get').mockImplementation(async path=>path.includes('/book')?{id:'book',libraryId:'books',mediaType:'book',media:{metadata:{title:'Book'},duration:10,tracks:[{index:1,ino:'file',duration:10,startOffset:0}],chapters:[]}}:{id:'show',libraryId:'podcasts',mediaType:'podcast',media:{metadata:{title:'Show'},episodes:[{id:'episode',title:'Episode',audioFile:{ino:'file',duration:10}}]}})
    vi.spyOn(provider,'cover').mockResolvedValue(null)
    let slow=true,started=0
    const fetchMock=vi.spyOn(globalThis,'fetch').mockImplementation(async (_url,options)=>{
      started++
      return new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1,2]));if(!slow)controller.close();else options?.signal?.addEventListener('abort',()=>controller.error(new Error('aborted')),{once:true})}}),{headers:{'content-type':'audio/flac'}})
    })
    const downloads=new Downloads(root,store,()=>provider)
    const items:QueueItem[]=[{target:{kind:'audiobook',serverId:'s',bookId:'book'},title:'Book',subtitle:''},{target:{kind:'podcast-episode',serverId:'s',showId:'show',episodeId:'episode'},title:'Episode',subtitle:''}]
    try {
      await downloads.add(items);await vi.waitFor(()=>expect(started).toBe(1))
      const ids=downloads.snapshot().entries.map(e=>e.id)
      expect((await downloads.batch(ids,'pause')).failed).toEqual([])
      expect(downloads.snapshot().entries.map(e=>({status:e.status,error:e.error}))).toEqual([{status:'paused',error:'Paused. Resume continues where supported by the server.'},{status:'paused',error:undefined}])
      expect(fetchMock).toHaveBeenCalledTimes(1)
      // An immediate resume waits for cancellation/cleanup rather than losing the command.
      slow=false;await downloads.batch(ids,'retry')
      await vi.waitFor(()=>expect(downloads.snapshot().entries.every(e=>e.status==='ready')).toBe(true))
      expect(await downloads.ready(items[0].target)).toBeDefined();expect(await downloads.ready(items[1].target)).toBeDefined()
      expect((await downloads.batch(ids,'remove')).failed).toEqual([])
      expect(downloads.snapshot().entries).toEqual([]);expect(downloads.snapshot().usedBytes).toBe(0);expect(await readdir(root)).toEqual([])
      slow=true;await downloads.add(items);await vi.waitFor(()=>expect(started).toBe(4))
      expect((await downloads.batch(downloads.snapshot().entries.map(e=>e.id),'remove')).failed).toEqual([])
      expect(downloads.snapshot().entries).toEqual([]);expect(await readdir(root)).toEqual([])
    } finally { await downloads.stop();store.close();await rm(container,{recursive:true,force:true}) }
  })
 it.each(['audiobook','podcast-episode'] as const)('resumes exact original bytes for %s with Range and If-Range',async kind=>{
  const root=await mkdtemp(join(tmpdir(),'media-resume-')),store=new Store(':memory:');const provider=new Audiobookshelf({id:'s',provider:'audiobookshelf',url:'https://example.test',name:'ABS',username:''},'token')
  vi.spyOn(provider,'get').mockResolvedValue(kind==='audiobook'?{id:'book',libraryId:'b',mediaType:'book',media:{metadata:{title:'Book'},tracks:[{index:1,ino:'file',duration:10,startOffset:0}],duration:10,chapters:[]}}:{id:'show',libraryId:'p',mediaType:'podcast',media:{metadata:{title:'Show'},episodes:[{id:'ep',title:'Episode',audioFile:{ino:'file',duration:10}}]}})
  vi.spyOn(provider,'cover').mockResolvedValue(null)
  let calls=0;const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{calls++;if(calls===1)return new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2,3,4]));init?.signal?.addEventListener('abort',()=>c.error(Error('paused')))}}),{headers:{'content-length':'10',etag:'"v1"','content-type':'audio/flac'}});expect(new Headers(init?.headers).get('range')).toBe('bytes=4-');expect(new Headers(init?.headers).get('if-range')).toBe('"v1"');return new Response(new Uint8Array([5,6,7,8,9,10]),{status:206,headers:{'content-length':'6','content-range':'bytes 4-9/10',etag:'"v1"','content-type':'audio/flac'}})})
  const item:QueueItem={target:kind==='audiobook'?{kind,serverId:'s',bookId:'book'}:{kind,serverId:'s',showId:'show',episodeId:'ep'},title:kind,subtitle:''},downloads=new Downloads(root,store,()=>provider)
  try{await downloads.add([item]);const id=downloads.snapshot().entries[0].id;await vi.waitFor(async()=>expect((await stat(join(root,id,'0.audio.part'))).size).toBe(4));await downloads.action(id,'pause');expect(downloads.snapshot().usedBytes).toBe(4);await downloads.action(id,'retry');await vi.waitFor(()=>expect(downloads.snapshot().entries[0].status).toBe('ready'));expect([...await readFile(join(root,id,'0.audio'))]).toEqual([1,2,3,4,5,6,7,8,9,10]);expect(fetcher).toHaveBeenCalledTimes(2)}finally{await downloads.stop();store.close();await rm(root,{recursive:true,force:true})}
 })

})
