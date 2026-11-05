import type {DtTrack} from './downtify'
import type {MusicTrack} from './types'

const normalized=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()

/** Keep edition qualifiers. Decline weak or ambiguous matches. */
export function matchingRecording(source:DtTrack,candidates:MusicTrack[]) {
  if(!source.title.trim()||!source.artist.trim()||!source.album.trim()||!(source.duration>0))return
  const matches=candidates.filter(t=>
    normalized(t.title)===normalized(source.title)&&normalized(t.artist)===normalized(source.artist)&&
    normalized(t.album)===normalized(source.album)&&t.duration>0&&Math.abs(t.duration-source.duration)<=2)
  if(matches.length===1)return matches[0]
}
