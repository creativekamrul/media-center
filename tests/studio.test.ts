import {applyProfilePreferences} from '../src/main/studio-preferences'
import { embeddedLyrics } from '../src/main/embedded-lyrics'
import { validateArtwork } from '../src/main/artwork-image'
import { describe, it, expect, vi } from 'vitest'
vi.mock('electron', () => ({
  safeStorage: {},
  app: {},
  dialog: {},
  nativeImage: {},
}))
import { UndoJournal, assertUnchanged } from '../src/main/undo'
import { canCrossfade, crossfadeGains } from '../src/main/crossfade'
import {
  healthIssues,
  importedLyrics,
  diagnosticsReport,
} from '../src/main/studio'
import { profileSchema, outputSchema } from '../src/main/studio-preferences'
import { feedUrl, opmlDocument } from '../src/main/podcast-discovery'
import { parseLrc, encodeLrc } from '../src/shared/lyrics'
import { defaultPlayingScreen } from '../src/shared/playing-screen'
import {
  defaultPreferences,
  emptyPlayback,
  type QueueItem,
  type LocalFile,
} from '../src/shared/types'
const song: QueueItem = {
  target: { kind: 'music-track', serverId: 's', trackId: 'one' },
  title: 'One',
  subtitle: 'Artist',
}
describe('Studio data and undo', () => {
  it('keeps undo entries after a failed restore and blocks concurrent undo', async () => {
    let release: () => void = () => {}
    const done = new Promise<void>((r) => (release = r)),
      u = new UndoJournal(() => {})
    u.add('edit', () => done)
    const first = u.undo()
    await expect(u.undo()).rejects.toThrow('already')
    release()
    await first
    expect(u.snapshot()).toBeNull()
    u.add('changed', async () => assertUnchanged(['old'], ['new']))
    await expect(u.undo()).rejects.toThrow('overwrite')
    expect(u.snapshot()?.label).toBe('changed')
    u.clear()
    expect(u.snapshot()).toBeNull()
  })
  it('only undoes the most recent operation and caps retained closures', async () => {
    const restored: number[] = [],
      u = new UndoJournal(() => {})
    for (let i = 0; i < 25; i++)
      u.add(String(i), async () => {
        restored.push(i)
      })
    for (let i = 0; i < 25; i++) await u.undo()
    expect(restored).toEqual(Array.from({ length: 20 }, (_, i) => 24 - i))
  })
  it('reports possible duplicates without changing original metadata', () => {
    const files = [
      {
        id: 'one.mp3',
        title: 'Song',
        artist: 'Artist',
        album: '',
        duration: 180,
        hasCover: false,
      },
      {
        id: 'two.mp3',
        title: 'Song',
        artist: 'Artist',
        album: 'Album',
        duration: 180.1,
        hasCover: true,
      },
    ] as LocalFile[]
    const before = structuredClone(files),
      rows = healthIssues('root', files)
    expect(rows[0].issues).toEqual([
      'Missing artwork',
      'Incomplete tags',
      'Possible duplicate',
    ])
    expect(rows[1].issues).toEqual(['Possible duplicate'])
    expect(files).toEqual(before)
  })
  it('imports enhanced timing and round-trips unchanged word boundaries', () => {
    const input =
      '[00:01.000]<00:01.000>One <00:02.000>two<00:03.000>\n[00:04.000]Next'
    const record = importedLyrics(input, song),
      saved = parseLrc(encodeLrc(record))
    expect(saved).toEqual(record.lines)
    expect(saved[0].words?.[1].end).toBe(3)
    expect(() => importedLyrics('bad\0lyrics', song)).toThrow()
    expect(() => importedLyrics('x'.repeat(200001), song)).toThrow()
  })
  it('supports plain lyrics and excludes empty documents', () => {
    expect(importedLyrics('Plain verse', song)).toMatchObject({
      plain: 'Plain verse',
      lines: [],
    })
    expect(() => importedLyrics('  ', song)).toThrow()
  })
  it('validates complete listening profiles and output EQ', () => {
    const p = {
      id: 'p',
      name: 'Bedtime',
      preferences: defaultPreferences,
      lyrics: defaultPlayingScreen,
      volume: 30,
      speed: 1.2,
    }
    expect(profileSchema.parse(p)).toEqual(p)
    expect(profileSchema.safeParse({ ...p, volume: 101 }).success).toBe(false)
    expect(
      profileSchema.safeParse({ ...p, credentials: 'secret' }).success,
    ).toBe(false)
    expect(
      outputSchema.safeParse({ volume: 50, equalizer: Array(10).fill(13) })
        .success,
    ).toBe(false)
  })
  it('exports diagnostic categories while omitting secrets, paths, labels and raw errors', () => {
    const state = {
      ...emptyPlayback,
      title: 'secret title',
      subtitle: 'secret artist',
      codec: 'https://secret-host/?token=secret',
      error: 'secret password',
      queue: [song],
    }
    const report = JSON.stringify(
      diagnosticsReport(
        '0.9.0',
        {
          sources: [
            {
              id: 'secret id',
              name: 'secret name',
              provider: 'navidrome',
              connected: false,
              message: 'secret credentials',
            },
          ],
          pending: 2,
          playbackError: 'secret error',
        },
        state,
        { roots: 1, downloads: 0 },
      ),
    )
    expect(report).not.toContain('secret')
    expect(JSON.parse(report).playback.hasPlaybackError).toBe(true)
  })
  it('escapes OPML and rejects credential-bearing or non-HTTP feeds', () => {
    const doc = opmlDocument([
      {
        title: 'A & "B" <C>',
        author: 'Artist',
        url: 'https://example.test/feed?a=1&b=2',
      },
    ])
    expect(doc).toContain('A &amp; &quot;B&quot; &lt;C&gt;')
    expect(doc).toContain('a=1&amp;b=2')
    for (const url of [
      'file:///a',
      'https://user:secret@example.test/feed',
      'javascript:alert(1)',
    ])
      expect(feedUrl.safeParse(url).success).toBe(false)
  })
})
describe('music-only crossfade policy', () => {
  const prefs = { seconds: 5, preserveAlbums: true }
  it('preserves album gapless, repeat-one, exclusive output and disabled transitions', () => {
    expect(
      canCrossfade(song, song, prefs, false, 'off', 'album', 'album'),
    ).toBe(false)
    expect(
      canCrossfade(song, song, prefs, false, 'off', 'album', 'other'),
    ).toBe(true)
    expect(
      canCrossfade(
        song,
        song,
        { ...prefs, preserveAlbums: false },
        false,
        'off',
        'album',
        'album',
      ),
    ).toBe(true)
    expect(canCrossfade(song, song, prefs, true, 'off')).toBe(false)
    expect(canCrossfade(song, song, prefs, false, 'one')).toBe(false)
    expect(
      canCrossfade(song, song, { ...prefs, seconds: 0 }, false, 'off'),
    ).toBe(false)
  })
  it.each(['audiobook', 'podcast-episode', 'radio'] as const)(
    'never crossfades a %s into or out of music',
    (kind) => {
      const other = { ...song, target: { kind } } as QueueItem
      expect(canCrossfade(other, song, prefs, false, 'off')).toBe(false)
      expect(canCrossfade(song, other, prefs, false, 'off')).toBe(false)
    },
  )
  it('keeps gain bounded with continuous endpoints', () => {
    expect(crossfadeGains(-1)).toEqual({ incoming: 0, outgoing: 1 })
    expect(crossfadeGains(0.5)).toEqual({ incoming: 0.5, outgoing: 0.5 })
    expect(crossfadeGains(2)).toEqual({ incoming: 1, outgoing: 0 })
  })
})

