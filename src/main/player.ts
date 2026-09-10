import { assertUnchanged } from './undo'
import { canCrossfade, crossfadeGains } from './crossfade'
import { transitionSchema } from '../shared/studio'
import { StatePublisher } from './state-publisher'
import { EventEmitter } from 'node:events'
import {
  emptyPlayback,
  defaultPreferences,
  type PlayTarget,
  type PlaybackState,
  type PlayerCommand,
  type QueueItem,
  type QueueEdit,
  type Preferences,
} from '../shared/types'
import type { LocalFiles } from './local'
import { locateTrack, progressKey } from '../shared/timeline'
import { Audiobookshelf, type AbsSession } from './providers/audiobookshelf'
import { Navidrome } from './providers/navidrome'
import { Mpv } from './mpv'
import { Store } from './store'
import { Downloads, type OfflineMedia } from './downloads'
import { defaultDailySettings, type DailySettings } from '../shared/daily'
export function rewindPosition(
  position: number,
  elapsed: number,
  settings: DailySettings,
): number {
  return Math.max(
    0,
    position -
      (!settings.smartRewind || elapsed < 10000
        ? 0
        : elapsed >= 300000
          ? settings.longRewind
          : settings.shortRewind),
  )
}

export class Player extends EventEmitter {
  private closing = false
  private generation = 0
  private fadeTail?: Mpv
  private fadeTimer?: NodeJS.Timeout
  private fadePending = false
  private fadeAttempt = ''
  private fadeIn = false
  private fadeFraction = 1
  private nextAlbum = ''
  private currentAlbum = ''
  autoplay?: (current: QueueItem) => Promise<QueueItem[]>
  state: PlaybackState = structuredClone(emptyPlayback)
  private session?: { provider: Audiobookshelf; data: AbsSession }
  private target?: PlayTarget
  private staged?: {
    item: QueueItem
    index: number
    duration: number
    url: string
    offline?: OfflineMedia
    entryId?: number
    started: boolean
    loaded: boolean
  }
  private gaplessTransition = false
  private reachedEnd = false
  private lastStartedEntry?: number
  private lastLoadedEntry?: number
  private offline?: OfflineMedia
  private pausedAt = 0
  private statsSeconds = 0
  private fileIndex = 0
  private serial: Promise<unknown> = Promise.resolve()
  private listened = 0
  private lastTick = Date.now()
  private scrobbled = false
  private switchingFile = false
  private timer: NodeJS.Timeout
  private saveTick = 0
  private unshuffled: QueueItem[] | undefined
  constructor(
    readonly mpv: Mpv,
    private store: Store,
    private provider: (id: string) => Audiobookshelf | Navidrome,
    private local?: LocalFiles,
    private downloads?: Downloads,
  ) {
    super()
    const saved = store.get<{ queue: QueueItem[]; index: number }>('queue')
    if (saved?.queue.length) {
      this.state.queue = saved.queue
      this.state.queueIndex = Math.min(saved.index, saved.queue.length - 1)
      const current = this.state.queue[this.state.queueIndex]
      this.state.title = current.title
      this.state.subtitle = current.subtitle
      this.state.kind = current.target.kind
    }
    this.state.volume = store.get<number>('volume') ?? 80
    mpv.on('event', (event) => {
      if (event.event === 'start-file')
        this.lastStartedEntry = event.playlist_entry_id
      if (event.event === 'file-loaded')
        this.lastLoadedEntry = this.lastStartedEntry
      if (event.event === 'end-file' && event.reason === 'eof')
        this.reachedEnd = true
      if (
        event.event === 'start-file' &&
        this.staged &&
        event.playlist_entry_id === this.staged.entryId
      )
        this.staged.started = true
      if (event.event === 'file-loaded' && this.staged?.started) {
        this.staged.loaded = true
        this.emit('gapless-loaded')
      }
      if (event.event === 'end-file' && event.reason === 'eof' && this.staged)
        this.gaplessTransition = true
      if (event.event === 'property-change') {
        if (
          event.name === 'time-pos' &&
          typeof event.data === 'number' &&
          this.state.status !== 'loading' &&
          !this.switchingFile &&
          !this.gaplessTransition
        ) {
          const before = this.state.position
          this.state.position =
            event.data +
            (this.offline?.files[this.fileIndex]?.startOffset ??
              this.session?.data.audioTracks[this.fileIndex]?.startOffset ??
              0)
          if (
            this.state.status === 'playing' &&
            this.state.sleepChapter &&
            this.state.position - before < 5 * this.state.speed &&
            this.state.chapters.some(
              (c) => c.end > before && c.end <= this.state.position,
            )
          ) {
            this.state.sleepChapter = false
            void this.command({ action: 'toggle' }).catch(() => {})
          }
        }
        if (event.name === 'time-pos') this.maybeCrossfade()
        if (event.name === 'audio-codec-name' && typeof event.data === 'string')
          this.state.codec = event.data
        if (event.name === 'audio-params')
          this.state.sampleRate = event.data?.samplerate
        if (event.name === 'paused-for-cache')
          this.state.buffering = !!event.data
        if (
          [
            'time-pos',
            'audio-codec-name',
            'audio-params',
            'paused-for-cache',
          ].includes(event.name)
        )
          this.publish(true)
      }
      if (event.event === 'end-file' && event.reason === 'eof') {
        const generation = this.generation
        void this.enqueue(async () => {
          if (!this.closing && this.generation === generation)
            await this.ended()
        }).catch((error) =>
          this.fail(
            error instanceof Error
              ? error.message
              : 'Could not advance playback.',
          ),
        )
      }
      if (event.event === 'end-file' && event.reason === 'error')
        this.fail(
          'MPV could not decode or read this audio stream. Check the connection and file format.',
        )
    })
    mpv.on('failure', (message) => {
      if (this.state.status !== 'idle') this.fail(message)
    })
    this.timer = setInterval(() => {
      const now = Date.now(),
        elapsed = Math.min(2, (now - this.lastTick) / 1000)
      this.lastTick = now
      if (this.state.status === 'playing' && !this.state.buffering) {
        this.listened += elapsed
        this.statsSeconds += elapsed
      }
      if (this.state.sleepAt && now >= this.state.sleepAt) {
        this.state.sleepAt = undefined
        void this.enqueue(async () => {
          if (this.state.status === 'playing')
            await this.commandInner({ action: 'toggle' })
        }).catch(() => {})
      }
      if (++this.saveTick % 5 === 0) this.saveResume()
      if (this.saveTick % 15 === 0)
        void this.enqueue(() => this.sync()).catch(() => {})
    }, 1000)
  }
  private publisher = new StatePublisher(() =>
    this.emit('state', structuredClone(this.state)),
  )
  private publish(telemetry = false) {
    this.publisher.publish(telemetry)
  }
  private saveQueue() {
    this.store.set('queue', {
      queue: this.state.queue,
      index: this.state.queueIndex,
    })
  }
  private fail(message: string) {
    this.state.status = 'error'
    this.state.error = message
    this.publish()
  }
  enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.serial.then(work)
    this.serial = next.catch(() => {})
    return next
  }
  async play(queue: QueueItem[], index: number, position?: number) {
    return this.enqueue(async () => {
      try {
        await this.cancelCrossfade()
        if (this.state.status === 'playing' || this.state.status === 'paused') {
          await this.mpv.command(['set_property', 'pause', true])
          this.state.status = 'paused'
        }
        await this.clearStaged()
        await this.closeSession()
        if (this.target) await this.mpv.command(['stop']).catch(() => {})
        this.state.queue = structuredClone(queue)
        this.state.queueIndex = index
        this.unshuffled = undefined
        this.state.shuffle = false
        this.saveQueue()
        await this.load(this.state.queue[index], position)
      } catch (error) {
        this.fail(error instanceof Error ? error.message : 'Playback failed.')
        throw error
      }
    })
  }
  private async load(item: QueueItem, position?: number) {
    this.generation++
    this.state.status = 'loading'
    this.state.error = undefined
    this.state.syncError = undefined
    this.state.codec = undefined
    this.state.sampleRate = undefined
    this.state.buffering = false
    this.state.title = item.title
    this.state.subtitle = item.subtitle
    this.state.kind = item.target.kind
    this.state.position = 0
    this.state.duration = 0
    this.state.chapters = []
    this.fadeAttempt = ''
    this.currentAlbum = ''
    this.nextAlbum = ''
    this.reachedEnd = false
    this.target = item.target
    this.offline = undefined
    this.fileIndex = 0
    this.listened = 0
    this.scrobbled = false
    this.publish()
    const settings = this.store.settings()
    await this.mpv.start(settings.mpvPath)
    await this.mpv.command([
      'set_property',
      'audio-exclusive',
      settings.exclusive,
    ])
    await this.mpv.command([
      'set_property',
      'audio-device',
      settings.audioDevice,
    ])
    await this.mpv.command([
      'set_property',
      'volume',
      this.fadeIn ? 0 : this.state.volume,
    ])
    const prefs = {
      ...defaultPreferences,
      ...this.store.get<Preferences>('preferences'),
    }
    await this.audioPreferences(prefs)
    this.offline = await this.downloads?.ready(item.target)
    const provider =
      item.target.kind === 'local-file' || this.offline
        ? undefined
        : this.provider(item.target.serverId)
    this.state.speed =
      item.target.kind === 'audiobook' || item.target.kind === 'podcast-episode'
        ? (this.store.get<number>(`speed:${progressKey(item.target)}`) ??
          this.store.get<number>('profileSpeed') ??
          1)
        : 1
    await this.mpv.command(['set_property', 'speed', this.state.speed])
    if (this.offline) {
      this.state.duration = this.offline.entry.duration
      this.state.chapters = this.offline.entry.chapters
      const checkpoint =
        this.store.get<{ position: number; updatedAt: number }>(
          `offlineResume:${progressKey(item.target)}`,
        ) ??
        this.store.get<{ position: number; updatedAt: number }>(
          `resume:${progressKey(item.target)}`,
        )
      let resume = position ?? checkpoint?.position ?? 0
      if (
        item.target.kind === 'audiobook' ||
        item.target.kind === 'podcast-episode'
      ) {
        this.state.syncError =
          'Playing downloaded audio. Progress is saved on this device; server sync is pending.'
        if (position === undefined)
          resume = rewindPosition(
            resume,
            checkpoint ? Date.now() - checkpoint.updatedAt : 0,
            this.daily(),
          )
      }
      await this.loadAbsFile(Math.min(resume, this.state.duration))
    } else if (item.target.kind === 'local-file') {
      if (!this.local) throw new Error('Local files are unavailable.')
      const file = await this.local.metadata(
        item.target.rootId,
        item.target.fileId,
      )
      this.state.title = file.title
      this.state.subtitle = file.artist || file.name
      this.state.duration = file.duration
      await this.mpv.load(
        await this.local.path(item.target.rootId, item.target.fileId),
        { start: String(position ?? 0) },
      )
      this.state.position = position ?? 0
    } else if (item.target.kind === 'radio') {
      if (!(provider instanceof Navidrome))
        throw new Error('Radio requires a Navidrome server.')
      await this.mpv.load(await provider.radioUrl(item.target.stationId), {})
    } else if (item.target.kind === 'music-track') {
      if (!(provider instanceof Navidrome))
        throw new Error('A music track requires a Navidrome server.')
      const track = await provider.track(item.target.trackId)
      this.state.title = track.title
      this.state.subtitle = track.artist
      this.state.duration = track.duration
      await this.mpv.load(provider.stream(track.id), {
        start: String(position ?? 0),
      })
      this.state.position = position ?? 0
      item.cover = track.cover
      this.saveQueue()
      if (prefs.scrobble)
        await provider.scrobble(track.id, false).catch(() => {
          this.state.syncError = 'Now-playing could not be sent to Navidrome.'
        })
    } else {
      if (!(provider instanceof Audiobookshelf))
        throw new Error('Spoken audio requires an Audiobookshelf server.')
      const detail = await provider.detail(
        item.target.kind === 'audiobook'
          ? item.target.bookId
          : item.target.showId,
      )
      if (item.target.kind === 'audiobook' && detail.kind !== 'audiobook')
        throw new Error('This item is a podcast show, not an audiobook.')
      if (
        item.target.kind === 'podcast-episode' &&
        (detail.kind !== 'podcast-show' ||
          !detail.episodes.some(
            (e) => e.id === (item.target as { episodeId: string }).episodeId,
          ))
      )
        throw new Error(
          'This episode does not belong to the selected podcast show.',
        )
      const data = await provider.start(
        item.target,
        this.store.get<string>('deviceId')!,
      )
      this.session = { provider, data }
      this.state.duration = data.duration
      this.state.chapters = detail.kind === 'audiobook' ? detail.chapters : []
      const checkpoint = this.store.get<{
        updatedAt: number
        syncPending?: boolean
        position: number
      }>(`resume:${progressKey(item.target)}`)
      if (
        checkpoint?.syncPending &&
        Math.abs(checkpoint.position - data.currentTime) > 2
      )
        this.state.syncError =
          'Server resume position is being used. Your offline position remains available in Downloads.'
      const resume = Math.min(
        data.duration,
        Math.max(
          0,
          position ??
            rewindPosition(
              data.currentTime,
              checkpoint ? Date.now() - checkpoint.updatedAt : 0,
              this.daily(),
            ),
        ),
      )
      await this.loadAbsFile(resume)
    }
    await this.mpv.command(['set_property', 'pause', false])
    this.state.status = 'playing'
    this.publish()
    await this.stageNext()
  }
  private transitions() {
    return transitionSchema.parse(
      this.store.get('transitions') ?? { seconds: 0, preserveAlbums: true },
    )
  }
  private async albumIdentity(item: QueueItem) {
    const t = item.target
    if (t.kind === 'local-file' && this.local) {
      const f = await this.local.metadata(t.rootId, t.fileId)
      return f.album
        ? JSON.stringify([t.rootId, f.albumArtist || f.artist, f.album])
        : ''
    }
    if (t.kind === 'music-track') {
      const p = this.provider(t.serverId)
      if (p instanceof Navidrome) {
        const f = await p.track(t.trackId)
        return f.albumId
          ? JSON.stringify([t.serverId, f.albumId])
          : f.album
            ? JSON.stringify([t.serverId, f.artist, f.album])
            : ''
      }
    }
    return ''
  }
  private maybeCrossfade() {
    const current = this.state.queue[this.state.queueIndex],
      next = this.state.queue[this.state.queueIndex + 1],
      prefs = this.transitions()
    if (
      this.closing ||
      this.fadePending ||
      this.fadeTail ||
      this.staged ||
      this.state.status !== 'playing' ||
      this.state.buffering ||
      this.state.duration <= prefs.seconds + 2 ||
      this.state.duration - this.state.position > prefs.seconds ||
      this.state.position >= this.state.duration ||
      !canCrossfade(
        current,
        next,
        prefs,
        this.store.settings().exclusive,
        this.state.repeat,
        this.currentAlbum,
        this.nextAlbum,
      )
    )
      return
    const key = JSON.stringify([this.state.queueIndex, current.target])
    if (this.fadeAttempt === key) return
    this.fadeAttempt = key
    this.fadePending = true
    void this.enqueue(async () => {
      if (
        this.closing ||
        this.reachedEnd ||
        this.state.status !== 'playing' ||
        this.state.queue[this.state.queueIndex] !== current
      )
        return
      const tail = new Mpv()
      try {
        const outgoingDuration = this.state.duration
        const path = await this.mpv.command(['get_property', 'path'])
        if (typeof path !== 'string' || !path) return
        await tail.start(this.store.settings().mpvPath)
        await tail.command([
          'set_property',
          'audio-device',
          this.store.settings().audioDevice,
        ])
        await tail.command(['set_property', 'volume', 0])
        await tail.command(['set_property', 'pause', true])
        const p = this.store.preferences()
        await tail.command(['set_property', 'replaygain', p.replayGain])
        await tail.command([
          'set_property',
          'replaygain-clip',
          !p.preventClipping,
        ])
        const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000],
          filters = p.equalizer.flatMap((gain, i) =>
            gain ? [`equalizer=f=${bands[i]}:t=o:w=1:g=${gain}`] : [],
          )
        await tail.command([
          'set_property',
          'af',
          filters.length ? `lavfi=[${filters.join(',')}]` : '',
        ])
        await tail.load(path, {
          start: String(this.state.position),
          pause: 'yes',
        })
        if (
          this.reachedEnd ||
          this.closing ||
          this.state.position >= this.state.duration - 0.2
        ) {
          await tail.stop()
          return
        }
        await this.mpv.command(['set_property', 'pause', true])
        const exact = await this.mpv.command(['get_property', 'time-pos'])
        if (typeof exact === 'number') this.state.position = exact
        await tail.command(['seek', this.state.position, 'absolute+exact'])
        await tail.command(['set_property', 'volume', this.state.volume])
        await tail.command(['set_property', 'pause', false])
        this.fadeTail = tail
        this.state.crossfading = true
        this.fadeIn = true
        this.fadeFraction = 0
        this.flushStats(true)
        await this.closeSession()
        await this.mpv.command(['stop'])
        this.state.queueIndex++
        this.saveQueue()
        await this.load(next)
        this.fadeIn = false
        const tailPosition = await tail
          .command(['get_property', 'time-pos'])
          .catch(() => undefined)
        let elapsed = 0,
          last = Date.now()
        const duration = Math.max(
          250,
          Math.min(
            prefs.seconds,
            typeof tailPosition === 'number'
              ? outgoingDuration - tailPosition
              : prefs.seconds,
          ) * 1000,
        )
        const tick = async () => {
          if (this.fadeTail !== tail) return
          const now = Date.now()
          if (this.state.status === 'playing' && !this.state.buffering)
            elapsed += now - last
          last = now
          this.fadeFraction = Math.min(1, elapsed / duration)
          const gains = crossfadeGains(this.fadeFraction)
          try {
            await Promise.all([
              tail.command([
                'set_property',
                'pause',
                this.state.status !== 'playing' || !!this.state.buffering,
              ]),
              tail.command([
                'set_property',
                'volume',
                this.state.volume * gains.outgoing,
              ]),
              this.mpv.command([
                'set_property',
                'volume',
                this.state.volume * gains.incoming,
              ]),
            ])
          } catch {
            await this.cancelCrossfade()
            return
          }
          if (this.fadeTail !== tail) return
          if (this.fadeFraction >= 1) {
            await this.enqueue(async () => {
              if (this.fadeTail === tail) {
                await this.cancelCrossfade()
                await this.stageNext()
              }
            })
            return
          }
          this.fadeTimer = setTimeout(() => void tick(), 50)
        }
        void tick()
      } catch {
        await tail.stop()
        await this.cancelCrossfade()
        if ((this.state.status as string) === 'loading')
          this.fail('Crossfade could not load the next song. Retry playback.')
        else {
          this.state.syncError =
            'Crossfade was unavailable; normal track transitions remain available.'
          this.publish()
        }
      } finally {
        if (this.fadeTail !== tail) await tail.stop()
      }
    })
      .finally(() => {
        this.fadePending = false
      })
      .catch(() => {})
  }
  private async cancelCrossfade() {
    if (this.fadeTimer) clearTimeout(this.fadeTimer)
    this.fadeTimer = undefined
    const tail = this.fadeTail
    this.fadeTail = undefined
    this.state.crossfading = false
    this.fadeIn = false
    this.fadeFraction = 1
    if (tail) {
      await tail.stop()
      await this.mpv
        .command(['set_property', 'volume', this.state.volume])
        .catch(() => {})
      this.publish()
    }
  }
  private async clearStaged() {
    this.staged = undefined
    this.gaplessTransition = false
    await this.mpv.command(['playlist-clear']).catch(() => {})
  }
  private async stageNext() {
    if (this.staged || this.reachedEnd || this.fadeIn) return
    if (
      (!this.daily().gapless && !this.transitions().seconds) ||
      !['music-track', 'local-file'].includes(this.target?.kind ?? '') ||
      this.state.repeat === 'one'
    )
      return
    let index = this.state.queueIndex + 1
    if (index >= this.state.queue.length && this.state.repeat === 'all')
      index = 0
    const item = this.state.queue[index]
    if (!item || !['music-track', 'local-file'].includes(item.target.kind))
      return
    try {
      const offline = await this.downloads?.ready(item.target)
      let url: string, duration: number
      if (offline) {
        url = offline.files[0].path
        duration = offline.entry.duration
      } else if (item.target.kind === 'local-file' && this.local) {
        url = await this.local.path(item.target.rootId, item.target.fileId)
        duration = (
          await this.local.metadata(item.target.rootId, item.target.fileId)
        ).duration
      } else if (item.target.kind === 'music-track') {
        const p = this.provider(item.target.serverId)
        if (!(p instanceof Navidrome)) return
        const track = await p.track(item.target.trackId)
        url = p.stream(item.target.trackId)
        duration = track.duration
        item.cover = track.cover
      } else return
      if (this.reachedEnd) return
      if (this.transitions().seconds) {
        this.currentAlbum = await this.albumIdentity(
          this.state.queue[this.state.queueIndex],
        )
        this.nextAlbum = await this.albumIdentity(item)
      }
      if (
        canCrossfade(
          this.state.queue[this.state.queueIndex],
          item,
          this.transitions(),
          this.store.settings().exclusive,
          this.state.repeat,
          this.currentAlbum,
          this.nextAlbum,
        )
      )
        return
      if (!this.daily().gapless) return
      await this.mpv.command(['set_property', 'gapless-audio', 'weak'])
      await this.mpv.command(['set_property', 'prefetch-playlist', true])
      const staged = {
        item,
        index,
        duration,
        url,
        offline,
        started: false,
        loaded: false,
        entryId: undefined as number | undefined,
      }
      this.staged = staged
      await this.mpv.command(['loadfile', url, 'append', -1, { start: '0' }])
      const playlist = (await this.mpv.command([
        'get_property',
        'playlist',
      ])) as { id: number; current?: boolean }[] | undefined
      staged.entryId = playlist?.filter((p) => !p.current).at(-1)?.id
      staged.started =
        staged.entryId !== undefined && staged.entryId === this.lastStartedEntry
      staged.loaded =
        staged.entryId !== undefined && staged.entryId === this.lastLoadedEntry
      if (staged.entryId === undefined) await this.clearStaged()
    } catch {
      await this.clearStaged() /* Normal playback remains available when preparation fails. */
    }
  }
  private async continueGapless() {
    const staged = this.staged
    if (!staged) return false
    this.state.position = this.state.duration
    this.flushStats(true)
    await this.closeSession()
    if (!staged.loaded)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('MPV did not load the next track.'))
        }, 20000)
        const ready = () => {
          if (staged.loaded) {
            cleanup()
            resolve()
          }
        }
        const cleanup = () => {
          clearTimeout(timer)
          this.off('gapless-loaded', ready)
        }
        this.on('gapless-loaded', ready)
        ready()
      })
    this.generation++
    this.staged = undefined
    this.reachedEnd = false
    this.gaplessTransition = false
    this.offline = staged.offline
    this.fileIndex = 0
    this.target = staged.item.target
    this.listened = 0
    this.scrobbled = false
    this.state.queueIndex = staged.index
    this.state.title = staged.item.title
    this.state.subtitle = staged.item.subtitle
    this.state.kind = staged.item.target.kind
    this.state.position = 0
    this.state.duration = staged.duration
    this.state.chapters = []
    this.state.syncError = undefined
    this.state.status = 'playing'
    this.saveQueue()
    this.publish()
    if (
      this.target.kind === 'music-track' &&
      (this.store.get<Preferences>('preferences')?.scrobble ?? true)
    )
      try {
        const p = this.provider(this.target.serverId)
        if (p instanceof Navidrome) await p.scrobble(this.target.trackId, false)
      } catch {
        this.state.syncError = 'Now-playing could not be sent to Navidrome.'
      }
    await this.mpv.command(['playlist-clear'])
    await this.stageNext()
    return true
  }
  async audioPreferences(prefs: Preferences) {
    await this.mpv.command(['set_property', 'replaygain', prefs.replayGain])
    await this.mpv.command([
      'set_property',
      'replaygain-clip',
      !prefs.preventClipping,
    ])
    const bands = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    const filters = prefs.equalizer.flatMap((gain, i) =>
      gain ? [`equalizer=f=${bands[i]}:t=o:w=1:g=${gain}`] : [],
    )
    await this.mpv.command([
      'set_property',
      'af',
      filters.length ? `lavfi=[${filters.join(',')}]` : '',
    ])
  }
  private daily() {
    return {
      ...defaultDailySettings,
      ...this.store.get<DailySettings>('dailySettings'),
    }
  }
  private async loadAbsFile(position: number) {
    if (this.offline) {
      const located = locateTrack(this.offline.files, position)
      this.fileIndex = located.index
      this.switchingFile = true
      try {
        await this.mpv.load(this.offline.files[located.index].path, {
          start: String(located.offset),
        })
        this.state.position = position
      } finally {
        this.switchingFile = false
      }
      return
    }
    if (!this.session) return
    const { provider, data } = this.session
    const located = locateTrack(data.audioTracks, position)
    this.fileIndex = located.index
    const track = data.audioTracks[this.fileIndex]
    this.switchingFile = true
    try {
      await this.mpv.load(provider.streamUrl(track.contentUrl), {
        start: String(located.offset),
        'http-header-fields': `Authorization: ${provider.headers.Authorization}`,
      })
      this.state.position = position
    } finally {
      this.switchingFile = false
    }
  }
  private saveResume() {
    if (
      !this.target ||
      this.state.status === 'loading' ||
      this.state.status === 'idle'
    )
      return
    this.flushStats()
    this.store.set(`resume:${progressKey(this.target)}`, {
      position: this.state.position,
      duration: this.state.duration,
      updatedAt: Date.now(),
      syncPending: !!this.state.syncError,
    })
    if (
      this.offline &&
      (this.target.kind === 'audiobook' ||
        this.target.kind === 'podcast-episode')
    )
      this.store.set(`offlineResume:${progressKey(this.target)}`, {
        position: this.state.position,
        duration: this.state.duration,
        updatedAt: Date.now(),
        syncPending: true,
      })
    const item = this.state.queue[this.state.queueIndex]
    if (item && this.state.position > 0)
      this.store.record?.(item, this.state.position, this.state.duration)
  }
  private flushStats(finished = false) {
    const item = this.state.queue[this.state.queueIndex]
    if (item && (this.statsSeconds > 0 || finished))
      this.store.recordListening?.(item, this.statsSeconds, finished)
    this.statsSeconds = 0
  }
  private async sync(close = false) {
    this.saveResume()
    if (this.session) {
      const elapsed = this.listened
      try {
        await this.session.provider.sync(
          this.session.data.id,
          this.state.position,
          this.state.duration,
          elapsed,
          close,
        )
        this.listened = Math.max(0, this.listened - elapsed)
        this.state.syncError = undefined
      } catch {
        // Do not replay an uncertain listening-time delta: the server may have accepted it.
        this.listened = Math.max(0, this.listened - elapsed)
        this.state.syncError =
          'Progress sync failed. Your position is saved on this device; the server may be behind.'
      }
      this.saveResume()
      this.publish()
    } else if (
      this.target?.kind === 'music-track' &&
      (this.store.get<Preferences>('preferences')?.scrobble ?? true) &&
      !this.scrobbled &&
      this.listened >= Math.min(240, this.state.duration / 2) &&
      this.state.duration > 0
    ) {
      try {
        const p = this.provider(this.target.serverId)
        if (p instanceof Navidrome) await p.scrobble(this.target.trackId, true)
        this.scrobbled = true
      } catch {
        this.state.syncError =
          'Listening history could not be sent to Navidrome.'
        this.publish()
      }
    }
  }
  private async closeSession() {
    await this.sync(true)
    this.session = undefined
  }
  private async ended() {
    if (this.state.status === 'idle' || this.state.status === 'loading') return
    if (await this.continueGapless()) return
    if (this.offline && this.fileIndex + 1 < this.offline.files.length) {
      await this.loadAbsFile(this.offline.files[this.fileIndex + 1].startOffset)
      return
    }
    if (
      this.session &&
      !this.offline &&
      this.fileIndex + 1 < this.session.data.audioTracks.length
    ) {
      const next = this.session.data.audioTracks[this.fileIndex + 1]
      await this.loadAbsFile(next.startOffset)
      return
    }
    this.state.position = this.state.duration
    this.flushStats(true)
    await this.closeSession()
    if (this.state.repeat === 'one') {
      await this.load(this.state.queue[this.state.queueIndex], 0)
      return
    }
    await this.advance(1, true)
  }
  private async advance(delta: number, ended = false) {
    let index = this.state.queueIndex + delta
    if (this.state.repeat === 'all')
      index = (index + this.state.queue.length) % this.state.queue.length
    if (
      ended &&
      delta === 1 &&
      index === this.state.queue.length &&
      this.state.queue.length < 4980 &&
      this.autoplay &&
      ['music-track', 'local-file'].includes(this.target?.kind ?? '')
    ) {
      try {
        const current = this.state.queue[this.state.queueIndex],
          items = await this.autoplay(current)
        if (items.length) {
          this.state.queue.push(
            ...items
              .filter((q) =>
                ['music-track', 'local-file'].includes(q.target.kind),
              )
              .slice(0, 20),
          )
          this.saveQueue()
        }
      } catch {
        this.state.syncError =
          'Autoplay could not find more music. Your queue has ended.'
      }
    }
    if (index < 0 || index >= this.state.queue.length) {
      if (ended) {
        await this.mpv.command(['stop'])
        this.state.status = 'idle'
        this.publish()
      }
      return
    }
    if (this.state.status === 'playing') {
      await this.mpv.command(['set_property', 'pause', true])
      this.state.status = 'paused'
    }
    await this.clearStaged()
    await this.closeSession()
    await this.mpv.command(['stop'])
    this.state.queueIndex = index
    this.saveQueue()
    await this.load(this.state.queue[index])
  }
  seekTo(input: { key: string; queueIndex: number; time: number }) {
    return this.enqueue(async () => {
      const item = this.state.queue[this.state.queueIndex]
      if (
        !item ||
        progressKey(item.target) !== input.key ||
        this.state.queueIndex !== input.queueIndex
      )
        throw new Error('The track changed. Seek again on the current track.')
      if (
        !['playing', 'paused'].includes(this.state.status) ||
        this.state.kind === 'radio' ||
        !this.state.duration
      )
        throw new Error('This audio is not ready to seek.')
      await this.commandInner({ action: 'seek', value: input.time })
    })
  }
  command(command: PlayerCommand) {
    return this.enqueue(() => this.commandInner(command)).catch((error) => {
      if (this.state.status === 'loading')
        this.fail(error instanceof Error ? error.message : 'Playback failed.')
      throw error
    })
  }
  private async commandInner(command: PlayerCommand) {
    if (!['toggle', 'volume', 'sleep'].includes(command.action))
      await this.cancelCrossfade()
    switch (command.action) {
      case 'toggle':
        if (
          this.state.status === 'idle' &&
          this.state.queue[this.state.queueIndex]
        ) {
          const item = this.state.queue[this.state.queueIndex],
            checkpoint = this.store.get<{ position: number; duration: number }>(
              `resume:${progressKey(item.target)}`,
            )
          const resume =
            (item.target.kind === 'music-track' ||
              item.target.kind === 'local-file') &&
            checkpoint &&
            checkpoint.position < checkpoint.duration - 2
              ? checkpoint.position
              : undefined
          await this.load(item, resume)
          break
        }
        if (!['playing', 'paused'].includes(this.state.status)) return
        if (
          this.state.status === 'paused' &&
          (this.target?.kind === 'audiobook' ||
            this.target?.kind === 'podcast-episode')
        ) {
          const resume = rewindPosition(
            this.state.position,
            Date.now() - this.pausedAt,
            this.daily(),
          )
          if (resume !== this.state.position)
            await this.commandInner({ action: 'seek', value: resume })
        }
        if (this.state.status === 'playing') this.pausedAt = Date.now()
        this.state.status =
          this.state.status === 'playing' ? 'paused' : 'playing'
        await this.mpv.command([
          'set_property',
          'pause',
          this.state.status === 'paused',
        ])
        if (this.fadeTail)
          await this.fadeTail.command([
            'set_property',
            'pause',
            this.state.status === 'paused',
          ])
        await this.sync()
        break
      case 'stop': {
        const offlineSpoken =
          this.offline &&
          (this.target?.kind === 'audiobook' ||
            this.target?.kind === 'podcast-episode')
        if (this.state.status === 'playing') {
          await this.mpv
            .command(['set_property', 'pause', true])
            .catch(() => {})
          this.state.status = 'paused'
        }
        await this.clearStaged()
        await this.closeSession()
        await this.mpv.stop()
        this.target = undefined
        this.offline = undefined
        const item = this.state.queue[this.state.queueIndex]
        this.state = {
          ...structuredClone(emptyPlayback),
          title: item?.title ?? emptyPlayback.title,
          subtitle: item?.subtitle ?? emptyPlayback.subtitle,
          kind: item?.target.kind,
          volume: this.state.volume,
          queue: this.state.queue,
          queueIndex: this.state.queueIndex,
          repeat: this.state.repeat,
          shuffle: this.state.shuffle,
          syncError: offlineSpoken
            ? 'Offline position saved. Sync it from Downloads when online.'
            : this.state.syncError,
        }
        this.saveQueue()
        break
      }
      case 'next':
        await this.advance(1)
        break
      case 'previous':
        if (this.state.position > 3)
          await this.commandInner({ action: 'seek', value: 0 })
        else await this.advance(-1)
        break
      case 'seek': {
        const time = Math.min(this.state.duration, Math.max(0, command.value))
        const paused = this.state.status === 'paused'
        if (this.session || this.offline) {
          const located = locateTrack(
            this.offline?.files ?? this.session!.data.audioTracks,
            time,
          )
          if (located.index !== this.fileIndex) {
            await this.loadAbsFile(time)
            await this.mpv.command(['set_property', 'pause', paused])
          } else
            await this.mpv.command(['seek', located.offset, 'absolute+exact'])
        } else await this.mpv.command(['seek', time, 'absolute+exact'])
        this.state.position = time
        await this.sync()
        break
      }
      case 'speed':
        this.state.speed = command.value
        await this.mpv.command(['set_property', 'speed', command.value])
        if (this.target && this.target.kind !== 'music-track')
          this.store.set(`speed:${progressKey(this.target)}`, command.value)
        break
      case 'volume':
        this.state.volume = command.value
        this.store.set('volume', command.value)
        if (this.state.status !== 'idle')
          await this.mpv.command([
            'set_property',
            'volume',
            command.value * this.fadeFraction,
          ])
        break
      case 'sleep':
        this.state.sleepAt =
          command.value > 0 ? Date.now() + command.value * 60000 : undefined
        break
      case 'shuffle': {
        await this.clearStaged()
        this.state.shuffle = !this.state.shuffle
        const upcoming = this.state.queue.slice(this.state.queueIndex + 1)
        if (this.state.shuffle) {
          this.unshuffled = [...upcoming]
          for (let i = upcoming.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]]
          }
        } else if (this.unshuffled)
          upcoming.sort((a, b) => {
            const ai = this.unshuffled!.indexOf(a),
              bi = this.unshuffled!.indexOf(b)
            return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi)
          })
        this.state.queue.splice(
          this.state.queueIndex + 1,
          upcoming.length,
          ...upcoming,
        )
        this.saveQueue()
        await this.stageNext()
        break
      }
      case 'repeat':
        await this.clearStaged()
        this.state.repeat = command.value
        await this.stageNext()
        break
    }
    this.publish()
  }
  edit(
    input: QueueEdit,
    completed?: (
      before: QueueItem[],
      after: QueueItem[],
      index: number,
    ) => void,
  ) {
    return this.enqueue(async () => {
      const before = completed ? structuredClone(this.state.queue) : [],
        beforeIndex = this.state.queueIndex
      await this.cancelCrossfade()
      await this.clearStaged()
      const queue = this.state.queue,
        current = queue[this.state.queueIndex]
      if (input.action === 'append' || input.action === 'next') {
        if (queue.length + input.items.length > 5000)
          throw new Error('The queue can contain up to 5,000 items.')
        queue.splice(
          input.action === 'next' ? this.state.queueIndex + 1 : queue.length,
          0,
          ...input.items,
        )
      } else if (input.action === 'jump') {
        if (!queue[input.index])
          throw new Error('Queue position is out of bounds.')
        if (this.state.status === 'playing') {
          await this.mpv.command(['set_property', 'pause', true])
          this.state.status = 'paused'
        }
        await this.closeSession()
        if (this.target) await this.mpv.command(['stop'])
        this.state.queueIndex = input.index
        await this.load(queue[input.index])
      } else if (input.action === 'move') {
        if (!queue[input.from] || !queue[input.to])
          throw new Error('Queue position is out of bounds.')
        queue.splice(input.to, 0, queue.splice(input.from, 1)[0])
        this.state.queueIndex = current ? queue.indexOf(current) : 0
      } else if (input.action === 'remove') {
        if (!queue[input.index])
          throw new Error('Queue position is out of bounds.')
        if (input.index === this.state.queueIndex && this.target)
          throw new Error(
            'Stop playback before removing the current item, or skip to another item.',
          )
        queue.splice(input.index, 1)
        this.state.queueIndex =
          current && queue.includes(current) ? queue.indexOf(current) : 0
      } else if (input.action === 'clear') {
        await this.commandInner({ action: 'stop' })
        this.state.queue = []
        this.state.queueIndex = 0
      } else if (input.action === 'clear-upcoming')
        queue.splice(this.state.queueIndex + 1)
      else if (input.action === 'restore') {
        const saved = this.store.get<{ queue: QueueItem[]; index: number }>(
          'queue',
        )
        if (saved && !this.target) {
          this.state.queue = saved.queue
          this.state.queueIndex = saved.index
        }
      } else if (input.action === 'sleep-chapter')
        this.state.sleepChapter = input.enabled
      this.saveQueue()
      this.publish()
      if (this.state.status === 'playing' || this.state.status === 'paused')
        await this.stageNext()
      completed?.(before, structuredClone(this.state.queue), beforeIndex)
    }).catch((error) => {
      if (this.state.status === 'loading')
        this.fail(error instanceof Error ? error.message : 'Playback failed.')
      throw error
    })
  }
  acknowledgeOffline(target: PlayTarget) {
    const current = this.state.queue[this.state.queueIndex]
    if (
      current &&
      progressKey(current.target) === progressKey(target) &&
      this.state.status === 'idle'
    ) {
      this.state.syncError = undefined
      this.publish()
    }
  }
  async restoreQueueEdit(
    items: QueueItem[],
    index: number,
    expected?: QueueItem[],
  ) {
    return this.enqueue(async () => {
      if (expected) assertUnchanged(expected, this.state.queue)
      await this.cancelCrossfade()
      const current = this.state.queue[this.state.queueIndex],
        active = ['playing', 'paused'].includes(this.state.status)
      const currentIndex =
        current && active
          ? items.findIndex(
              (q) => progressKey(q.target) === progressKey(current.target),
            )
          : -1
      if (currentIndex >= 0) {
        await this.clearStaged()
        this.state.queue = structuredClone(items)
        this.state.queueIndex = currentIndex
        this.saveQueue()
        await this.stageNext()
        this.publish()
        return
      }
      await this.commandInner({ action: 'stop' })
      this.state.queue = structuredClone(items)
      this.state.queueIndex = Math.min(index, Math.max(0, items.length - 1))
      const item = items[this.state.queueIndex]
      this.state.title = item?.title ?? emptyPlayback.title
      this.state.subtitle = item?.subtitle ?? emptyPlayback.subtitle
      this.state.kind = item?.target.kind
      this.saveQueue()
      this.publish()
    })
  }
  async restoreQueue(items: QueueItem[], index: number) {
    await this.command({ action: 'stop' })
    await this.enqueue(async () => {
      this.state.queue = structuredClone(items)
      this.state.queueIndex = index
      const item = items[index]
      this.state.title = item.title
      this.state.subtitle = item.subtitle
      this.state.kind = item.target.kind
      this.saveQueue()
      this.publish()
    })
  }
  async shutdown() {
    this.closing = true
    await this.cancelCrossfade()
    clearInterval(this.timer)
    this.publisher.cancel()
    await this.enqueue(async () => {
      await this.cancelCrossfade()
      if (this.state.status === 'playing') {
        await this.mpv.command(['set_property', 'pause', true]).catch(() => {})
        this.state.status = 'paused'
      }
      await this.clearStaged()
      await this.closeSession()
      this.saveQueue()
      await this.mpv.stop()
    })
  }
}
