import { afterEach, describe, expect, it, vi } from 'vitest'
import { Audiobookshelf } from '../src/main/providers/audiobookshelf'
import { Navidrome } from '../src/main/providers/navidrome'
import { serverUrl } from '../src/main/providers/http'

afterEach(() => vi.unstubAllGlobals())
describe('provider transport', () => {
  const connection = { id: 'server', provider: 'audiobookshelf' as const, name: 'Shelf', url: 'https://example.test/shelf', username: '' }
  it('retains reverse-proxy paths in requests and root-relative streams', () => {
    const abs = new Audiobookshelf(connection, 'secret')
    expect(serverUrl(connection.url, 'api/libraries').href).toBe('https://example.test/shelf/api/libraries')
    expect(abs.streamUrl('/shelf/api/session/s/track/1')).toBe('https://example.test/shelf/api/session/s/track/1')
    expect(() => abs.streamUrl('https://other.test/audio.mp3')).toThrow(/origin/)
  })
  it('uses header authentication and forces a direct-play episode session', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'session', duration: 900, playMethod: 0, currentTime: 35, audioTracks: [{ index: 1, duration: 900, contentUrl: '/shelf/audio' }] })))
    vi.stubGlobal('fetch', fetch)
    const abs = new Audiobookshelf(connection, 'private-token')
    const session = await abs.start({ kind: 'podcast-episode', serverId: 'server', showId: 'show', episodeId: 'episode' }, 'device')
    expect(String(fetch.mock.calls[0][0])).toBe('https://example.test/shelf/api/items/show/play/episode')
    const options = fetch.mock.calls[0][1]
    expect(options.headers.Authorization).toBe('Bearer private-token')
    expect(JSON.parse(options.body)).toMatchObject({ forceDirectPlay: true, mediaPlayer: 'mpv' })
    expect(session.currentTime).toBe(35)
  })
  it('does not silently accept transcoding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 's', duration: 100, playMethod: 1, audioTracks: [{ index: 1, duration: 100, contentUrl: '/hls' }] }))))
    await expect(new Audiobookshelf(connection, 'token').start({ kind: 'audiobook', serverId: 's', bookId: 'book' }, 'd')).rejects.toThrow(/original audio/)
  })
  it('requests raw Navidrome audio and never sends plaintext passwords in its URL', () => {
    const nav = new Navidrome({ ...connection, provider: 'navidrome', url: 'https://example.test/music', username: 'user' }, 'secret password')
    const url = new URL(nav.stream('track'))
    expect(url.pathname).toBe('/music/rest/stream.view'); expect(url.searchParams.get('format')).toBe('raw'); expect(url.searchParams.get('maxBitRate')).toBe('0')
    expect(url.searchParams.has('p')).toBe(false); expect(url.href).not.toContain('secret'); expect(url.searchParams.get('t')).toMatch(/^[a-f0-9]{32}$/)
  })
  it('does not expose credential-bearing URLs in network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed https://example.test?token=SECRET')))
    await expect(new Audiobookshelf(connection, 'SECRET').libraries()).rejects.toThrow('Cannot reach the server.')
  })
})