it('checks artwork dimensions before native image decoding', () => {
  const png = Buffer.alloc(24)
  png.set(Buffer.from('89504e470d0a1a0a', 'hex'))
  png.writeUInt32BE(800, 16)
  png.writeUInt32BE(800, 20)
  expect(validateArtwork(png, true)).toEqual({ width: 800, height: 800 })
  png.writeUInt32BE(100000, 16)
  expect(() => validateArtwork(png, true)).toThrow()
  const jpeg = Buffer.alloc(24)
  jpeg.set([255, 216, 255, 192, 0, 17, 8, 3, 32, 3, 32, 3])
  expect(validateArtwork(jpeg)).toEqual({ width: 800, height: 800 })
  expect(() => validateArtwork(jpeg, true)).toThrow()
  expect(() => validateArtwork(Buffer.alloc(30))).toThrow()
})

it('uses embedded millisecond timing and never interprets MPEG frame counts as milliseconds', () => {
  expect(embeddedLyrics([{ text: 'A plain verse' }])).toBe('A plain verse')
  expect(
    parseLrc(
      embeddedLyrics([
        {
          timeStampFormat: 2,
          contentType: 1,
          syncText: [
            { text: 'First line', timestamp: 1200 },
            { text: 'Next line', timestamp: 4000 },
          ],
        },
      ]),
    ).map((l) => l.time),
  ).toEqual([1.2, 4])
  expect(
    embeddedLyrics([
      {
        timeStampFormat: 1,
        contentType: 1,
        syncText: [{ text: 'Frame-based verse', timestamp: 200 }],
      },
    ]),
  ).toBe('Frame-based verse')
  expect(embeddedLyrics([{ contentType: 2, text: 'Not song lyrics' }])).toBe('')
})

it('keeps current sharing and window behavior when applying a listening profile',()=>{const saved={...defaultPreferences,theme:'ocean' as const,scrobble:true,closeToTray:true},current={...defaultPreferences,scrobble:false,closeToTray:false};expect(applyProfilePreferences(saved,current)).toMatchObject({theme:'ocean',scrobble:false,closeToTray:false})})
