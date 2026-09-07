import { afterEach, describe, expect, it, vi } from 'vitest'
import { Audiobookshelf } from '../src/main/providers/audiobookshelf'
import { Navidrome } from '../src/main/providers/navidrome'
import { filterEpisodes } from '../src/shared/catalog'
import { progressKey } from '../src/shared/timeline'
const connection = { id: 's', provider: 'audiobookshelf' as const, name: 'Test', url: 'https://example.test', username: 'test' }
const book = { id: 'b', libraryId: 'books', mediaType: 'book', media: { metadata: { title: 'Book' }, duration: 100 } }
const show = { id: 's1', libraryId: 'podcasts', mediaType: 'podcast', media: { metadata: { title: 'Show' }, episodes: [{ id: 'e1', title: 'Episode 10', season: '1', episode: '10', audioFile: { duration: 100, metadata: { filename: 'ten.mp3' } } }, { id: 'e2', title: 'Episode 2', season: '1', episode: '2', audioFile: { duration: 200 } }, { id: 'e3', title: 'Episode 3' }] } }
afterEach(() => vi.unstubAllGlobals())
describe('Audiobookshelf progress and catalog', () => {
  it('keeps progress per episode and never applies show progress to all episodes', async () => {
    vi.stubGlobal('fetch', vi.fn(async url => new Response(JSON.stringify(String(url).endsWith('/api/me') ? { mediaProgress: [{ libraryItemId: 's1', currentTime: 99, progress: .99 }, { libraryItemId: 's1', episodeId: 'e1', currentTime: 30, duration: 100, progress: .3 }, { libraryItemId: 's1', episodeId: 'e2', currentTime: 200, duration: 200, isFinished: true }] } : show))))
    const item = await new Audiobookshelf(connection, 'token').detail('s1'); expect(item.kind).toBe('podcast-show'); if (item.kind !== 'podcast-show') throw Error('Wrong type')
    expect(item.episodes.map(e => e.progress?.status)).toEqual(['in-progress','finished',undefined])
    expect(filterEpisodes(item.episodes,'','unfinished','episode',false,false).map(e => e.id)).toEqual(['e3','e1'])
    expect(filterEpisodes(item.episodes,'ten.mp3','all','title',false,true).map(e => e.id)).toEqual(['e1'])
    expect(filterEpisodes(item.episodes,'','all','season',false,true).map(e => e.id)).toEqual(['e2','e1'])
  })
  it('passes book sorting and progress filters to the server before pagination', async () => {
    const fetch = vi.fn(async url => new Response(JSON.stringify(String(url).endsWith('/api/me') ? { mediaProgress: [] } : { results: [book], total: 180 }))); vi.stubGlobal('fetch', fetch)
    const page = await new Audiobookshelf(connection,'token').catalog({ library: { id:'books',serverId:'s',name:'Books',kind:'audiobooks' }, page:1, search:'',sort:'progress.finishedAt',descending:true,status:'unfinished' })
    const url = new URL(String(fetch.mock.calls[1][0])); expect(url.searchParams.get('sort')).toBe('progress.finishedAt'); expect(url.searchParams.get('page')).toBe('1'); expect(url.searchParams.get('desc')).toBe('1'); expect(Buffer.from(url.searchParams.get('filter')!.split('.')[1],'base64').toString()).toBe('not-finished'); expect(page.hasMore).toBe(true)
  })
  it('writes status to the exact episode endpoint and handles text success', async () => {
    const fetch = vi.fn(async (_url, init) => init?.method === 'PATCH' ? new Response('OK') : new Response(JSON.stringify(show))); vi.stubGlobal('fetch', fetch)
    await new Audiobookshelf(connection,'token').setProgress({kind:'podcast-episode',serverId:'s',showId:'s1',episodeId:'e2'},'finished')
    expect(String(fetch.mock.calls[1][0])).toBe('https://example.test/api/me/progress/s1/e2'); expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({isFinished:true})
  })
  it('rejects a show passed as a book before changing progress', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(show))); vi.stubGlobal('fetch',fetch)
    await expect(new Audiobookshelf(connection,'token').setProgress({kind:'audiobook',serverId:'s',bookId:'s1'},'reset')).rejects.toThrow(/target/); expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('continues separate episodes from the same show', async () => {
    vi.stubGlobal('fetch',vi.fn(async url => new Response(JSON.stringify(String(url).endsWith('/api/me') ? {mediaProgress:[{libraryItemId:'s1',episodeId:'e1',currentTime:10,duration:100},{libraryItemId:'s1',episodeId:'e2',currentTime:20,duration:100}]} : {libraryItems:[{...show,recentEpisode:{id:'e1',title:'One'}},{...show,recentEpisode:{id:'e2',title:'Two'}}]}))))
    const items=await new Audiobookshelf(connection,'token').continuing('podcasts'); expect(items.map(i=>i.item.title)).toEqual(['One','Two']); expect(new Set(items.map(i=>progressKey(i.item.target))).size).toBe(2)
  })
})
describe('Navidrome playlists', () => {
  it('sends duplicate song IDs in order as POST form fields', async () => {
    const fetch=vi.fn(async (_url: unknown, _init: any)=>new Response(JSON.stringify({'subsonic-response':{status:'ok',playlist:{id:'p',name:'Playlist'}}}))); vi.stubGlobal('fetch',fetch)
    await new Navidrome({...connection,provider:'navidrome'},'secret').savePlaylist({id:'p',name:'Playlist',comment:'A & B',public:false,songIds:['a','b','a']})
    expect(fetch.mock.calls[1][1].method).toBe('POST'); const body=new URLSearchParams(fetch.mock.calls[1][1].body); expect(body.getAll('songId')).toEqual(['a','b','a']); expect(body.get('playlistId')).toBe('p'); expect(new URLSearchParams(fetch.mock.calls[2][1].body).get('comment')).toBe('A & B')
  })
  it('loads further album pages rather than truncating a large library', async () => {
    const fetch=vi.fn(async (_url: unknown, _init: any)=>new Response(JSON.stringify({'subsonic-response':{status:'ok',albumList2:{album:Array.from({length:60},(_,i)=>({id:String(i),name:'Album '+i}))}}}))); vi.stubGlobal('fetch',fetch)
    const result=await new Navidrome({...connection,provider:'navidrome'},'secret').catalog({serverId:'s',libraryId:'1',view:'albums',page:13,search:''}); expect(result.hasMore).toBe(true); expect(new URL(String(fetch.mock.calls[0][0])).searchParams.get('offset')).toBe('780')
  })
})
