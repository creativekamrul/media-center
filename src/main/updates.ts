import { EventEmitter } from 'node:events'
import type { AppUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import type { UpdateState } from '../shared/types'

type Updater = Pick<AppUpdater, 'on' | 'autoDownload' | 'autoInstallOnAppQuit' | 'allowPrerelease' | 'allowDowngrade' | 'disableWebInstaller' | 'checkForUpdates' | 'downloadUpdate' | 'quitAndInstall'>

export function updateError(error: unknown): string {
  const code = String((error as { code?: string })?.code ?? '')
  const message = error instanceof Error ? error.message : ''
  if (/SHA|CHECKSUM|SIGNATURE/.test(code) || /checksum|sha512|signature/i.test(message)) return 'The update failed its integrity check. Check for updates and download it again.'
  if (/404|ERR_UPDATER_LATEST_VERSION_NOT_FOUND|ERR_UPDATER_CHANNEL_FILE_NOT_FOUND/.test(code + message)) return 'No complete update release is available yet. Try again after the GitHub release finishes publishing.'
  if (/ENOSPC/.test(code + message)) return 'There is not enough disk space to download the update.'
  return 'The update could not finish. Check your connection and try again. You can also install the latest release from GitHub.'
}

/** Owns update state in main; no URLs, installer paths, or arbitrary commands cross IPC. */
export class Updates extends EventEmitter {
  state: UpdateState
  private busy = false
  constructor(private updater: Updater, version: string, enabled: boolean, private prepareInstall: () => Promise<void>) {
    super()
    this.state = { currentVersion: version, status: enabled ? 'idle' : 'unavailable' }
    updater.autoDownload = false
    updater.autoInstallOnAppQuit = false
    updater.allowPrerelease = false
    updater.allowDowngrade = false
    updater.disableWebInstaller = true
    updater.on('update-available', (info: UpdateInfo) => this.set({ status: 'available', version: info.version, error: undefined, checkedAt: Date.now() }))
    updater.on('update-not-available', () => this.set({ status: 'up-to-date', version: undefined, error: undefined, checkedAt: Date.now() }))
    updater.on('download-progress', (progress: ProgressInfo) => {
      if (this.state.status === 'downloading') this.set({ percent: Math.max(0, Math.min(100, progress.percent)), transferred: progress.transferred, total: progress.total })
    })
    updater.on('update-downloaded', (info: UpdateInfo) => this.set({ status: 'ready', version: info.version, percent: 100, error: undefined }))
    updater.on('error', (error: Error) => this.set({ status: 'error', error: updateError(error) }))
  }
  private set(patch: Partial<UpdateState>) { this.state = { ...this.state, ...patch }; this.emit('state', this.state) }
  async check() {
    if (this.busy || ['unavailable', 'ready', 'installing'].includes(this.state.status)) return this.state
    this.busy = true
    this.set({ status: 'checking', error: undefined, version: undefined, percent: undefined, transferred: undefined, total: undefined })
    try { if (!await this.updater.checkForUpdates()) this.set({ status: 'unavailable' }) }
    catch (error) { this.set({ status: 'error', error: updateError(error) }) }
    finally { this.busy = false }
    return this.state
  }
  async download() {
    if (this.busy || this.state.status !== 'available') return this.state
    this.busy = true
    this.set({ status: 'downloading', percent: 0, error: undefined })
    try { await this.updater.downloadUpdate() }
    catch (error) { this.set({ status: 'error', error: updateError(error) }) }
    finally { this.busy = false }
    return this.state
  }
  async install() {
    if (this.busy || this.state.status !== 'ready') return this.state
    this.busy = true
    this.set({ status: 'installing', error: undefined })
    try {
      // Finish the playback session and persist the queue before spawning the installer.
      await this.prepareInstall()
      this.updater.quitAndInstall(false, true)
    } catch {
      this.set({ status: 'ready', error: 'Could not prepare the app for installation. Stop playback and try again.' })
    } finally { this.busy = false }
    return this.state
  }
}
