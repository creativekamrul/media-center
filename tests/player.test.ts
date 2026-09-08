import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('../src/main/store', () => ({ Store: class {} }))
import { Player } from '../src/main/player'
import { Mpv } from '../src/main/mpv'
import type { Store } from '../src/main/store'
import { Audiobookshelf } from '../src/main/providers/audiobookshelf'
import { Navidrome } from '../src/main/providers/navidrome'
import { progressKey } from '../src/shared/timeline'

describe('playback coordination', () => {
  let player: Player, mpv: Mpv, abs: Audiobookshelf, nav: Navidrome
  const book = { kind: 'audiobook' as const, id: 'book', serverId: 's', libraryId: 'l', title: 'Book', subtitle: '', description: '', authors: [], narrators: [], series: [], duration: 1000, chapters: [{ id: 1, title: 'Across files', start: 200, end: 800 }], tracks: [] }
  const queue = [{ target: { kind: 'audiobook' as const, serverId: 's', bookId: 'book' }, title: 'Book', subtitle: '' }]
  beforeEach(() => {
    vi.useFakeTimers()
    const values = new Map<string, unknown>([['deviceId', 'device']])
    const store = { get: (k: string) => values.get(k), set: (k: string, v: unknown) => values.set(k, v), settings: () => ({ mpvPath: 'mpv.exe', audioDevice: 'auto', exclusive: false }) } as unknown as Store
    mpv = new Mpv(); vi.spyOn(mpv, 'start').mockResolvedValue(); vi.spyOn(mpv, 'stop').mockResolvedValue(); vi.spyOn(mpv, 'command').mockResolvedValue(undefined)
    vi.spyOn(mpv, 'load').mockImplementation(async (url, options) => { await mpv.command(['loadfile', url, 'replace', -1, options]) })
    abs = new Audiobookshelf({ id: 's', provider: 'audiobookshelf', name: 'ABS', url: 'https://test.invalid', username: '' }, 'token')
    vi.spyOn(abs, 'detail').mockResolvedValue(book)
    vi.spyOn(abs, 'start').mockResolvedValue({ id: 'session', duration: 1000, currentTime: 450, playMethod: 0, audioTracks: [{ index: 1, title: 'A', startOffset: 0, duration: 400, contentUrl: '/a' }, { index: 2, title: 'B', startOffset: 400, duration: 600, contentUrl: '/b' }] })
    vi.spyOn(abs, 'sync').mockResolvedValue()
    nav = new Navidrome({ id: 'n', provider: 'navidrome', name: 'N', url: 'https://test.invalid', username: 'u' }, 'p')
    vi.spyOn(nav, 'track').mockResolvedValue({ kind: 'music-track', id: 'song', serverId: 'n', title: 'Song', artist: 'Artist', album: '', duration: 300 })
    vi.spyOn(nav, 'scrobble').mockResolvedValue()
    player = new Player(mpv, store, id => id === 'n' ? nav : abs)
  })
  afterEach(async () => { await player.shutdown(); vi.useRealTimers() })
  it.each(['audiobook','podcast-episode'] as const)('coalesces %s telemetry but publishes commands and errors immediately',async kind=>{
    const items=kind==='audiobook'?queue:[{target:{kind:'podcast-episode' as const,serverId:'s',showId:'show',episodeId:'ep'},title:'Episode',subtitle:''}]
    if(kind==='podcast-episode')vi.mocked(abs.detail).mockResolvedValue({kind:'podcast-show',id:'show',serverId:'s',libraryId:'p',title:'Show',subtitle:'Host',description:'',author:'Host',episodeCount:1,episodes:[{id:'ep',title:'Episode',duration:1000}]} as Awaited<ReturnType<typeof abs.detail>>)
    await player.play(items,0)
    const snapshots:typeof player.state[]=[], listener=vi.fn(state=>snapshots.push(state));player.on('state',listener)
    for(let i=0;i<20;i++)mpv.emit('event',{event:'property-change',name:'time-pos',data:50+i})
    expect(listener).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(250)
    expect(listener).toHaveBeenCalledTimes(1);expect(snapshots[0].position).toBe(player.state.position)
    expect(snapshots[0].queue[0].target).toEqual(items[0].target)
    mpv.emit('event',{event:'property-change',name:'time-pos',data:80})
    await player.command({action:'volume',value:30});expect(snapshots.at(-1)?.volume).toBe(30)
    const count=listener.mock.calls.length;await vi.advanceTimersByTimeAsync(250);expect(listener).toHaveBeenCalledTimes(count)
    mpv.emit('failure','Test failure');expect(snapshots.at(-1)?.status).toBe('error')
  })
  it('resumes a multi-file book at the correct file and local offset', async () => {
    await player.play(queue, 0)
    expect(mpv.command).toHaveBeenCalledWith(['loadfile', 'https://test.invalid/b', 'replace', -1, expect.objectContaining({ start: '50' })])
    mpv.emit('event', { event: 'property-change', name: 'time-pos', data: 75 })
    expect(player.state.position).toBe(475); expect(player.state.duration).toBe(1000)
  })
  it('seeks backward across files and syncs whole-book time', async () => {
    await player.play(queue, 0); await player.command({ action: 'seek', value: 220 })
    expect(mpv.command).toHaveBeenCalledWith(['loadfile', 'https://test.invalid/a', 'replace', -1, expect.objectContaining({ start: '220' })])
    expect(abs.sync).toHaveBeenLastCalledWith('session', 220, 1000, 0, false)
  })
  it('preserves pause while seeking across files', async () => {
    await player.play(queue, 0); await player.command({ action: 'toggle' }); await player.command({ action: 'seek', value: 100 })
    expect(player.state.status).toBe('paused'); expect(mpv.command).toHaveBeenLastCalledWith(['set_property', 'pause', true])
  })
  it('guards a scrub by media identity and still seeks across book files',async()=>{
    await player.play(queue,0);await player.command({action:'toggle'})
    await player.seekTo({key:progressKey(queue[0].target),queueIndex:0,time:120})
    expect(player.state.position).toBe(120);expect(player.state.status).toBe('paused')
    expect(mpv.load).toHaveBeenLastCalledWith('https://test.invalid/a',expect.objectContaining({start:'120'}))
    const next=player.play([{target:{kind:'music-track',serverId:'n',trackId:'song'},title:'Song',subtitle:''}],0)
    const oldSeek=player.seekTo({key:progressKey(queue[0].target),queueIndex:0,time:850})
    await next;await expect(oldSeek).rejects.toThrow('track changed');expect(player.state.position).toBe(0)
  })
  it('never applies one podcast episode scrub to another episode in the same show',async()=>{
    const first={kind:'podcast-episode' as const,serverId:'s',showId:'show',episodeId:'one'},second={...first,episodeId:'two'}
    vi.mocked(abs.detail).mockResolvedValue({kind:'podcast-show',id:'show',serverId:'s',libraryId:'p',title:'Show',subtitle:'Host',description:'',author:'Host',episodeCount:2,episodes:[{id:'one',title:'First',duration:1000},{id:'two',title:'Second',duration:1000}]} as Awaited<ReturnType<typeof abs.detail>>)
    await player.play([{target:first,title:'First',subtitle:'Host'},{target:second,title:'Second',subtitle:'Host'}],0)
    await player.seekTo({key:progressKey(first),queueIndex:0,time:75});expect(player.state.position).toBe(75)
    await player.edit({action:'jump',index:1})
    await expect(player.seekTo({key:progressKey(first),queueIndex:0,time:900})).rejects.toThrow('track changed')
    await player.seekTo({key:progressKey(second),queueIndex:1,time:80});expect(player.state.position).toBe(80)
  })
  it('resets audiobook speed when switching to music and closes the old session', async () => {
    await player.play(queue, 0); await player.command({ action: 'speed', value: 1.75 })
    await player.play([{ target: { kind: 'music-track', serverId: 'n', trackId: 'song' }, title: 'Song', subtitle: 'Artist' }], 0)
    expect(player.state.speed).toBe(1); expect(player.state.chapters).toEqual([])
    expect(abs.sync).toHaveBeenCalledWith('session', 450, 1000, 0, true)
  })
  it('keeps a sync failure visible while audio continues', async () => {
    await player.play(queue, 0); vi.mocked(abs.sync).mockRejectedValue(new Error('Offline'))
    await player.command({ action: 'seek', value: 600 })
    expect(player.state.status).toBe('playing'); expect(player.state.syncError).toContain('saved on this device')
  })
  it('refuses to play a show using a book target', async () => {
    vi.mocked(abs.detail).mockResolvedValue({ kind: 'podcast-show', id: 'book', serverId: 's', libraryId: 'p', title: 'Show', subtitle: '', description: '', author: '', episodeCount: 0, episodes: [] })
    await expect(player.play(queue, 0)).rejects.toThrow(/podcast show/); expect(abs.start).not.toHaveBeenCalled()
  })
  it('edits a queue without replacing the current playback session', async () => {
    const music = ['a','b','c'].map(id => ({ target: { kind: 'music-track' as const, serverId: 'n', trackId: id }, title: id, subtitle: '' }))
    await player.play(music,0); const calls = vi.mocked(mpv.load).mock.calls.length
    await player.edit({ action:'move',from:2,to:0 }); expect(player.state.queueIndex).toBe(1)
    await player.edit({ action:'remove',index:0 }); expect(player.state.queueIndex).toBe(0)
    await player.edit({ action:'next',items:[music[2]] }); expect(player.state.queue.map(q=>q.title)).toEqual(['a','c','b'])
    expect(mpv.load).toHaveBeenCalledTimes(calls)
  })
  it('advances preloaded music only after file-loaded, without stopping or replacing the stream',async()=>{
    vi.mocked(mpv.command).mockImplementation(async command=>command[0]==='get_property'&&command[1]==='playlist'?[{id:10,current:true},{id:11}]:undefined)
    const items=['first','second'].map(id=>({target:{kind:'music-track' as const,serverId:'n',trackId:id},title:id,subtitle:'Artist'}))
    await player.play(items,0)
    expect(mpv.command).toHaveBeenCalledWith(['loadfile',expect.any(String),'append',-1,{start:'0'}])
    vi.mocked(mpv.command).mockClear();vi.mocked(mpv.load).mockClear()
    mpv.emit('event',{event:'end-file',reason:'eof'});await Promise.resolve()
    expect(player.state.queueIndex).toBe(0)
    mpv.emit('event',{event:'start-file',playlist_entry_id:11});mpv.emit('event',{event:'file-loaded'})
    await player.enqueue(async()=>{})
    expect(player.state.queueIndex).toBe(1);expect(player.state.status).toBe('playing');expect(mpv.load).not.toHaveBeenCalled();expect(mpv.command).not.toHaveBeenCalledWith(['stop'])
  })
  it('retains the queue when stopped and restores it without autoplay', async () => {
    await player.play(queue,0); await player.command({action:'stop'}); expect(player.state.queue).toHaveLength(1); expect(player.state.status).toBe('idle')
    await player.edit({action:'clear'}); expect(player.state.queue).toHaveLength(0)
  })
  it('resumes a stopped spoken queue from the server rather than a stale local checkpoint', async () => {
    await player.play(queue,0); await player.command({action:'seek',value:220}); await player.command({action:'stop'}); await player.command({action:'toggle'})
    expect(player.state.status).toBe('playing'); expect(player.state.position).toBe(450)
  })
  it('excludes buffering time and seek jumps from server listening time', async () => {
    await player.play(queue,0); mpv.emit('event',{event:'property-change',name:'paused-for-cache',data:true}); await vi.advanceTimersByTimeAsync(10000)
    await player.command({action:'seek',value:700}); expect(abs.sync).toHaveBeenLastCalledWith('session',700,1000,0,false)
    mpv.emit('event',{event:'property-change',name:'paused-for-cache',data:false}); await vi.advanceTimersByTimeAsync(2000)
    await player.command({action:'toggle'}); expect(abs.sync).toHaveBeenLastCalledWith('session',700,1000,2,false)
  })
  it('shuffle advances through the visible queue rather than revisiting random entries', async () => {
    const music = ['a','b','c','d'].map(id => ({target:{kind:'music-track' as const,serverId:'n',trackId:id},title:id,subtitle:''}))
    await player.play(music,0); await player.command({action:'shuffle'}); const order=player.state.queue.map(q=>q.title)
    expect(order[0]).toBe('a'); expect(new Set(order).size).toBe(4)
    for (let i=1;i<4;i++) { await player.command({action:'next'}); expect(player.state.queueIndex).toBe(i); expect(player.state.queue[i].title).toBe(order[i]) }
  })
  it('shows an actionable error when a queued item cannot load', async () => {
    await player.play(queue,0); await player.edit({action:'append',items:[{target:{kind:'music-track',serverId:'n',trackId:'missing'},title:'Missing',subtitle:''}]});vi.mocked(nav.track).mockRejectedValue(new Error('Track was removed'))
    await expect(player.edit({action:'jump',index:1})).rejects.toThrow(/removed/);expect(player.state.status).toBe('error')
  })
})
