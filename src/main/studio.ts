import { embeddedLyrics } from './embedded-lyrics'

import { validateArtwork } from './artwork-image'

import { profileSchema, outputSchema, applyProfilePreferences } from './studio-preferences'

import { app, dialog, nativeImage, type BrowserWindow } from 'electron'

import { readFile, writeFile, stat } from 'node:fs/promises'

import { extname } from 'node:path'

import { randomUUID, createHash } from 'node:crypto'

import { z } from 'zod'

import { id, preferenceSchema, type Handle } from './features'

import {
  playingScreenSchema,
  defaultPlayingScreen,
} from '../shared/playing-screen'

import {
  transitionSchema,
  type ListeningProfile,
  type HealthIssue,
  type Rediscovery,
  type SeriesShelf,
  type RecoveryState,
} from '../shared/studio'

import type { QueueItem, LocalFile, MusicTrack } from '../shared/types'

import { parseLrc, encodeLrc, type LyricsRecord } from '../shared/lyrics'

import { progressKey } from '../shared/timeline'

import { Store } from './store'

import { Player } from './player'

import { LocalFiles } from './local'

import { LocalLibrary } from './local-library'

import { LyricsClient } from './lyrics'

import { Navidrome } from './providers/navidrome'

import { Audiobookshelf } from './providers/audiobookshelf'

import { trackQueue } from './daily'

export function importedLyrics(text: string, item: QueueItem): LyricsRecord {
  if (!text.trim() || text.includes('\0') || text.length > 200000)
    throw Error('Choose a non-empty lyric file of up to 200 KB.')
  const lines = parseLrc(text)
  return {
    id: Date.now(),
    title: item.title,
    artist: item.subtitle,
    album: item.context ?? '',
    duration: item.duration ?? 0,
    status: 'found',
    plain: lines.length ? lines.map((l) => l.text).join('\n') : text,
    lines,
  }
}

export function healthIssues(
  rootId: string,
  files: LocalFile[],
): HealthIssue[] {
  const groups = new Map<string, LocalFile[]>()
  for (const f of files) {
    if (!f.artist || !f.duration) continue
    const key = [
      f.title.trim().toLowerCase(),
      f.artist.trim().toLowerCase(),
      Math.round(f.duration),
    ].join('|')
    groups.set(key, [...(groups.get(key) ?? []), f])
  }
  return files.flatMap((f) => {
    const issues = []
    if (!f.hasCover) issues.push('Missing artwork')
    if (!f.artist || !f.album) issues.push('Incomplete tags')
    if (f.error) issues.push('Unreadable metadata')
    const key = [
        f.title.trim().toLowerCase(),
        f.artist.trim().toLowerCase(),
        Math.round(f.duration),
      ].join('|'),
      duplicate = groups.get(key)
    if (duplicate && duplicate.length > 1) issues.push('Possible duplicate')
    return issues.length
      ? [
          {
            rootId,
            fileId: f.id,
            title: f.title,
            issues,
            ...(duplicate && duplicate.length > 1
              ? { duplicateGroup: key }
              : {}),
          },
        ]
      : []
  })
}

export function diagnosticsReport(
  version: string,
  state: RecoveryState,
  player: Player['state'],
  counts: { roots: number; downloads: number },
) {
  return {
    version,
    platform: process.platform,
    architecture: process.arch,
    generatedAt: new Date().toISOString(),
    sources: state.sources.map((s, i) => ({
      source: i + 1,
      provider: s.provider,
      connected: s.connected,
    })),
    pendingProgress: state.pending,
    playback: {
      status: player.status,
      kind: player.kind ?? null,
      codec:
        player.codec &&
        /^(flac|mp3|mp2|aac|alac|opus|vorbis|wavpack|ape|wma[a-z0-9]*|pcm_[a-z0-9_]+|dsd_[a-z0-9_]+)$/i.test(
          player.codec,
        )
          ? player.codec
          : null,
      sampleRate: player.sampleRate ?? null,
      hasPlaybackError: !!player.error,
      hasSyncError: !!player.syncError,
      queueLength: player.queue.length,
    },
    ...counts,
    privacy:
      'No credentials, addresses, paths, source names, track names or raw error messages included.',
  }
}

