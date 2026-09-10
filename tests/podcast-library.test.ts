import {expect,it} from 'vitest'
import {inPodcastLibrary,type InboxEpisode} from '../src/shared/daily'

it('scopes podcast episodes by both server and library, never audiobook progress',()=>{
 const row={libraryId:'podcasts',item:{target:{kind:'podcast-episode',serverId:'s',showId:'show',episodeId:'same'},title:'Episode',subtitle:'Show'}} as InboxEpisode
 const scope={serverId:'s',libraryId:'podcasts'}
 expect(inPodcastLibrary(row,scope)).toBe(true)
 expect(inPodcastLibrary(row,{...scope,serverId:'another-server'})).toBe(false)
 expect(inPodcastLibrary(row,{...scope,libraryId:'another-library'})).toBe(false)
 expect(inPodcastLibrary({...row,libraryId:undefined},scope)).toBe(false)
 expect(inPodcastLibrary({...row,item:{...row.item,target:{kind:'audiobook',serverId:'s',bookId:'same'}}},scope)).toBe(false)
 expect(inPodcastLibrary(row)).toBe(true)
})
