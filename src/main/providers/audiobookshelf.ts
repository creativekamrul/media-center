import { z } from 'zod'
import { APP_VERSION } from '../../shared/version'
import type { Connection, Library, Page, SpokenTarget, SpokenBrowseInput, Progress, Audiobook, PodcastShow, ContinueItem, Bookmark } from '../../shared/types'
import { bookSorts, podcastSorts, statusMatches } from '../../shared/catalog'
import { assertLibraryKind, parseAbsItem, parseAbsLibraries } from './abs-models'
import { coverData, json, request, serverUrl } from './http'

export const sessionSchema = z.object({ id: z.string(), currentTime: z.number().default(0), duration: z.number(), playMethod: z.number(), audioTracks: z.array(z.object({ index: z.number(), title: z.string().default('Audio'), startOffset: z.number().default(0), duration: z.number(), contentUrl: z.string() })).min(1) })
export type AbsSession = z.infer<typeof sessionSchema>
export function playPath(target: SpokenTarget): string {
  if (target.kind === 'audiobook') return `api/items/${encodeURIComponent(target.bookId)}/play`
  if (!target.episodeId) throw new Error('An episode ID is required to play a podcast.')
  return `api/items/${encodeURIComponent(target.showId)}/play/${encodeURIComponent(target.episodeId)}`
}
export class Audiobookshelf {
  constructor(readonly connection: Connection, private token: string) {}
  get headers() { return { Authorization: `Bearer ${this.token}` } }
  async get(path: string) { return json(serverUrl(this.connection.url, path), { headers: this.headers }) }
  async test() { await this.get('api/me') }
  async libraries() { return parseAbsLibraries(await this.get('api/libraries'), this.connection.id) }
  async browse(library: Library, page: number, search: string): Promise<Page> {
    const prefix = `api/libraries/${encodeURIComponent(library.id)}`
    if (search.trim()) {
      const result = z.object({ book: z.array(z.object({ libraryItem: z.unknown() })).optional(), podcast: z.array(z.object({ libraryItem: z.unknown() })).optional() }).parse(await this.get(`${prefix}/search?q=${encodeURIComponent(search)}&limit=100`))
      const items = (library.kind === 'audiobooks' ? result.book ?? [] : result.podcast ?? []).map(x => parseAbsItem(x.libraryItem, this.connection.id))
      items.forEach(item => assertLibraryKind(item, library))
      return { items, total: items.length, page: 0, hasMore: false }
    }
    const result = z.object({ results: z.array(z.unknown()), total: z.number() }).parse(await this.get(`${prefix}/items?limit=60&page=${page}&sort=media.metadata.title&minified=1`))
    const items = result.results.map(x => parseAbsItem(x, this.connection.id)); items.forEach(item => assertLibraryKind(item, library))
    return { items, total: result.total, page, hasMore: (page + 1) * 60 < result.total }
  }
  async progressMap() {
    const result = z.object({ mediaProgress: z.array(z.object({ libraryItemId: z.string(), episodeId: z.string().nullish(), currentTime: z.number().default(0), duration: z.number().default(0), progress: z.number().default(0), isFinished: z.boolean().default(false), lastUpdate: z.number().optional(), finishedAt: z.number().nullish() })).default([]) }).parse(await this.get('api/me'))
    return new Map(result.mediaProgress.map(p => [JSON.stringify([p.libraryItemId, p.episodeId ?? null]), { status: p.isFinished ? 'finished' : p.currentTime > 0 || p.progress > 0 ? 'in-progress' : 'unplayed', position: p.currentTime, duration: p.duration, fraction: p.isFinished ? 1 : Math.max(0, Math.min(1, p.progress || (p.duration ? p.currentTime / p.duration : 0))), updatedAt: p.lastUpdate, finishedAt: p.finishedAt ?? undefined } as Progress]))
  }
  private attach(item: Audiobook | PodcastShow, progress: Map<string, Progress>) {
    if (item.kind === 'audiobook') item.progress = progress.get(JSON.stringify([item.id, null]))
    else item.episodes.forEach(ep => { ep.progress = progress.get(JSON.stringify([item.id, ep.id])) })
    return item
  }
  async catalog(input: SpokenBrowseInput): Promise<Page> {
    const { library, page, search, status } = input
    const allowed = library.kind === 'audiobooks' ? bookSorts : podcastSorts
    if (!allowed.some(([key]) => key === input.sort)) throw new Error('Unsupported library sort.')
    const progress = await this.progressMap()
    if (search.trim()) {
      const result = await this.browse(library, 0, search)
      const items = result.items.map(i => this.attach(i as Audiobook | PodcastShow, progress)).filter(i => i.kind !== 'audiobook' || statusMatches(i.progress, status))
      // ABS search is relevance-ranked; do not imply that page-local sorting is a library sort.
      return { items, page: 0, total: items.length, hasMore: false }
    }
    const params = new URLSearchParams({ limit: '60', page: String(page), sort: input.sort, desc: input.descending ? '1' : '0', minified: '1' })
    if (library.kind === 'audiobooks' && status !== 'all') params.set('filter', `progress.${Buffer.from(status === 'unplayed' ? 'not-started' : status === 'unfinished' ? 'not-finished' : status).toString('base64')}`)
    const result = z.object({ results: z.array(z.unknown()), total: z.number() }).parse(await this.get(`api/libraries/${encodeURIComponent(library.id)}/items?${params}`))
    const items = result.results.map(raw => this.attach(parseAbsItem(raw, this.connection.id), progress)); items.forEach(i => assertLibraryKind(i, library))
    return { items, total: result.total, page, hasMore: (page + 1) * 60 < result.total }
  }
  async detail(id: string) { const [raw, progress] = await Promise.all([this.get(`api/items/${encodeURIComponent(id)}?expanded=1&include=progress`), this.progressMap()]); return this.attach(parseAbsItem(raw, this.connection.id), progress) }
  async setProgress(target: SpokenTarget, action: 'finished' | 'unfinished' | 'reset') {
    const itemId = target.kind === 'audiobook' ? target.bookId : target.showId
    const item = await this.get(`api/items/${encodeURIComponent(itemId)}?expanded=1`)
    const parsed = parseAbsItem(item, this.connection.id)
    if (target.kind === 'audiobook' ? parsed.kind !== 'audiobook' : parsed.kind !== 'podcast-show' || !parsed.episodes.some(e => e.id === target.episodeId)) throw new Error('Progress target does not match this media item.')
    await request(serverUrl(this.connection.url, `api/me/progress/${encodeURIComponent(itemId)}${target.kind === 'podcast-episode' ? `/${encodeURIComponent(target.episodeId)}` : ''}`), { method: 'PATCH', headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'reset' ? { currentTime: 0, progress: 0, isFinished: false } : { isFinished: action === 'finished' }) })
  }
  async continuing(libraryId?: string): Promise<ContinueItem[]> {
    const [raw, progress] = await Promise.all([this.get('api/me/items-in-progress?limit=100'), this.progressMap()])
    const result = z.object({ libraryItems: z.array(z.object({ recentEpisode: z.object({ id: z.string(), title: z.string() }).optional() }).passthrough()) }).parse(raw)
    return result.libraryItems.flatMap(raw => {
      const item = this.attach(parseAbsItem(raw, this.connection.id), progress)
      if (libraryId && item.libraryId !== libraryId) return []
      const ep = raw.recentEpisode
      const p = progress.get(JSON.stringify([item.id, item.kind === 'podcast-show' ? ep?.id : null]))
      if (!p || p.status !== 'in-progress' || (item.kind === 'podcast-show' && !ep)) return []
      return [{ libraryId: item.libraryId, progress: p, item: { target: item.kind === 'audiobook' ? { kind: 'audiobook' as const, serverId: item.serverId, bookId: item.id } : { kind: 'podcast-episode' as const, serverId: item.serverId, showId: item.id, episodeId: ep!.id }, title: item.kind === 'audiobook' ? item.title : ep!.title, subtitle: item.kind === 'audiobook' ? item.subtitle : item.title, cover: item.id, duration: p.duration } }]
    })
  }
  async saveCheckpoint(target: SpokenTarget, position: number, duration: number) {
    const itemId=target.kind==='audiobook'?target.bookId:target.showId
    const item=parseAbsItem(await this.get(`api/items/${encodeURIComponent(itemId)}?expanded=1`),this.connection.id)
    if(target.kind==='audiobook'?item.kind!=='audiobook':item.kind!=='podcast-show'||!item.episodes.some(e=>e.id===target.episodeId))throw new Error('Progress target does not match this media item.')
    await request(serverUrl(this.connection.url,`api/me/progress/${encodeURIComponent(itemId)}${target.kind==='podcast-episode'?`/${encodeURIComponent(target.episodeId)}`:''}`),{method:'PATCH',headers:{...this.headers,'Content-Type':'application/json'},body:JSON.stringify({currentTime:position,duration,progress:duration?Math.min(1,position/duration):0,isFinished:duration>0&&position>=duration})})
  }
  async bookmarks(bookId: string): Promise<Bookmark[]> {
    const me = z.object({ bookmarks: z.array(z.object({ libraryItemId: z.string(), time: z.number(), title: z.string(), createdAt: z.number().optional() })).default([]) }).parse(await this.get('api/me'))
    return me.bookmarks.filter(b => b.libraryItemId === bookId).map(({ time, title, createdAt }) => ({ time, title, createdAt }))
  }
  async bookmark(bookId: string, time: number, title?: string, update = false) {
    const item = parseAbsItem(await this.get(`api/items/${encodeURIComponent(bookId)}?expanded=1`), this.connection.id)
    if (item.kind !== 'audiobook') throw new Error('Server bookmarks belong to audiobooks. Use Listen later for episodes.')
    await request(serverUrl(this.connection.url, `api/me/item/${encodeURIComponent(bookId)}/bookmark${title === undefined ? `/${time}` : ''}`), { method: title === undefined ? 'DELETE' : update ? 'PATCH' : 'POST', headers: { ...this.headers, 'Content-Type': 'application/json' }, ...(title === undefined ? {} : { body: JSON.stringify({ time, title }) }) })
  }
  async cover(id: string) { return coverData(serverUrl(this.connection.url, `api/items/${encodeURIComponent(id)}/cover?width=400`), this.headers) }
  async start(target: SpokenTarget, deviceId: string): Promise<AbsSession> {
    const session = sessionSchema.parse(await json(serverUrl(this.connection.url, playPath(target)), { method: 'POST', headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceInfo: { deviceId, clientName: 'Media Center', clientVersion: APP_VERSION }, forceDirectPlay: true, mediaPlayer: 'mpv' }) }))
    if (session.playMethod !== 0) throw new Error('The server did not provide original audio. This build requires direct playback.')
    return session
  }
  streamUrl(contentUrl: string): string {
    // ABS contentUrl can be root-relative (and include a configured reverse-proxy prefix).
    const url = contentUrl.startsWith('/') ? new URL(contentUrl, this.connection.url) : serverUrl(this.connection.url, contentUrl)
    if (url.origin !== new URL(this.connection.url).origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('Server supplied an unexpected audio origin.')
    return url.href
  }
  async sync(sessionId: string, currentTime: number, duration: number, timeListened: number, close = false) {
    await request(serverUrl(this.connection.url, `api/session/${encodeURIComponent(sessionId)}/${close ? 'close' : 'sync'}`), { method: 'POST', headers: { ...this.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentTime, duration, timeListened }) })
  }
}
