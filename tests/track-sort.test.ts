import {describe,it,expect} from 'vitest'
import {sortedTrackIndexes} from '../src/shared/track-sort'
import type {MusicTrack} from '../src/shared/types'
const tracks:MusicTrack[]=[
 {kind:'music-track',serverId:'a',id:'same',title:'Zulu',artist:'B',album:'Record',duration:20,addedAt:200,discNumber:2,trackNumber:1},
 {kind:'music-track',serverId:'b',id:'same',title:'Alpha 10',artist:'A',album:'Record',duration:40,addedAt:100,discNumber:1,trackNumber:2},
 {kind:'music-track',serverId:'a',id:'same',title:'Zulu',artist:'B',album:'Record',duration:20,addedAt:200,discNumber:2,trackNumber:1},
 {kind:'music-track',serverId:'a',id:'missing',title:'Alpha 2',artist:'C',album:'Record',duration:30,discNumber:1,trackNumber:1}
]
describe('track display and playback ordering',()=>{
 it('sorts titles naturally without changing original playlist occurrences',()=>{const original=structuredClone(tracks);expect(sortedTrackIndexes(tracks,'title')).toEqual([3,1,0,2]);expect(sortedTrackIndexes(tracks,'title-desc')).toEqual([0,2,1,3]);expect(tracks).toEqual(original);expect(sortedTrackIndexes(tracks,'original')).toEqual([0,1,2,3])})
 it('keeps unknown dates last in either direction and ties stable',()=>{expect(sortedTrackIndexes(tracks,'added')).toEqual([0,2,1,3]);expect(sortedTrackIndexes(tracks,'added-oldest')).toEqual([1,0,2,3])})
 it('orders disc/track and duration while preserving both servers and duplicates',()=>{expect(sortedTrackIndexes(tracks,'track')).toEqual([3,1,0,2]);expect(sortedTrackIndexes(tracks,'duration')).toEqual([1,3,0,2]);expect(sortedTrackIndexes(tracks,'artist').map(i=>tracks[i].serverId)).toEqual(['b','a','a','a'])})
})
