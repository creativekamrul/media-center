import {describe,it,expect} from 'vitest'
import {homeMixes,musicMixItems} from '../src/main/home-mixes'
import type {QueueItem} from '../src/shared/types'
const track=(id:string,duration=180,artist='Artist',serverId='n'):QueueItem=>({target:{kind:'music-track',serverId,trackId:id},title:id,subtitle:artist,duration,cover:'cover-'+id})
describe('Home music mixes',()=>{
 it('builds duration and artist mixes from real items, retaining covers and distinct source identity',()=>{
  const short=[track('one'),track('two'),track('three')],long=[track('long',500),track('long2',800)]
  const mixes=homeMixes(short,[...short,...long],[track('album',260)])
  expect(mixes.find(m=>m.id==='short')?.items).toEqual(short)
  expect(mixes.find(m=>m.id==='long')?.items).toEqual(long)
  expect(mixes.find(m=>m.id==='artist:artist')?.items).toHaveLength(6)
  expect(mixes.find(m=>m.id==='album-sampler')?.items[0].cover).toBe('cover-album')
  expect(musicMixItems([short[0],short[0],track('one',180,'Artist','other')])).toHaveLength(2)
 })
 it('omits empty or ineligible mixes and never treats books, episodes or radio as music',()=>{
  const other:QueueItem[]=[{target:{kind:'audiobook',serverId:'a',bookId:'b'},title:'Book',subtitle:'Author',duration:100},{target:{kind:'podcast-episode',serverId:'a',showId:'s',episodeId:'e'},title:'Episode',subtitle:'Host',duration:600}]
  expect(homeMixes(other,other,other)).toEqual([])
  const unknown=track('unknown');delete unknown.duration
  expect(homeMixes([unknown],[],[]).map(m=>m.id)).toEqual(['favorites'])
  expect(musicMixItems(Array.from({length:100},(_,i)=>track(String(i))))).toHaveLength(50)
 })
})
