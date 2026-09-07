import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Connection, Library, MusicAlbum, MusicTrack, Page, MusicArtist, MusicPlaylist, MusicBrowseInput, MusicPage, MusicDetail, MusicEntity, RadioStation } from '../../shared/types'
import { coverData, json, serverUrl } from './http'

const albumSchema = z.object({ id: z.string(), name: z.string(), artist: z.string().default('Unknown artist'), songCount: z.number().default(0), year: z.number().optional(), coverArt: z.string().optional(), starred: z.string().optional(), userRating: z.number().optional(), genre: z.string().optional(), duration: z.number().optional(), playCount: z.number().optional(), artistId: z.string().optional() })
const songSchema = z.object({ id: z.string(), title: z.string(), artist: z.string().default('Unknown artist'), album: z.string().default(''), duration: z.number().default(0), suffix: z.string().optional(), bitRate: z.number().optional(), samplingRate: z.number().optional(), bitDepth: z.number().optional(), starred: z.string().optional(), userRating: z.number().optional(), coverArt: z.string().optional(), albumId: z.string().optional(), artistId: z.string().optional(), genre: z.string().optional(), year: z.number().optional(), track: z.number().optional(), discNumber: z.number().optional(), playCount: z.number().optional() })
type Parameters = Record<string, string | string[]>
function parameters(params: Parameters): URLSearchParams { const result = new URLSearchParams(); for (const [key, value] of Object.entries(params)) for (const v of Array.isArray(value) ? value : [value]) result.append(key, v); return result }
export class Navidrome {
  constructor(readonly connection: Connection, private password: string) {}
  url(endpoint: string, params: Parameters = {}): URL {
    const salt = randomBytes(16).toString('hex')
    const token = createHash('md5').update(this.password + salt).digest('hex')
    const url = serverUrl(this.connection.url, `rest/${endpoint}.view`)
    url.search = parameters({ u: this.connection.username, t: token, s: salt, v: '1.16.1', c: 'MediaCenter', f: 'json', ...params }).toString()
    return url
  }
  async get(endpoint: string, params: Parameters = {}, post = false): Promise<Record<string, unknown>> {
    const envelope = z.object({ 'subsonic-response': z.object({ status: z.string(), error: z.object({ code: z.number(), message: z.string() }).optional() }).passthrough() }).parse(await json(this.url(endpoint, post ? {} : params), post ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: parameters(params).toString() } : {}))['subsonic-response']
    if (envelope.status !== 'ok') throw new Error(`Navidrome rejected the request (code ${envelope.error?.code ?? 'unknown'}). Check credentials and permissions.`)
    return envelope
  }
  async test() { await this.get('ping') }
  async libraries(): Promise<Library[]> {
    const response = await this.get('getMusicFolders')
    return z.object({ musicFolder: z.array(z.object({ id: z.union([z.string(), z.number()]), name: z.string() })).default([]) }).parse(response.musicFolders).musicFolder.map(l => ({ id: String(l.id), serverId: this.connection.id, name: l.name, kind: 'music' }))
  }
  album(raw: unknown, libraryId = ''): MusicAlbum { const a = albumSchema.parse(raw); return { kind: 'album', id: a.id, serverId: this.connection.id, libraryId, title: a.name, subtitle: a.artist, description: '', trackCount: a.songCount, year: a.year, cover: a.coverArt, starred: !!a.starred, rating: a.userRating, genre: a.genre, duration: a.duration, playCount: a.playCount, artistId: a.artistId } }
  song(raw: unknown): MusicTrack { const s = songSchema.parse(raw); return { kind: 'music-track', id: s.id, serverId: this.connection.id, title: s.title, artist: s.artist, album: s.album, duration: s.duration, codec: s.suffix, bitRate: s.bitRate, sampleRate: s.samplingRate, bitDepth: s.bitDepth, starred: !!s.starred, rating: s.userRating, cover: s.coverArt, albumId: s.albumId, artistId: s.artistId, genre: s.genre, year: s.year, trackNumber: s.track, discNumber: s.discNumber, playCount: s.playCount } }
  artist(raw: unknown): MusicArtist { const a = z.object({ id: z.string(), name: z.string(), albumCount: z.number().default(0), starred: z.string().optional(), coverArt: z.string().optional() }).parse(raw); return { kind: 'artist', id: a.id, serverId: this.connection.id, title: a.name, albumCount: a.albumCount, starred: !!a.starred, cover: a.coverArt } }
  playlist(raw: unknown): MusicPlaylist { const p = z.object({ id: z.string(), name: z.string(), readonly: z.boolean().optional(), comment: z.string().default(''), public: z.boolean().default(false), owner: z.string().optional(), songCount: z.number().default(0), duration: z.number().default(0), coverArt: z.string().optional() }).parse(raw); return { kind: 'playlist', readonly: p.readonly, id: p.id, serverId: this.connection.id, title: p.name, comment: p.comment, public: p.public, owner: p.owner, songCount: p.songCount, duration: p.duration, cover: p.coverArt } }
  async browse(library: Library, page: number, search: string): Promise<Page> {
    const result = search.trim() ? await this.get('search3', { query: search, musicFolderId: library.id, albumCount: '60', albumOffset: String(page * 60), artistCount: '0', songCount: '0' }) : await this.get('getAlbumList2', { type: 'alphabeticalByName', size: '60', offset: String(page * 60), musicFolderId: library.id })
    const albums = z.object({ album: z.array(z.unknown()).default([]) }).parse(search.trim() ? result.searchResult3 : result.albumList2).album
    return { items: albums.map(a => this.album(a, library.id)), page, total: page * 60 + albums.length, hasMore: albums.length === 60 }
  }
  async detail(id: string) { const result = await this.get('getAlbum', { id }); const a = z.object({ song: z.array(z.unknown()).default([]) }).passthrough().parse(result.album); return { kind: 'album' as const, item: this.album(a), tracks: a.song.map(s => this.song(s)) } }
  async track(id: string) { return this.song((await this.get('getSong', { id })).song) }
  stream(id: string) { return this.url('stream', { id, format: 'raw', maxBitRate: '0' }).href }
  async cover(id: string) { return coverData(this.url('getCoverArt', { id, size: '400' })) }
  async scrobble(id: string, submission: boolean) { await this.get('scrobble', { id, submission: String(submission) }) }
  async catalog(input: MusicBrowseInput): Promise<MusicPage> {
    const size = 60, offset = input.page * size
    const folder: Parameters = input.libraryId && input.libraryId !== 'all' ? { musicFolderId: input.libraryId } : {}
    const array = (raw: unknown, field: string): unknown[] => z.object({ [field]: z.array(z.unknown()).default([]) }).parse(raw ?? {})[field]
    let items: MusicEntity[] = [], complete = false
    if (input.view === 'playlists') { const data = await this.get('getPlaylists'); items = array(data.playlists, 'playlist').map(x => this.playlist(x)); complete = true }
    else if (input.view === 'genres') { const data = await this.get('getGenres'); items = z.array(z.object({ value: z.string(), songCount: z.number().default(0), albumCount: z.number().default(0) })).parse(array(data.genres, 'genre')).map(g => ({ kind: 'genre', id: g.value, title: g.value, songCount: g.songCount, albumCount: g.albumCount })); complete = true }
    else if (input.view === 'radio') { items = await this.radios(); complete = true }
    else if (input.view === 'favorites') {
      const data = z.object({ album: z.array(z.unknown()).default([]), artist: z.array(z.unknown()).default([]), song: z.array(z.unknown()).default([]) }).parse((await this.get('getStarred2', folder)).starred2)
      items = [...data.album.map(x => this.album(x, input.libraryId)), ...data.artist.map(x => this.artist(x)), ...data.song.map(x => this.song(x))]; complete = true
    } else if (input.view === 'artists' && !input.search) {
      const data = z.object({ index: z.array(z.object({ artist: z.array(z.unknown()).default([]) })).default([]) }).parse((await this.get('getArtists', folder)).artists)
      items = data.index.flatMap(i => i.artist.map(a => this.artist(a))); complete = true
    } else if (input.search || input.view === 'songs') {
      if (input.genre && !input.search) { const data = await this.get('getSongsByGenre', { genre: input.genre, count: String(size), offset: String(offset), ...folder }); items = array(data.songsByGenre, 'song').map(s => this.song(s)) }
      else {
        const data = await this.get('search3', { query: input.search, albumCount: input.view === 'songs' || input.view === 'artists' ? '0' : String(size), albumOffset: String(offset), songCount: input.view === 'artists' ? '0' : String(size), songOffset: String(offset), artistCount: input.view === 'songs' ? '0' : String(size), artistOffset: String(offset), ...folder })
        const found = data.searchResult3
        items = [...array(found, 'artist').map(a => this.artist(a)), ...array(found, 'album').map(a => this.album(a, input.libraryId)), ...array(found, 'song').map(s => this.song(s))]
      }
    } else {
      const allowed = ['alphabeticalByName', 'alphabeticalByArtist', 'newest', 'recent', 'frequent', 'random', 'highest', 'starred', 'byYear']
      const type = input.view === 'albums' ? (allowed.includes(input.sort ?? '') ? input.sort! : 'alphabeticalByName') : input.view
      const params: Parameters = { type: input.genre ? 'byGenre' : type, size: String(size), offset: String(offset), ...folder }
      if (input.genre) params.genre = input.genre
      if (type === 'byYear') { params.fromYear = input.descending ? '3000' : '0'; params.toYear = input.descending ? '0' : '3000' }
      const data = await this.get('getAlbumList2', params); items = array(data.albumList2, 'album').map(a => this.album(a, input.libraryId))
    }
    if (complete) {
      if (input.search) items = items.filter(i => `${i.title} ${'subtitle' in i ? i.subtitle : ''} ${'artist' in i ? i.artist : ''}`.toLowerCase().includes(input.search.toLowerCase()))
      items.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }) * (input.descending ? -1 : 1))
      return { items: items.slice(offset, offset + size), total: items.length, page: input.page, hasMore: offset + size < items.length }
    }
    return { items, page: input.page, hasMore: items.length >= size }
  }
  async collection(kind: 'album' | 'artist' | 'playlist', id: string): Promise<MusicDetail> {
    if (kind === 'album') { const d = await this.detail(id); return { kind, title: d.item.title, subtitle: d.item.subtitle, cover: d.item.cover, album: d.item, tracks: d.tracks, albums: [] } }
    if (kind === 'playlist') { const raw = (await this.get('getPlaylist', { id })).playlist; const p = this.playlist(raw); const tracks = z.object({ entry: z.array(z.unknown()).default([]) }).parse(raw).entry.map(s => this.song(s)); return { kind, title: p.title, subtitle: `${p.songCount} tracks · ${p.owner ?? 'Playlist'}`, cover: p.cover, playlist: p, tracks, albums: [] } }
    const raw = (await this.get('getArtist', { id })).artist, artist = this.artist(raw)
    const albums = z.object({ album: z.array(z.unknown()).default([]) }).parse(raw).album.map(a => this.album(a))
    return { kind, title: artist.title, subtitle: `${artist.albumCount} albums`, cover: artist.cover, artist, tracks: [], albums }
  }
  async favorite(kind: 'song' | 'album' | 'artist', id: string, favorite: boolean) { await this.get(favorite ? 'star' : 'unstar', { [kind === 'song' ? 'id' : `${kind}Id`]: id }, true) }
  async rate(id: string, rating: number) { await this.get('setRating', { id, rating: String(rating) }, true) }
  async savePlaylist(input: { id?: string; name: string; comment: string; public: boolean; songIds?: string[] }): Promise<MusicPlaylist> {
    let playlistId = input.id
    if (playlistId && this.playlist((await this.get('getPlaylist', { id: playlistId })).playlist).readonly) throw new Error('This playlist is read-only on Navidrome. Smart playlists are managed on the server.')
    if (!playlistId || input.songIds !== undefined) {
      const result = await this.get('createPlaylist', { ...(playlistId ? { playlistId } : { name: input.name }), songId: input.songIds ?? [] }, true)
      playlistId = this.playlist(result.playlist).id
    }
    await this.get('updatePlaylist', { playlistId, name: input.name, comment: input.comment, public: String(input.public) }, true)
    return this.playlist((await this.get('getPlaylist', { id: playlistId })).playlist)
  }
  async deletePlaylist(id: string) { await this.get('deletePlaylist', { id }, true) }
  async radios(): Promise<RadioStation[]> {
    const data = z.object({ internetRadioStation: z.array(z.object({ id: z.union([z.string(), z.number()]), name: z.string(), homePageUrl: z.string().optional() })).default([]) }).parse((await this.get('getInternetRadioStations')).internetRadioStations ?? {})
    return data.internetRadioStation.map(s => ({ kind: 'radio', id: String(s.id), serverId: this.connection.id, title: s.name, homepage: s.homePageUrl }))
  }
  async radioUrl(id: string): Promise<string> {
    const data = z.object({ internetRadioStation: z.array(z.object({ id: z.union([z.string(), z.number()]), streamUrl: z.string() })).default([]) }).parse((await this.get('getInternetRadioStations')).internetRadioStations ?? {})
    const station = data.internetRadioStation.find(s => String(s.id) === id)
    if (!station || !['http:', 'https:'].includes(new URL(station.streamUrl).protocol)) throw new Error('This radio station has no supported stream URL.')
    return station.streamUrl
  }
}
