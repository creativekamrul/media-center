import {afterEach,describe,it,expect,vi} from 'vitest'
import {mkdtemp,rm,readdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
vi.mock('electron',()=>({safeStorage:{}}))
import {Downloads} from '../src/main/downloads'
import {Audiobookshelf} from '../src/main/providers/audiobookshelf'
import {Store} from '../src/main/store'
import type {QueueItem} from '../src/shared/types'

afterEach(()=>vi.restoreAllMocks())
describe('download controls',()=>{
  it('pauses active and queued items atomically, resumes, and removes both book and episode files',async()=>{
    const root=await mkdtemp(join(tmpdir(),'media-download-control-')),store=new Store(':memory:')
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
      expect(downloads.snapshot().entries.map(e=>({status:e.status,error:e.error}))).toEqual([{status:'paused',error:'Paused. Retry restarts this download.'},{status:'paused',error:undefined}])
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
    } finally { await downloads.stop();store.close();await rm(root,{recursive:true,force:true}) }
  })
})
