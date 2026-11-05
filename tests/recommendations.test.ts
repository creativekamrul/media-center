import {describe,it,expect} from 'vitest'
import {rankLibrary} from '../src/shared/recommendations'
import {savedShelves} from '../src/main/downtify-workspace'
import {normalizeDt} from '../src/main/providers/downtify'
import type {QueueItem} from '../src/shared/types'
const item=(id:string,artist:string,serverId='a'):QueueItem=>({target:{kind:'music-track',serverId,trackId:id},title:id,subtitle:artist})
describe('library discovery boundaries',()=>{
 it('preserves source identity and deduplicates only the same playable target',()=>{
  const a=item('same','Artist'),b=item('same','Artist','b');const ranked=rankLibrary([{item:a,source:'A'},{item:a,source:'A'},{item:b,source:'B'}],[])
  expect(ranked).toHaveLength(2);expect(ranked.map(r=>r.item.target.serverId)).toEqual(['a','b'])
 })
 it('uses recent music listening, excludes spoken titles and explains the ranking',()=>{
  const now=Date.parse('2026-11-05T12:00:00'),rows=rankLibrary([{item:item('a','Old'),source:'A'},{item:item('b','Recent'),source:'B'},{item:item('c','Narrator'),source:'C'}],[{subtitle:'Old',seconds:300,day:'2025-01-01',kind:'music-track'},{subtitle:'Recent',seconds:300,day:'2026-11-05',kind:'music-track'},{subtitle:'Narrator',seconds:99999,day:'2026-11-05',kind:'audiobook'}],now)
  expect(rows[0].item.subtitle).toBe('Recent');expect(rows[0].reason).toBe('Because you listen to Recent');expect(rows.find(r=>r.item.subtitle==='Narrator')?.score).toBe(0)
 })
 it('keeps identically titled saved albums by different artists separate',()=>{
  const records=[normalizeDt({file:'a.flac',title:'A',artist:'One',album:'Greatest hits'},'s'),normalizeDt({file:'b.flac',title:'B',artist:'Two',album:'Greatest hits'},'s')]
  const saved=savedShelves(records,['Mine']);expect(saved.albums).toHaveLength(2);expect(saved.artists).toHaveLength(2);expect(saved.tracks.every(t=>t.saved)).toBe(true);expect(saved.playlists[0].title).toBe('Mine')
 })
 it('keeps variety after the strongest affinity match',()=>{
  const pool=Array.from({length:10},(_,i)=>({item:item(String(i),'Same'),source:'A'}));pool.push({item:item('other','Other'),source:'B'})
  const ranked=rankLibrary(pool,[]);expect(ranked.slice(0,2).map(r=>r.source)).toContain('B')
 })
})
