import {describe,it,expect,vi,afterEach} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {Store} from '../src/main/store'
import {recapRangeSchema} from '../src/shared/recap'
import {preferenceSchema} from '../src/main/features'
import {themes} from '../src/shared/themes'
import {defaultPreferences,type QueueItem} from '../src/shared/types'
afterEach(()=>vi.useRealTimers())
describe('listening recap',()=>{
 it('includes both dates, keeps books and individual episodes separate, and excludes outside activity',()=>{
  vi.useFakeTimers();const store=new Store(':memory:')
  const book:QueueItem={target:{kind:'audiobook',serverId:'s',bookId:'same'},title:'Same title',subtitle:'Author'}
  const episode:QueueItem={target:{kind:'podcast-episode',serverId:'s',showId:'same',episodeId:'one'},title:'Same title',subtitle:'Show'}
  try{
   vi.setSystemTime(new Date(2026,0,1,12));store.recordListening(book,999,true)
   vi.setSystemTime(new Date(2026,0,2,12));store.recordListening(book,60,true);store.recordListening(episode,120,true)
   vi.setSystemTime(new Date(2026,0,3,12));store.recordListening({...episode,target:{...episode.target,kind:'podcast-episode',serverId:'s',showId:'same',episodeId:'two'}},30)
   store.recordListening(book,10,true)
   vi.setSystemTime(new Date(2026,0,4,12));store.recordListening(book,888)
   const result=store.listeningRecap({start:'2026-01-02',end:'2026-01-03'})
   expect(result.totalSeconds).toBe(220);expect(result.activeDays).toBe(2);expect(result.uniqueItems).toBe(3)
   expect(result.finishedBooks).toBe(1);expect(result.finishedEpisodes).toBe(1)
   expect(result.top.map(t=>t.seconds)).toEqual([120,70,30]);expect(result.kinds).toEqual([{kind:'podcast-episode',seconds:150},{kind:'audiobook',seconds:70}])
   expect(store.listeningRecap({start:'2025-01-01',end:'2025-01-01'}).totalSeconds).toBe(0)
   expect(store.listeningRecap({start:'2026-01-03',end:'2026-01-03'}).totalSeconds).toBe(40)
  }finally{store.close()}
 })
 it('retains artwork identity for listening leaders with and without recent history',()=>{
  const store=new Store(':memory:')
  const song:QueueItem={target:{kind:'music-track',serverId:'n',trackId:'song'},title:'Same title',subtitle:'Artist',cover:'album-cover'}
  const episode:QueueItem={target:{kind:'podcast-episode',serverId:'a',showId:'show',episodeId:'episode'},title:'Same title',subtitle:'Show'}
  try{store.record(song,10,60);store.recordListening(song,20);store.recordListening(episode,10);const top=store.listeningStats().top;expect(top[0].item).toEqual(song);expect(top[1].item?.target).toEqual(episode.target)}finally{store.close()}
 })
 it('rejects impossible, reversed, malformed and unbounded date ranges',()=>{
  for(const range of [{start:'2026-02-30',end:'2026-03-01'},{start:'2026-01-03',end:'2026-01-01'},{start:'anything',end:'2026-01-01'},{start:'2000-01-01',end:'2026-01-01'}])expect(recapRangeSchema.safeParse(range).success).toBe(false)
  expect(recapRangeSchema.safeParse({start:'2024-02-29',end:'2024-02-29'}).success).toBe(true)
 })
 it('supports every palette in settings and rejects unknown theme identifiers',()=>{
  expect(themes).toHaveLength(13)
  for(const theme of themes)expect(preferenceSchema.safeParse({...defaultPreferences,theme:theme.id}).success).toBe(true)
  expect(preferenceSchema.safeParse({...defaultPreferences,theme:'unknown'}).success).toBe(false)
 })
})

describe('recap comparisons',()=>{
 it('counts leap days and compares exactly the preceding inclusive period',()=>{vi.useFakeTimers();const store=new Store(':memory:');const q:QueueItem={target:{kind:'music-track',serverId:'s',trackId:'t'},title:'Song',subtitle:'Artist'};try{for(const [day,seconds] of [['2024-02-25',60],['2024-02-28',120],['2024-02-29',180],['2024-03-01',60]] as const){vi.setSystemTime(new Date(day+'T12:00:00'));store.recordListening(q,seconds)}const d=store.listeningRecap({start:'2024-02-28',end:'2024-03-01'});expect(d.calendarDays).toBe(3);expect(d.longestStreak).toBe(3);expect(d.averageSeconds).toBe(120);expect(d.peakDay).toEqual({day:'2024-02-29',seconds:180});expect(d.comparison).toMatchObject({start:'2024-02-25',end:'2024-02-27',totalSeconds:60,changePercent:500});expect(d.artists).toEqual([{name:'Artist',seconds:360}]);expect(d.comparison.artists).toEqual([{name:'Artist',seconds:60}])}finally{store.close();vi.useRealTimers()}})
 it('does not invent percentage change from an empty previous period',()=>{const store=new Store(':memory:');try{const d=store.listeningRecap({start:'2025-01-01',end:'2025-01-02'});expect(d.comparison.changePercent).toBeNull();expect(d.longestStreak).toBe(0);expect(d.peakDay).toBeUndefined()}finally{store.close()}})
})
