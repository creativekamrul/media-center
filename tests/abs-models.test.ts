import { describe, expect, it } from 'vitest'
import { assertLibraryKind, parseAbsItem, parseAbsLibraries } from '../src/main/providers/abs-models'
import { locateTrack, progressKey } from '../src/shared/timeline'
import { playPath } from '../src/main/providers/audiobookshelf'
import type { PlayTarget } from '../src/shared/types'

const book = { id: 'book-1', libraryId: 'library-books', mediaType: 'book', media: { metadata: { title: 'A long story', authors: [{ name: 'An Author' }], narrators: ['A Narrator'], series: [{ name: 'A Series' }] }, duration: 1000, tracks: [{ index: 1, title: 'Part 1', startOffset: 0, duration: 400 }, { index: 2, title: 'Part 2', startOffset: 400, duration: 600 }], chapters: [{ id: 0, title: 'Opening', start: 0, end: 200 }, { id: 1, title: 'Across two files', start: 200, end: 800 }, { id: 2, title: 'Finale', start: 800, end: 1000 }] } }
const podcast = { id: 'show-1', libraryId: 'library-podcasts', mediaType: 'podcast', media: { metadata: { title: 'A weekly show', author: 'The host' }, numEpisodes: 2, episodes: [{ id: 'episode-1', title: 'First episode', publishedAt: 1700000000000, audioFile: { duration: 900 } }, { id: 'episode-2', title: 'Second episode', audioFile: null }] } }

describe('Audiobookshelf media boundaries', () => {
  it('classifies multiple libraries using mediaType, never their names', () => {
    expect(parseAbsLibraries({ libraries: [{ id: 'a', name: 'Podcasts (actually books)', mediaType: 'book' }, { id: 'b', name: 'Audiobooks (actually shows)', mediaType: 'podcast' }, { id: 'c', name: 'Other books', mediaType: 'book' }] }, 'server').map(l => l.kind)).toEqual(['audiobooks', 'podcasts', 'audiobooks'])
  })
  it('retains series identity and fractional sequence only on books',()=>{
    const parsed=parseAbsItem({...book,media:{...book.media,metadata:{...book.media.metadata,series:[{id:'series-id',name:'Series',sequence:2.5}]}}},'server');expect(parsed.kind).toBe('audiobook');if(parsed.kind==='audiobook')expect(parsed.seriesOrder).toEqual([{id:'series-id',name:'Series',sequence:'2.5'}]);expect(parseAbsItem(podcast,'server')).not.toHaveProperty('seriesOrder')
  })
  it('keeps chapters and physical files separate', () => {
    const item = parseAbsItem(book, 'server')
    expect(item.kind).toBe('audiobook')
    if (item.kind !== 'audiobook') throw new Error('Wrong kind')
    expect(item.chapters).toHaveLength(3); expect(item.tracks).toHaveLength(2)
    expect(item).not.toHaveProperty('episodes'); expect(item.authors).toEqual(['An Author'])
  })
  it('keeps episode identity, parent show identity, and file availability', () => {
    const item = parseAbsItem(podcast, 'server')
    expect(item.kind).toBe('podcast-show')
    if (item.kind !== 'podcast-show') throw new Error('Wrong kind')
    expect(item.episodes[0]).toMatchObject({ id: 'episode-1', showId: 'show-1', duration: 900, downloaded: true })
    expect(item.episodes[1].downloaded).toBe(false); expect(item).not.toHaveProperty('chapters')
  })
  it('does not mistake a minified podcast without episodes for an audiobook', () => {
    const item = parseAbsItem({ ...podcast, media: { ...podcast.media, episodes: undefined, numEpisodes: 53 } }, 'server')
    expect(item).toMatchObject({ kind: 'podcast-show', episodeCount: 53, episodes: [] })
  })
  it('refuses unexpected media types and library mismatches', () => {
    expect(() => parseAbsItem({ ...book, mediaType: 'video' }, 'server')).toThrow()
    expect(() => assertLibraryKind(parseAbsItem(podcast, 'server'), { id: 'books', serverId: 'server', kind: 'audiobooks', name: 'Books' })).toThrow(/Refusing to mix/)
  })
  it('uses book playback and episode playback endpoints independently', () => {
    expect(playPath({ kind: 'audiobook', serverId: 's', bookId: 'book/id' })).toBe('api/items/book%2Fid/play')
    expect(playPath({ kind: 'podcast-episode', serverId: 's', showId: 'show/id', episodeId: 'ep/id' })).toBe('api/items/show%2Fid/play/ep%2Fid')
    expect(() => playPath({ kind: 'podcast-episode', serverId: 's', showId: 's', episodeId: '' })).toThrow(/episode ID/)
  })
})
describe('whole-book timeline', () => {
  it.each([[0, 0, 0], [200, 0, 200], [399, 0, 399], [400, 1, 0], [800, 1, 400], [1000, 1, 600], [1500, 1, 600], [-10, 0, 0]])('maps %i book seconds to file %i offset %i', (position, index, offset) => {
    expect(locateTrack(book.media.tracks, position)).toEqual({ index, offset })
  })
  it('refuses empty audio', () => expect(() => locateTrack([], 100)).toThrow(/no playable/))
  it('separates servers, books, shows, and episodes in saved progress', () => {
    const targets: PlayTarget[] = [{ kind: 'audiobook', serverId: 'a', bookId: 'same' }, { kind: 'audiobook', serverId: 'b', bookId: 'same' }, { kind: 'podcast-episode', serverId: 'a', showId: 'same', episodeId: 'one' }, { kind: 'podcast-episode', serverId: 'a', showId: 'same', episodeId: 'two' }, { kind: 'podcast-episode', serverId: 'a', showId: 'other', episodeId: 'one' }]
    expect(new Set(targets.map(progressKey)).size).toBe(5)
  })
})
