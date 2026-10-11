import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {PlaybackTime} from '../src/shared/playback-time'
import {Store} from '../src/main/store'
import {mapJfItem} from '../src/main/providers/jellyfin'
import {exportExtra,restoreExtra,personalExtraSchema} from '../src/main/personal-backup'
describe('Jellyfin listening and watching time',()=>{
 it('counts advancing playback but rejects pauses, buffering, seeks and suspended intervals',()=>{
  const time=new PlaybackTime()
  expect(time.sample(0,true,0)).toBe(0)
  expect(time.sample(1,true,1000)).toBe(1)
  expect(time.sample(90,true,2000)).toBe(0)
  expect(time.sample(90,true,3000)).toBe(0)
  expect(time.sample(91,false,4000)).toBe(0)
  expect(time.sample(92,true,5000)).toBe(0)
  expect(time.sample(93,true,6000)).toBe(1)
  expect(time.sample(94,true,60000)).toBe(0)
  time.reset();expect(time.sample(120,true,61000)).toBe(0)
 })
 it('keeps music, movies and TV separate without changing book or podcast identities',()=>{
  const store=new Store(':memory:')
  try{
   for(const [kind,seconds]of [['Audio',12],['Movie',30],['Episode',45]] as const)store.recordJellyfinListening(mapJfItem({Id:'same',Type:kind,Name:kind},'server'),seconds)
   store.recordJellyfinListening(mapJfItem({Id:'same',Type:'Movie',Name:'Second server'},'other'),10)
   const stats=store.listeningStats(),today=stats.days.at(-1)!
   expect(today).toMatchObject({music:12,movies:40,tv:45,books:0,podcasts:0,seconds:97})
   expect(stats.top).toHaveLength(4);expect(stats.top.every(t=>t.item===undefined)).toBe(true)
   expect(store.listeningRows()).toHaveLength(4)
   const recap=store.listeningRecap({start:today.day,end:today.day});expect(recap.totalSeconds).toBe(97);expect(recap.kinds.map(k=>k.kind)).toContain('jellyfin-movie')
   const backup=personalExtraSchema.parse(exportExtra(store));const restored=restoreExtra(backup,{servers:new Map(),folders:new Map()},item=>item);expect(restored.stats).toHaveLength(4);expect(restored.stats[0].target).toHaveProperty('serverId')
  }finally{store.close()}
 })
})
