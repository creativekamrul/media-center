import {describe,it,expect} from 'vitest'
import {filterPlaylist,shufflePlaylist} from '../src/shared/downtify-playlist'
import type {DtTrack} from '../src/shared/downtify'
const one:DtTrack={id:'1',serverId:'s',title:'First Song',artist:'An Artist',album:'Night',duration:30,saved:true},two={...one,id:'2',title:'Second',album:'Day'}
describe('Playlist controls',()=>{
 it('searches title, artist and album with words in any order without losing repeats',()=>{expect(filterPlaylist([one,two,one],'NIGHT first')).toEqual([one,one]);expect(filterPlaylist([one,two],'an artist')).toEqual([one,two]);expect(filterPlaylist([one,two],'absent')).toEqual([]);expect(filterPlaylist([one,two],'  ')).toEqual([one,two])})
 it('shuffles occurrences without mutating a saved order',()=>{const tracks=[one,two,one],copy=[...tracks],shuffled=shufflePlaylist(tracks,()=>0);expect(tracks).toEqual(copy);expect(shuffled.map(t=>t.id).sort()).toEqual(['1','1','2']);expect(shuffled).not.toEqual(tracks);expect(shufflePlaylist([])).toEqual([])})
})
