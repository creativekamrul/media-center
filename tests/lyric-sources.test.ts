import { describe, it, expect, vi } from 'vitest'
import { automaticLyrics, navidromeLyrics, textLyrics } from '../src/main/lyric-sources'
import { Navidrome } from '../src/main/providers/navidrome'

const found = textLyrics('[00:01.25]Embedded verse')!
describe('automatic lyric source priority', () => {
  it.each(['embedded', 'navidrome'] as const)('uses %s before even a cached LRCLIB match', async source => {
    const fallback = vi.fn().mockResolvedValue(textLyrics('Cached LRCLIB verse'))
    expect(await automaticLyrics({ source, preferred: async () => found, fallback, assertCurrent() {} })).toEqual({ ...found, source })
    expect(fallback).not.toHaveBeenCalled()
  })
  it('tries the fallback only after an empty preferred source', async () => {
    const order: string[] = []
    const result = await automaticLyrics({ source: 'navidrome', preferred: async () => { order.push('server'); return undefined }, fallback: async () => { order.push('lrclib'); return found }, assertCurrent() {} })
    expect(order).toEqual(['server', 'lrclib']); expect(result.source).toBe('lrclib'); expect(result.warning).toBeUndefined()
  })
  it('falls back on unavailable server lyrics without exposing server error details', async () => {
    const result = await automaticLyrics({ source: 'navidrome', preferred: async () => { throw Error('secret URL') }, fallback: async () => found, assertCurrent() {} })
    expect(result.source).toBe('lrclib'); expect(result.warning).toContain('Navidrome lyrics are unavailable'); expect(JSON.stringify(result)).not.toContain('secret')
  })
  it('stops before external lookup when playback changes', async () => {
    const fallback = vi.fn()
    await expect(automaticLyrics({ source: 'embedded', preferred: async () => undefined, fallback, assertCurrent() { throw Error('Track changed') } })).rejects.toThrow('Track changed')
    expect(fallback).not.toHaveBeenCalled()
  })
  it('preserves plain embedded lyrics without requiring title or artist tags', () => {
    expect(textLyrics('Plain embedded verse')).toEqual({ status: 'found', plain: 'Plain embedded verse', lines: [] })
    expect(textLyrics(' [ar:Artist]\n[00:00] ')).toBeUndefined()
    expect(textLyrics('x'.repeat(200001))).toBeUndefined()
  })
})
describe('Navidrome 0.60.3 structured lyrics', () => {
  it('prefers a synchronized version, converts milliseconds and offsets, and sorts lines', () => {
    expect(navidromeLyrics({ structuredLyrics: [
      { synced: false, line: [{ value: 'Plain version' }] },
      { synced: true, offset: -250, line: [{ start: 2500, value: 'Second' }, { start: 100, value: 'First' }] },
    ] })).toEqual({ status: 'found', plain: 'Second\nFirst', lines: [{ time: 0, text: 'First' }, { time: 2.25, text: 'Second' }] })
  })
  it('keeps untimed text when timestamps are incomplete and ignores malformed or empty versions', () => {
    expect(navidromeLyrics({ structuredLyrics: [{ synced: true, line: [{ value: 'Still readable' }] }] })?.lines).toEqual([])
    for (const value of [undefined, {}, { structuredLyrics: null }, { structuredLyrics: [{ synced: false, line: [{ value: ' ' }] }] }, { structuredLyrics: [{ synced: true, line: [{ value: 'Bad', start: -10 }] }] }]) expect(navidromeLyrics(value)).toBeUndefined()
  })
  it('requests lyrics using the song ID on its own authenticated provider', async () => {
    const provider = new Navidrome({ id: 'music-server', provider: 'navidrome', name: 'Music', url: 'https://music.invalid', username: 'user' }, 'password')
    const get = vi.spyOn(provider, 'get').mockResolvedValue({ lyricsList: { structuredLyrics: [{ synced: false, line: [{ value: 'Server verse' }] }] } })
    expect((await provider.lyrics('song-id'))?.plain).toBe('Server verse')
    expect(get).toHaveBeenCalledExactlyOnceWith('getLyricsBySongId', { id: 'song-id' })
  })
})
