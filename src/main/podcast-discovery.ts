import { dialog, type BrowserWindow } from 'electron'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { z } from 'zod'
import type { Store } from './store'
import { id, type Handle } from './features'
import { Audiobookshelf } from './providers/audiobookshelf'
import type { Navidrome } from './providers/navidrome'
import { request, json, serverUrl } from './providers/http'
import type { PodcastDestination, PodcastFeed } from '../shared/studio'
export const feedUrl = z
  .string()
  .url()
  .max(4000)
  .refine((s) => {
    const u = new URL(s)
    return (
      ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password
    )
  }, 'Use an HTTP or HTTPS feed without embedded credentials.')
const destination = z
  .object({
    serverId: id,
    libraryId: id,
    folderId: id,
    name: z.string().max(2000),
  })
  .strict()
const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
export function opmlDocument(feeds: PodcastFeed[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Media Center subscriptions</title></head><body>${feeds.map((f) => `<outline type="rss" text="${escape(f.title)}" xmlUrl="${escape(f.url)}"/>`).join('')}</body></opml>`
}
export function registerPodcastDiscovery(
  handle: Handle,
  store: Store,
  provider: (id: string) => Navidrome | Audiobookshelf,
  window: () => BrowserWindow,
) {
  const abs = (id: string) => {
    const p = provider(id)
    if (!(p instanceof Audiobookshelf))
      throw Error('Choose an Audiobookshelf server.')
    return p
  }
  const post = async (
    p: Audiobookshelf,
    path: string,
    body: unknown,
    asJson = true,
  ) => {
    const r = await request(serverUrl(p.connection.url, path), {
      method: 'POST',
      headers: { ...p.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return asJson ? r.json() : null
  }
  const destinations = async () => {
    const results: PodcastDestination[] = []
    for (const c of store
      .connections()
      .filter((c) => c.provider === 'audiobookshelf')) {
      const data = z
        .object({
          libraries: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              mediaType: z.enum(['book', 'podcast']),
              folders: z
                .array(
                  z.object({ id: z.string(), fullPath: z.string().optional() }),
                )
                .default([]),
            }),
          ),
        })
        .parse(await abs(c.id).get('api/libraries'))
      for (const l of data.libraries.filter((l) => l.mediaType === 'podcast'))
        for (const f of l.folders)
          results.push({
            serverId: c.id,
            libraryId: l.id,
            folderId: f.id,
            name: c.name + ' · ' + l.name,
          })
    }
    return results
  }
  handle('podcast:destinations', z.undefined(), destinations)
  handle(
    'podcast:discover',
    z
      .object({ serverId: id, query: z.string().trim().min(2).max(4000) })
      .strict(),
    async (i) => {
      const p = abs(i.serverId)
      if (/^https?:/i.test(i.query)) {
        const url = feedUrl.parse(i.query),
          raw = await post(p, 'api/podcasts/feed', { rssFeed: url })
        const data = z
          .object({
            podcast: z.object({
              metadata: z.object({
                title: z.string(),
                author: z.string().nullish(),
              }),
            }),
          })
          .parse(raw)
        return [
          {
            title: data.podcast.metadata.title,
            author: data.podcast.metadata.author ?? '',
            url,
          },
        ]
      }
      return z
        .array(
          z.object({
            title: z.string(),
            artistName: z.string().nullish(),
            feedUrl: z.string().nullish(),
          }),
        )
        .max(500)
        .parse(
          await p.get('api/search/podcast?term=' + encodeURIComponent(i.query)),
        )
        .flatMap((r) =>
          feedUrl.safeParse(r.feedUrl).success
            ? [{ title: r.title, author: r.artistName ?? '', url: r.feedUrl! }]
            : [],
        )
        .slice(0, 100)
    },
  )
  handle(
    'podcast:opml',
    z.object({ serverId: id, action: z.enum(['import', 'export']) }).strict(),
    async (i) => {
      const p = abs(i.serverId)
      if (i.action === 'import') {
        const r = await dialog.showOpenDialog(window(), {
          title: 'Import podcast subscriptions',
          filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }],
          properties: ['openFile'],
        })
        if (r.canceled) return null
        const path = r.filePaths[0]
        if (
          !['.opml', '.xml'].includes(extname(path).toLowerCase()) ||
          (await stat(path)).size > 1024 * 1024
        )
          throw Error('Choose an OPML file up to 1 MB.')
        const text = new TextDecoder('utf-8', { fatal: true }).decode(
          await readFile(path),
        )
        if (/<!DOCTYPE|<!ENTITY/i.test(text))
          throw Error('OPML with document types or entities is unsupported.')
        const raw = z
          .object({
            feeds: z
              .array(z.object({ feedUrl: z.string(), title: z.string() }))
              .max(500),
          })
          .parse(await post(p, 'api/podcasts/opml/parse', { opmlText: text }))
        return raw.feeds.map((f) => ({
          title: f.title || 'Imported podcast',
          author: '',
          url: feedUrl.parse(f.feedUrl),
        }))
      }
      const feeds: PodcastFeed[] = []
      for (const library of (await p.libraries()).filter(
        (l) => l.kind === 'podcasts',
      )) {
        for (let page = 0; page < 167; page++) {
          const raw = z
            .object({
              results: z.array(
                z.object({
                  mediaType: z.literal('podcast'),
                  media: z.object({
                    metadata: z.object({
                      title: z.string(),
                      feedUrl: z.string().optional(),
                      feedURL: z.string().optional(),
                      author: z.string().optional(),
                    }),
                  }),
                }),
              ),
              total: z.number(),
            })
            .parse(
              await p.get(
                `api/libraries/${encodeURIComponent(library.id)}/items?limit=60&page=${page}&minified=1`,
              ),
            )
          for (const r of raw.results) {
            const m = r.media.metadata,
              url = m.feedUrl ?? m.feedURL
            if (feedUrl.safeParse(url).success)
              feeds.push({ title: m.title, author: m.author ?? '', url: url! })
          }
          if ((page + 1) * 60 >= raw.total) break
          if (page === 166)
            throw Error('Too many subscriptions to export at once.')
        }
      }
      const r = await dialog.showSaveDialog(window(), {
        title: 'Export podcast subscriptions',
        defaultPath: 'Media-Center-subscriptions.opml',
        filters: [{ name: 'OPML', extensions: ['opml'] }],
      })
      if (r.canceled || !r.filePath) return null
      await writeFile(r.filePath, opmlDocument(feeds))
      return feeds
    },
  )
  handle(
    'podcast:subscribe',
    z.object({ destination, feeds: z.array(feedUrl).min(1).max(100) }).strict(),
    async (i) => {
      const choices = await destinations()
      if (
        !choices.some(
          (d) =>
            d.serverId === i.destination.serverId &&
            d.libraryId === i.destination.libraryId &&
            d.folderId === i.destination.folderId,
        )
      )
        throw Error('Choose a current podcast library folder.')
      await post(
        abs(i.destination.serverId),
        'api/podcasts/opml/create',
        {
          libraryId: i.destination.libraryId,
          folderId: i.destination.folderId,
          feeds: [...new Set(i.feeds)],
          autoDownloadEpisodes: false,
        },
        false,
      )
      store.cacheClear('podcast-inbox')
    },
  )
}