export function registerStudio(
  handle: Handle,
  store: Store,
  player: Player,
  local: LocalFiles,
  index: LocalLibrary,
  lyrics: LyricsClient,
  provider: (id: string) => Navidrome | Audiobookshelf,
  window: () => BrowserWindow,
  themeChanged: () => void,
  downloadCount: () => number,
) {
  const profiles = () =>
    z
      .array(profileSchema)
      .max(30)
      .parse(store.get('listeningProfiles') ?? [])

  const current = (key: string) => {
    const item = player.state.queue[player.state.queueIndex]
    if (
      !item ||
      !['music-track', 'local-file'].includes(item.target.kind) ||
      progressKey(item.target) !== key
    )
      throw Error('The playing song changed.')
    return item
  }

  handle('profiles:get', z.undefined(), profiles)

  handle('profiles:save', z.string().trim().min(1).max(80), (name) => {
    const all = profiles(),
      old = all.find((p) => p.name === name)
    if (!old && all.length >= 30)
      throw Error('Remove a profile before adding another.')
    store.set('listeningProfiles', [
      ...all.filter((p) => p.id !== old?.id),
      profileSchema.parse({
        id: old?.id ?? randomUUID(),
        name,
        preferences: store.preferences(),
        lyrics: store.get('playingScreen') ?? defaultPlayingScreen,
        volume: player.state.volume,
        speed: player.state.speed,
      }),
    ])
  })

  handle('profiles:delete', id, (id) =>
    store.set(
      'listeningProfiles',
      profiles().filter((p) => p.id !== id),
    ),
  )

  handle('profiles:apply', id, async (id) => {
    const p = profiles().find((p) => p.id === id)
    if (!p) throw Error('Profile no longer exists.')
    const preferences=applyProfilePreferences(p.preferences,store.preferences())
    store.set('preferences', preferences)
    store.set('playingScreen', p.lyrics)
    store.set('profileSpeed', p.speed)
    await player.command({ action: 'volume', value: p.volume })
    if (['playing', 'paused'].includes(player.state.status)) {
      await player.audioPreferences(preferences)
      if (['audiobook', 'podcast-episode'].includes(player.state.kind ?? ''))
        await player.command({ action: 'speed', value: p.speed })
    }
    themeChanged()
  })

  handle('output:profile', z.enum(['get', 'save', 'remove']), (action) => {
    const device = store.settings().audioDevice,
      key = 'output-profile:' + device
    if (action === 'save')
      store.set(key, {
        volume: player.state.volume,
        equalizer: store.preferences().equalizer,
      })
    if (action === 'remove') store.set(key, null)
    return { saved: !!store.get(key), device }
  })

  handle('transitions:prefs', transitionSchema.optional(), (input) => {
    if (input) store.set('transitions', input)
    return transitionSchema.parse(
      store.get('transitions') ?? { seconds: 0, preserveAlbums: true },
    )
  })

  handle('library:health', id, async (rootId) => {
    const previous = await index.index(rootId),
      data = await index.index(rootId, true),
      ids = new Set(data.files.map((f) => f.id)),
      identities = new Set(
        data.files.map((f) => f.fileIdentity).filter(Boolean),
      )
    data.files = [
      ...data.files,
      ...previous.files.filter(
        (f) =>
          !ids.has(f.id) &&
          (!f.fileIdentity || !identities.has(f.fileIdentity)),
      ),
    ]
    const issues = healthIssues(rootId, data.files),
      byId = new Map(issues.map((r) => [r.fileId, r]))
    for (let i = 0; i < data.files.length; i += 12)
      await Promise.all(
        data.files.slice(i, i + 12).map(async (f) => {
          try {
            await local.path(rootId, f.id)
          } catch {
            const row = byId.get(f.id) ?? {
              rootId,
              fileId: f.id,
              title: f.title,
              issues: [],
            }
            row.issues.push('Unavailable file')
            byId.set(f.id, row)
          }
        }),
      )
    return {
      issues: [...byId.values()].slice(0, 10000),
      scanned: data.files.length,
      warnings: [
        ...data.warnings,
        ...(byId.size > 10000 ? ['Showing the first 10,000 issues.'] : []),
      ],
    }
  })

  handle('home:rediscover', z.undefined(), async () => {
    const shelves: Rediscovery[] = [],
      warnings: string[] = [],
      history = store.history(),
      recent = new Set(
        history
          .filter((h) => Date.now() - h.playedAt < 30 * 86400000)
          .map((h) => progressKey(h.item.target)),
      )
    const old = history
      .filter(
        (h) =>
          !recent.has(progressKey(h.item.target)) &&
          ['music-track', 'local-file'].includes(h.item.target.kind),
      )
      .slice(0, 30)
      .map((h) => h.item)
    if (old.length)
      shelves.push({
        title: 'A little time apart',
        reason:
          'Music in your device history that you have not played here in 30 days.',
        items: old,
      })
    const artistGroups = new Map<string, QueueItem[]>()
    for (const item of old) {
      const name = item.subtitle.trim()
      if (name)
        artistGroups.set(name, [...(artistGroups.get(name) ?? []), item])
    }
    for (const [name, items] of [...artistGroups].slice(0, 3))
      shelves.push({
        title: 'Return to ' + name,
        reason:
          'An artist in your older device history, with no plays of these songs here in 30 days.',
        items,
      })
    for (const root of local.roots())
      try {
        const r = await index.query({
          rootId: root.id,
          view: 'favorites',
          page: 0,
          search: '',
          sort: 'title',
        })
        const items = r.tracks
          .map((f) => ({
            target: {
              kind: 'local-file' as const,
              serverId: 'local' as const,
              rootId: root.id,
              fileId: f.id,
            },
            title: f.title,
            subtitle: f.artist,
            duration: f.duration,
            context: f.album,
          }))
          .filter((q) => !recent.has(progressKey(q.target)))
        if (items.length)
          shelves.push({
            title: root.name + ' · Forgotten favorites',
            reason:
              'Local favorites absent from your last 30 days of device listening.',
            items,
          })
      } catch {
        warnings.push(root.name + ': local rediscovery unavailable.')
      }
    for (const c of store
      .connections()
      .filter((c) => c.provider === 'navidrome'))
      try {
        const p = provider(c.id) as Navidrome,
          r = await p.catalog({
            serverId: c.id,
            libraryId: 'all',
            view: 'favorites',
            page: 0,
            search: '',
          })
        const songs = r.items
          .filter((t): t is MusicTrack => t.kind === 'music-track')
          .map(trackQueue)
          .filter((q) => !recent.has(progressKey(q.target)))
        if (songs.length)
          shelves.push({
            title: c.name + ' · Forgotten favorites',
            reason:
              'Starred songs absent from your last 30 days of device listening.',
            items: songs.slice(0, 30),
          })
        const albumHistory = history
          .filter(
            (h) =>
              h.item.target.kind === 'music-track' &&
              h.item.target.serverId === c.id,
          )
          .slice(0, 10)
        for (const h of albumHistory) {
          const t = h.item.target
          if (t.kind !== 'music-track') continue
          const track = await p.track(t.trackId)
          if (!track.albumId) continue
          const a = await p.collection('album', track.albumId),
            heard = new Set(history.map((h) => progressKey(h.item.target))),
            remaining = a.tracks
              .map(trackQueue)
              .filter((q) => !heard.has(progressKey(q.target)))
          if (remaining.length && remaining.length < a.tracks.length) {
            shelves.push({
              title: 'Finish ' + a.title,
              reason: `${remaining.length} album tracks have no entry in your retained device history.`,
              items: remaining,
            })
            break
          }
        }
      } catch {
        warnings.push(c.name + ': rediscovery unavailable.')
      }
    return { shelves, warnings }
  })

  handle('books:series', z.undefined(), async () => {
    const shelves = new Map<string, SeriesShelf>(),
      warnings: string[] = []
    for (const c of store
      .connections()
      .filter((c) => c.provider === 'audiobookshelf'))
      try {
        const p = provider(c.id) as Audiobookshelf
        for (const library of (await p.libraries()).filter(
          (l) => l.kind === 'audiobooks',
        )) {
          for (let page = 0; page < 167; page++) {
            const result = await p.catalog({
              library,
              page,
              search: '',
              sort: 'media.metadata.title',
              descending: false,
              status: 'all',
            })
            for (const book of result.items) {
              if (book.kind !== 'audiobook')
                throw Error('A non-book appeared in a book library.')
              for (const series of book.seriesOrder ??
                book.series.map((name) => ({
                  name,
                  sequence: '',
                  id: undefined,
                }))) {
                const key = JSON.stringify([
                    c.id,
                    library.id,
                    series.id ?? series.name,
                  ]),
                  s = shelves.get(key) ?? {
                    id: key,
                    title: series.name,
                    source: c.name + ' · ' + library.name,
                    books: [],
                  }
                s.books.push({
                  item: {
                    target: {
                      kind: 'audiobook',
                      serverId: c.id,
                      bookId: book.id,
                    },
                    title: book.title,
                    subtitle: book.subtitle,
                    cover: book.cover,
                    duration: book.duration,
                  },
                  sequence: series.sequence,
                  finished: book.progress?.status === 'finished',
                })
                shelves.set(key, s)
              }
            }
            if (!result.hasMore) break
            if (page === 166)
              warnings.push(library.name + ': first 10,020 books indexed.')
          }
        }
      } catch {
        warnings.push(c.name + ': series unavailable.')
      }
    for (const s of shelves.values())
      s.books.sort((a, b) =>
        !a.sequence && !b.sequence
          ? a.item.title.localeCompare(b.item.title)
          : !a.sequence
            ? 1
            : !b.sequence
              ? -1
              : Number.isFinite(Number(a.sequence)) &&
                  Number.isFinite(Number(b.sequence))
                ? Number(a.sequence) - Number(b.sequence)
                : a.sequence.localeCompare(b.sequence, undefined, {
                    numeric: true,
                  }),
      )
    return {
      shelves: [...shelves.values()].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
      warnings,
    }
  })

  const recovery = async (): Promise<RecoveryState> => ({
    sources: await Promise.all(
      store.connections().map(async (c) => {
        try {
          await provider(c.id).test()
          return {
            id: c.id,
            name: c.name,
            provider: c.provider,
            connected: true,
            message: 'Connected',
          }
        } catch {
          return {
            id: c.id,
            name: c.name,
            provider: c.provider,
            connected: false,
            message:
              'Unavailable. Check the server address, credentials and library access in Settings.',
          }
        }
      }),
    ),
    pending: new Set(
      [...store.entries('resume:'), ...store.entries('offlineResume:')]
        .filter((r) => (r.value as { syncPending?: boolean })?.syncPending)
        .map((r) => r.key.replace(/^(offlineResume|resume):/, '')),
    ).size,
    playbackError: player.state.error,
    syncError: player.state.syncError,
  })

  handle('connections:recovery', z.undefined(), recovery)

  handle('diagnostics:export', z.undefined(), async () => {
    const report = diagnosticsReport(
        app.getVersion(),
        await recovery(),
        player.state,
        { roots: local.roots().length, downloads: downloadCount() },
      ),
      r = await dialog.showSaveDialog(window(), {
        title: 'Export privacy-safe diagnostics',
        defaultPath: 'Media-Center-diagnostics.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
    if (r.canceled || !r.filePath) return false
    await writeFile(r.filePath, JSON.stringify(report, null, 2))
    return true
  })

  handle(
    'lyrics:import',
    z
      .object({
        key: z.string().max(10000),
        source: z.enum(['file', 'embedded']),
      })
      .strict(),
    async (i) => {
      const item = current(i.key)
      let text = ''
      if (i.source === 'file') {
        const r = await dialog.showOpenDialog(window(), {
          title: 'Import lyrics for ' + item.title,
          filters: [{ name: 'Lyrics', extensions: ['lrc', 'txt'] }],
          properties: ['openFile'],
        })
        if (r.canceled) return false
        const path = r.filePaths[0]
        if (
          !['.lrc', '.txt'].includes(extname(path).toLowerCase()) ||
          (await stat(path)).size > 200000
        )
          throw Error('Choose a .lrc or .txt file up to 200 KB.')
        text = new TextDecoder('utf-8', { fatal: true })
          .decode(await readFile(path))
          .replace(/^\uFEFF/, '')
      } else {
        if (item.target.kind !== 'local-file')
          throw Error('Embedded lyrics are available for local music.')
        const { parseFile } = await import('music-metadata')
        const metadata = await parseFile(
          await local.path(item.target.rootId, item.target.fileId),
          { skipCovers: true },
        )
        text = embeddedLyrics(metadata.common.lyrics ?? [])
        if (!text) throw Error('This file has no embedded lyrics.')
      }
      current(i.key)
      lyrics.save(i.key, importedLyrics(text, item))
      return true
    },
  )

  handle(
    'lyrics:edit',
    z
      .object({
        key: z.string().max(10000),
        text: z.string().max(200000).optional(),
      })
      .strict(),
    (i) => {
      const item = current(i.key)
      if (i.text !== undefined) lyrics.save(i.key, importedLyrics(i.text, item))
      const record = lyrics.saved(i.key)
      return record ? encodeLrc(record) : ''
    },
  )

  const image = (bytes: Buffer, pngOnly = false) => {
    validateArtwork(bytes, pngOnly)
    const pic = nativeImage.createFromBuffer(bytes)
    if (
      pic.isEmpty() ||
      pic.getSize().width > 4096 ||
      pic.getSize().height > 4096
    )
      throw Error('Choose a PNG or JPEG image up to 4096 pixels per side.')
    return pic.resize({ width: 800, height: 800 }).toDataURL()
  }

  handle(
    'playlist:artwork',
    z
      .object({
        source: id,
        id,
        action: z.enum(['get', 'import', 'save', 'remove']),
        png: z.string().max(7500000).optional(),
      })
      .strict(),
    async (i) => {
      const key =
        'playlist-art:' +
        createHash('sha256')
          .update(JSON.stringify([i.source, i.id]))
          .digest('hex')
      if (i.action === 'remove') store.set(key, null)
      if (
        (i.action === 'save' || i.action === 'import') &&
        !store.get(key) &&
        store.entries('playlist-art:').filter((r) => r.value).length >= 100
      )
        throw Error(
          'Remove a custom cover before adding another (100-cover limit).',
        )
      if (i.action === 'save') {
        if (!i.png?.startsWith('data:image/png;base64,'))
          throw Error('Choose a PNG image.')
        store.set(key, image(Buffer.from(i.png.split(',')[1], 'base64'), true))
      }
      if (i.action === 'import') {
        const r = await dialog.showOpenDialog(window(), {
          title: 'Choose playlist artwork',
          filters: [{ name: 'Artwork', extensions: ['png', 'jpg', 'jpeg'] }],
          properties: ['openFile'],
        })
        if (!r.canceled) {
          const path = r.filePaths[0]
          if (
            !['.png', '.jpg', '.jpeg'].includes(extname(path).toLowerCase()) ||
            (await stat(path)).size > 5 * 1024 * 1024
          )
            throw Error('Choose PNG or JPEG artwork up to 5 MB.')
          store.set(key, image(await readFile(path)))
        }
      }
      return store.get<string>(key) ?? null
    },
  )

  handle(
    'artwork:export',
    z.string().max(7500000).startsWith('data:image/png;base64,'),
    async (png) => {
      const data = image(Buffer.from(png.split(',')[1], 'base64'), true),
        r = await dialog.showSaveDialog(window(), {
          title: 'Save playlist cover',
          defaultPath: 'playlist-cover.png',
          filters: [{ name: 'PNG', extensions: ['png'] }],
        })
      if (r.canceled || !r.filePath) return false
      await writeFile(r.filePath, Buffer.from(data.split(',')[1], 'base64'))
      return true
    },
  )
}
