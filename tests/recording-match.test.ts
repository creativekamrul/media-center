import {expect,it} from 'vitest'
import {matchingRecording} from '../src/shared/recording-match'
import type {DtTrack} from '../src/shared/downtify'
import type {MusicTrack} from '../src/shared/types'
const source:DtTrack={id:'dt',serverId:'d',title:'Night Transit',artist:'Northline',album:'Transit',duration:210,saved:false}
const track:MusicTrack={kind:'music-track',serverId:'n',id:'original',title:' NIGHT  TRANSIT ',artist:'northline',album:'Transit',duration:211}
it('matches one recording conservatively without dropping edition qualifiers',()=>{
  expect(matchingRecording(source,[track])).toBe(track)
  for(const different of [{title:'Night Transit (Live)'},{album:'Transit (Remastered)'},{artist:'Other'},{duration:222},{duration:0}]){
    expect(matchingRecording(source,[{...track,...different}])).toBeUndefined()
  }
  expect(matchingRecording(source,[track,{...track,id:'duplicate'}])).toBeUndefined()
  expect(matchingRecording({...source,album:''},[track])).toBeUndefined()
})
