import { z } from 'zod'
import type { Audiobook, Library, LibraryItem, PodcastShow } from '../../shared/types'

const number = z.number().finite().nonnegative()
const chapter = z.object({ id: z.number(), title: z.string(), start: number, end: number })
const track = z.object({ index: z.number(), title: z.string().default('Audio file'), startOffset: number.default(0), duration: number.default(0) })
const metadata = z.object({ title: z.string(), subtitle: z.string().nullish(), description: z.string().nullish() }).passthrough()
const base = { id: z.string(), libraryId: z.string(), mediaType: z.string() }
const bookSchema = z.object({ ...base, mediaType: z.literal('book'), media: z.object({
  metadata: metadata.extend({ authors: z.array(z.object({ name: z.string() })).default([]), authorName: z.string().optional(), narrators: z.array(z.string()).default([]), series: z.array(z.object({ name: z.string() })).default([]) }),
  duration: number.default(0), chapters: z.array(chapter).default([]), tracks: z.array(track).default([])
}) })
const podcastSchema = z.object({ ...base, mediaType: z.literal('podcast'), media: z.object({
  metadata: metadata.extend({ author: z.string().nullish() }), numEpisodes: number.optional(), episodes: z.array(z.object({
    id: z.string(), title: z.string(), description: z.string().nullish(), subtitle: z.string().nullish(), season: z.union([z.string(), z.number()]).nullish(), episode: z.union([z.string(), z.number()]).nullish(), publishedAt: number.nullish(), duration: number.optional(),
    audioFile: z.object({ duration: number.optional(), metadata: z.object({ filename: z.string().optional() }).optional() }).passthrough().nullish()
  })).default([])
}) })

export function parseAbsItem(raw: unknown, serverId: string): Audiobook | PodcastShow {
  const discriminator = z.object({ mediaType: z.enum(['book', 'podcast']) }).parse(raw)
  if (discriminator.mediaType === 'book') {
    const item = bookSchema.parse(raw), m = item.media.metadata
    const authors = m.authors.length ? m.authors.map(a => a.name) : m.authorName ? [m.authorName] : []
    return { kind: 'audiobook', id: item.id, serverId, libraryId: item.libraryId, title: m.title, subtitle: authors.join(', '), description: m.description ?? '', authors, narrators: m.narrators, series: m.series.map(s => s.name), duration: item.media.duration, chapters: item.media.chapters, tracks: item.media.tracks }
  }
  const item = podcastSchema.parse(raw), m = item.media.metadata
  return { kind: 'podcast-show', id: item.id, serverId, libraryId: item.libraryId, title: m.title, subtitle: m.author ?? '', description: m.description ?? '', author: m.author ?? '', episodeCount: item.media.numEpisodes ?? item.media.episodes.length,
    episodes: item.media.episodes.map(ep => ({ kind: 'podcast-episode', id: ep.id, showId: item.id, serverId, title: ep.title, description: ep.description ?? '', subtitle: ep.subtitle ?? undefined, season: ep.season == null ? undefined : String(ep.season), episode: ep.episode == null ? undefined : String(ep.episode), filename: ep.audioFile?.metadata?.filename, publishedAt: ep.publishedAt ?? undefined, duration: ep.audioFile?.duration ?? ep.duration ?? 0, downloaded: !!ep.audioFile })) }
}
export function parseAbsLibraries(raw: unknown, serverId: string): Library[] {
  return z.object({ libraries: z.array(z.object({ id: z.string(), name: z.string(), mediaType: z.enum(['book', 'podcast']) })) }).parse(raw).libraries
    .map(l => ({ id: l.id, serverId, name: l.name, kind: l.mediaType === 'book' ? 'audiobooks' : 'podcasts' }))
}
export function assertLibraryKind(item: LibraryItem, library: Library): void {
  const expected = library.kind === 'audiobooks' ? 'audiobook' : library.kind === 'podcasts' ? 'podcast-show' : 'album'
  if (item.kind !== expected) throw new Error(`Server returned ${item.kind} in a ${library.kind} library. Refusing to mix library types.`)
}
