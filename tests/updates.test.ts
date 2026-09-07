import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { Updates, updateError } from '../src/main/updates'

function fixture(enabled = true) {
  const backend = Object.assign(new EventEmitter(), {
    autoDownload: true, autoInstallOnAppQuit: true, allowPrerelease: true, allowDowngrade: true, disableWebInstaller: false,
    checkForUpdates: vi.fn(async () => { backend.emit('update-available', { version: '0.2.3' }); return {} }),
    downloadUpdate: vi.fn(async () => { backend.emit('update-downloaded', { version: '0.2.3', downloadedFile: 'private-path.exe' }); return ['private-path.exe'] }),
    quitAndInstall: vi.fn()
  })
  const prepare = vi.fn(async () => {})
  const updates = new Updates(backend as unknown as ConstructorParameters<typeof Updates>[0], '0.2.2', enabled, prepare)
  return { backend, updates, prepare }
}
describe('manual app updates', () => {
  it('does not check, download or install automatically, and excludes prereleases and downgrades', async () => {
    const { backend, updates } = fixture()
    expect(backend.autoDownload).toBe(false); expect(backend.autoInstallOnAppQuit).toBe(false)
    expect(backend.allowPrerelease).toBe(false); expect(backend.allowDowngrade).toBe(false); expect(backend.disableWebInstaller).toBe(true)
    expect(backend.checkForUpdates).not.toHaveBeenCalled()
    await updates.download(); await updates.install()
    expect(backend.downloadUpdate).not.toHaveBeenCalled(); expect(backend.quitAndInstall).not.toHaveBeenCalled()
    await updates.check()
    expect(updates.state.status).toBe('available'); expect(backend.downloadUpdate).not.toHaveBeenCalled()
  })
  it('disables updates in development', async () => {
    const { backend, updates } = fixture(false)
    await updates.check(); expect(updates.state.status).toBe('unavailable'); expect(backend.checkForUpdates).not.toHaveBeenCalled()
  })
  it('flushes playback before explicit installation and never exposes installer paths', async () => {
    const { backend, updates, prepare } = fixture()
    await updates.check(); await updates.download()
    expect(updates.state.status).toBe('ready'); expect(JSON.stringify(updates.state)).not.toContain('private-path')
    expect(prepare).not.toHaveBeenCalled(); expect(backend.quitAndInstall).not.toHaveBeenCalled()
    let resume!: () => void
    prepare.mockImplementation(() => new Promise<void>(resolve => { resume = resolve }))
    const installing = updates.install(); await updates.install()
    expect(backend.quitAndInstall).not.toHaveBeenCalled()
    resume(); await installing
    expect(prepare).toHaveBeenCalledTimes(1); expect(backend.quitAndInstall).toHaveBeenCalledTimes(1)
  })
  it('does not install if preparing playback fails', async () => {
    const { backend, updates, prepare } = fixture()
    await updates.check(); await updates.download(); prepare.mockRejectedValue(new Error('busy'))
    await updates.install(); expect(updates.state.status).toBe('ready'); expect(updates.state.error).toContain('Stop playback')
    expect(backend.quitAndInstall).not.toHaveBeenCalled()
  })
  it('serializes requests and reports progress without claiming installation readiness early', async () => {
    const { backend, updates } = fixture()
    await updates.check()
    let finish!: () => void
    backend.downloadUpdate.mockImplementation(() => new Promise(resolve => { finish = () => resolve([]) }))
    const downloading = updates.download(); await updates.download(); await updates.check(); await updates.install()
    backend.emit('download-progress', { percent: 42, transferred: 420, total: 1000 })
    expect(updates.state).toMatchObject({ status: 'downloading', percent: 42, total: 1000 })
    expect(backend.downloadUpdate).toHaveBeenCalledTimes(1); expect(backend.checkForUpdates).toHaveBeenCalledTimes(1)
    expect(backend.quitAndInstall).not.toHaveBeenCalled(); finish(); await downloading
  })
  it('allows retry after a failed download and distinguishes no update', async () => {
    const { backend, updates } = fixture()
    await updates.check(); backend.downloadUpdate.mockRejectedValue(new Error('sha512 mismatch'))
    await updates.download(); expect(updates.state).toMatchObject({ status: 'error', error: expect.stringContaining('integrity') })
    await updates.install(); expect(backend.quitAndInstall).not.toHaveBeenCalled()
    backend.checkForUpdates.mockImplementation(async () => { backend.emit('update-not-available'); return {} })
    await updates.check(); expect(updates.state.status).toBe('up-to-date')
  })
  it('reports missing releases and hides raw network URLs and local paths', () => {
    expect(updateError(new Error('404 latest.yml'))).toContain('No complete update')
    expect(updateError(new Error('request failed https://secret.invalid/token'))).not.toContain('secret.invalid')
    expect(updateError(Object.assign(new Error('write failed'), { code: 'ENOSPC' }))).toContain('disk space')
  })
})
