import { afterEach, describe, expect, it, vi } from 'vitest'
import { Mpv } from '../src/main/mpv'
afterEach(() => vi.useRealTimers())
describe('MPV load readiness', () => {
  it('waits for file-loaded, not just command acceptance', async () => {
    const mpv = new Mpv(); vi.spyOn(mpv, 'command').mockResolvedValue(undefined)
    let ready = false
    const result = mpv.load('https://example.test/audio', { start: '50' }).then(() => { ready = true })
    await Promise.resolve(); await Promise.resolve(); expect(ready).toBe(false)
    mpv.emit('event', { event: 'file-loaded' }); await result
    expect(ready).toBe(true); expect(mpv.listenerCount('event')).toBe(0)
  })
  it('fails explicitly when decoding fails after command acceptance', async () => {
    const mpv = new Mpv(); vi.spyOn(mpv, 'command').mockResolvedValue(undefined)
    const result = mpv.load('https://example.test/audio', {})
    mpv.emit('event', { event: 'end-file', reason: 'error' })
    await expect(result).rejects.toThrow(/could not open/)
    expect(mpv.listenerCount('event')).toBe(0)
  })
})
