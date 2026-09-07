import { spawn, type ChildProcess } from 'node:child_process'
import { createConnection, type Socket } from 'node:net'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'

export class Mpv extends EventEmitter {
  private process?: ChildProcess
  private socket?: Socket
  private endpoint = ''
  private pending = new Map<number, { resolve: (data: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>()
  private sequence = 0
  private buffer = ''
  private ready?: Promise<void>
  async start(path: string): Promise<void> {
    if (this.socket && !this.socket.destroyed) return
    if (this.ready) return this.ready
    if (!path) throw new Error('Choose your MPV executable in Settings before playing audio.')
    this.ready = this.launch(path).finally(() => { this.ready = undefined })
    return this.ready
  }
  private async launch(path: string) {
    this.endpoint = process.platform === 'win32' ? `\\\\.\\pipe\\media-center-${randomUUID()}` : join(tmpdir(), `media-center-${randomUUID()}.sock`)
    let launchError: Error | undefined
    const child = spawn(path, ['--idle=yes', '--no-config', '--no-terminal', '--input-terminal=no', '--video=no', '--audio-display=no', '--cache=yes', '--demuxer-max-bytes=64MiB', '--demuxer-readahead-secs=30', `--input-ipc-server=${this.endpoint}`], { windowsHide: true, shell: false, stdio: 'ignore' })
    this.process = child
    child.on('error', () => { launchError = new Error('MPV could not start. Select a valid MPV executable.'); this.emit('failure', launchError.message) })
    child.on('exit', () => {
      if (this.process === child) { this.process = undefined; this.socket?.destroy(); this.socket = undefined; this.rejectPending(); this.emit('failure', 'MPV stopped. You can restart playback to reconnect.') }
    })
    const deadline = Date.now() + 10000
    while (Date.now() < deadline) {
      if (launchError || child.exitCode !== null) break
      const socket = await new Promise<Socket | null>(resolve => {
        const client = createConnection(this.endpoint)
        const timer = setTimeout(() => { client.destroy(); resolve(null) }, 400)
        client.once('error', () => { clearTimeout(timer); client.destroy(); resolve(null) })
        client.once('connect', () => { clearTimeout(timer); resolve(client) })
      })
      if (socket) {
        this.socket = socket; this.buffer = ''
        socket.on('data', data => this.receive(data.toString()))
        socket.on('error', () => { this.rejectPending(); this.emit('failure', 'Lost the local MPV connection.') })
        socket.on('close', () => this.rejectPending())
        for (const [index, name] of ['time-pos', 'pause', 'audio-codec-name', 'audio-params', 'volume', 'paused-for-cache'].entries()) await this.command(['observe_property', index + 1, name])
        return
      }
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    await this.stop()
    throw launchError ?? new Error('MPV did not open its control connection within 10 seconds. Check your executable.')
  }
  private receive(chunk: string) {
    this.buffer += chunk
    if (this.buffer.length > 2 * 1024 * 1024) { this.socket?.destroy(); this.buffer = ''; return }
    let newline: number
    while ((newline = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, newline); this.buffer = this.buffer.slice(newline + 1)
      try {
        const data = JSON.parse(line)
        if (typeof data.request_id === 'number') {
          const pending = this.pending.get(data.request_id)
          if (pending) { clearTimeout(pending.timer); this.pending.delete(data.request_id); data.error === 'success' ? pending.resolve(data.data) : pending.reject(new Error(`MPV command failed: ${String(data.error)}`)) }
        } else if (data.event) this.emit('event', data)
      } catch { /* Ignore malformed individual IPC messages. */ }
    }
  }
  command(command: unknown[]): Promise<unknown> {
    if (!this.socket || this.socket.destroyed) return Promise.reject(new Error('MPV is not connected. Start playback first.'))
    const request_id = ++this.sequence
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(request_id); reject(new Error('MPV command timed out.')) }, 8000)
      this.pending.set(request_id, { resolve, reject, timer })
      this.socket!.write(JSON.stringify({ command, request_id }) + '\n')
    })
  }
  async load(url: string, options: Record<string, string>): Promise<void> {
    let finish: (error?: Error) => void = () => {}
    let cleanup = () => {}
    const loaded = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('MPV could not load the audio stream within 20 seconds.')), 20000)
      const onEvent = (event: { event: string; reason?: string }) => {
        if (event.event === 'file-loaded') finish()
        if (event.event === 'end-file' && event.reason === 'error') finish(new Error('MPV could not open this audio stream.'))
      }
      const onFailure = () => finish(new Error('MPV disconnected while loading audio.'))
      cleanup = () => { clearTimeout(timer); this.off('event', onEvent); this.off('failure', onFailure) }
      finish = error => { cleanup(); error ? reject(error) : resolve() }
      this.on('event', onEvent); this.on('failure', onFailure)
    })
    try { await Promise.all([this.command(['loadfile', url, 'replace', -1, options]).catch(error => { finish(error); throw error }), loaded]) }
    finally { cleanup() }
  }
  private rejectPending() { for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(new Error('MPV disconnected.')) }; this.pending.clear() }
  async stop() {
    const child = this.process; this.process = undefined
    this.socket?.destroy(); this.socket = undefined; this.rejectPending()
    child?.kill()
    if (process.platform !== 'win32' && this.endpoint) await unlink(this.endpoint).catch(() => {})
  }
}
