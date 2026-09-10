import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('electron',()=>({dialog:{},safeStorage:{}}))
vi.mock('../src/main/store',()=>({Store:class{}}))
import { downloadSource, type Downloads, type OfflineMedia } from '../src/main/downloads'
import { Player, rewindPosition } from '../src/main/player'
import { Mpv } from '../src/main/mpv'
import { Audiobookshelf } from '../src/main/providers/audiobookshelf'
import { Navidrome } from '../src/main/providers/navidrome'
import { backupSchema, matchesRule } from '../src/main/daily'
import { defaultDailySettings, type SmartPlaylist } from '../src/shared/daily'
import { defaultPreferences, type QueueItem } from '../src/shared/types'
import type { Store } from '../src/main/store'

const book:QueueItem={target:{kind:'audiobook',serverId:'s',bookId:'b'},title:'Book',subtitle:'Author'}
const episode:QueueItem={target:{kind:'podcast-episode',serverId:'s',showId:'p',episodeId:'e2'},title:'Episode',subtitle:'Show'}
const abs=new Audiobookshelf({id:'s',provider:'audiobookshelf',url:'https://example.test',name:'ABS',username:''},'private-token')
afterEach(()=>vi.restoreAllMocks())
describe('original offline sources',()=>{
  it('downloads ordered physical book files independently of chapter markers',async()=>{
    vi.spyOn(abs,'get').mockResolvedValue({id:'b',libraryId:'books',mediaType:'book',media:{metadata:{title:'Book'},duration:120,chapters:[{id:0,title:'Crosses files',start:20,end:100}],tracks:[{index:1,ino:'file-a',duration:40,startOffset:0},{index:2,ino:'file-b',duration:80,startOffset:40}]}})
    const source=await downloadSource(book,abs)
    expect(source.files.map(f=>[new URL(f.url).pathname,f.startOffset])).toEqual([['/api/items/b/file/file-a/download',0],['/api/items/b/file/file-b/download',40]])
    expect(source.chapters).toEqual([{id:0,title:'Crosses files',start:20,end:100}])
  })
  it('downloads only the selected episode and rejects a book target for the show',async()=>{
    vi.spyOn(abs,'get').mockResolvedValue({id:'p',libraryId:'podcasts',mediaType:'podcast',media:{metadata:{title:'Show'},episodes:[{id:'e1',title:'First',audioFile:{ino:'one',duration:50}},{id:'e2',title:'Second',audioFile:{ino:'two',duration:90}}]}})
    const source=await downloadSource(episode,abs)
    expect(source.files).toHaveLength(1);expect(new URL(source.files[0].url).pathname).toBe('/api/items/p/file/two/download');expect(source.duration).toBe(90);expect(source.chapters).toEqual([])
    await expect(downloadSource({...book,target:{kind:'audiobook',serverId:'s',bookId:'p'}},abs)).rejects.toThrow('not an audiobook')
    await expect(downloadSource({...episode,target:{kind:'podcast-episode',serverId:'s',showId:'p',episodeId:'missing'}},abs)).rejects.toThrow('no downloaded audio')
  })
  it('uses Navidrome download rather than transcoded streaming',async()=>{
    const nav=new Navidrome({id:'n',provider:'navidrome',url:'https://music.test',name:'N',username:'u'},'password')
    vi.spyOn(nav,'track').mockResolvedValue({kind:'music-track',id:'t',serverId:'n',title:'T',artist:'A',album:'B',duration:300})
    const result=await downloadSource({target:{kind:'music-track',serverId:'n',trackId:'t'},title:'T',subtitle:'A'},nav)
    expect(new URL(result.files[0].url).pathname).toBe('/rest/download.view');expect(new URL(result.files[0].url).searchParams.has('maxBitRate')).toBe(false)
  })
})
describe('offline timelines and listening',()=>{
  it.each([book,episode])('loads $title without a server and preserves identity',async item=>{
    const values=new Map<string,unknown>(),records=vi.fn(),mpv=new Mpv()
    vi.spyOn(mpv,'start').mockResolvedValue();vi.spyOn(mpv,'stop').mockResolvedValue();vi.spyOn(mpv,'command').mockResolvedValue(undefined);vi.spyOn(mpv,'load').mockResolvedValue()
    const store={get:(k:string)=>values.get(k),set:(k:string,v:unknown)=>values.set(k,v),settings:()=>({mpvPath:'mpv',audioDevice:'auto',exclusive:false}),recordListening:records} as unknown as Store
    const media:OfflineMedia={entry:{id:'download',item,status:'ready',bytes:200,total:200,createdAt:0,duration:120,chapters:item.target.kind==='audiobook'?[{id:0,title:'Cross file chapter',start:20,end:100}]:[]},files:item.target.kind==='audiobook'?[{name:'0.audio',path:'a.audio',bytes:100,duration:40,startOffset:0},{name:'1.audio',path:'b.audio',bytes:100,duration:80,startOffset:40}]:[{name:'0.audio',path:'episode.audio',bytes:200,duration:120,startOffset:0}]}
    const provider=vi.fn(()=>{throw new Error('Offline')}),player=new Player(mpv,store,provider,undefined,{ready:async()=>media} as unknown as Downloads)
    try{
      await player.play([item],0,60);expect(provider).not.toHaveBeenCalled();expect(player.state.status).toBe('playing');expect(player.state.syncError).toContain('saved on this device')
      expect(mpv.load).toHaveBeenLastCalledWith(item.target.kind==='audiobook'?'b.audio':'episode.audio',{start:item.target.kind==='audiobook'?'20':'60'})
      mpv.emit('event',{event:'property-change',name:'time-pos',data:25});expect(player.state.position).toBe(item.target.kind==='audiobook'?65:25)
      await player.command({action:'toggle'});await player.command({action:'seek',value:25});expect(player.state.status).toBe('paused');expect(player.state.queue[0].target).toEqual(item.target)
      if(item.target.kind==='audiobook')expect(mpv.load).toHaveBeenLastCalledWith('a.audio',{start:'25'})
      expect(player.state.chapters.length).toBe(item.target.kind==='audiobook'?1:0)
    }finally{await player.shutdown()}
  })
  it('rewinds according to elapsed break time and clamps near the beginning',()=>{
    expect(rewindPosition(100,9000,defaultDailySettings)).toBe(100);expect(rewindPosition(100,20000,defaultDailySettings)).toBe(95);expect(rewindPosition(100,300000,defaultDailySettings)).toBe(85);expect(rewindPosition(3,300000,defaultDailySettings)).toBe(0);expect(rewindPosition(100,300000,{...defaultDailySettings,smartRewind:false})).toBe(100)
  })
})
describe('personal data boundaries',()=>{
  const backup={format:'media-center-personal',version:1,preferences:defaultPreferences,dailySettings:defaultDailySettings,servers:[],folders:[],queues:[],notes:[],plans:[],rules:[]}
  it('rejects credentials, filesystem roots disguised as preferences, and invalid queue positions',()=>{
    expect(backupSchema.safeParse(backup).success).toBe(true)
    expect(backupSchema.safeParse({...backup,secret:'no'}).success).toBe(false)
    expect(backupSchema.safeParse({...backup,preferences:{...defaultPreferences,mpvPath:'arbitrary.exe'}}).success).toBe(false)
    expect(backupSchema.safeParse({...backup,queues:[{id:'q',name:'q',items:[book],index:1,position:0,updatedAt:0}]}).success).toBe(false)
    expect(backupSchema.safeParse({...backup,notes:[{id:'n',item:{...episode,target:{kind:'podcast-episode',serverId:'s',showId:'p'}},position:1,title:'Note',text:'',updatedAt:0}]}).success).toBe(false)
  })
  it('keeps surface styles in validated preference backups and migrates older appearances',()=>{
    const appearance={colors:{accent:'#abcdef'},bodyFont:'segoe',headingFont:'georgia',lyricsFont:'segoe'}
    const restored=backupSchema.parse({...backup,preferences:{...defaultPreferences,appearance:{...appearance,surfaceStyle:'gradient',translucency:true}}})
    expect(restored.preferences.appearance?.surfaceStyle).toBe('gradient')
    expect(restored.preferences.appearance?.translucency).toBe(true)
    expect(backupSchema.parse({...backup,preferences:{...defaultPreferences,appearance}}).preferences.appearance?.surfaceStyle).toBe('solid')
  })
  it('combines playlist rules and handles missing year, ratings, and play counts',()=>{
    const rule:SmartPlaylist={id:'r',name:'r',serverId:'n',libraryId:'l',favorite:true,minRating:4,genre:'Jazz',artist:'artist',neverPlayed:true,minYear:1990,maxYear:2020,order:'title',limit:100}
    const song={kind:'music-track' as const,id:'t',serverId:'n',title:'T',artist:'Artist',album:'A',duration:50,starred:true,rating:5,genre:'jazz',year:2000}
    expect(matchesRule(song,rule)).toBeTruthy();expect(matchesRule({...song,playCount:1},rule)).toBeFalsy();expect(matchesRule({...song,year:undefined},rule)).toBeFalsy();expect(matchesRule({...song,rating:undefined},rule)).toBeFalsy()
  })
})
