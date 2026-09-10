import type { QueueItem } from '../shared/types'
export function canCrossfade(
  current: QueueItem | undefined,
  next: QueueItem | undefined,
  settings: { seconds: number; preserveAlbums: boolean },
  exclusive: boolean,
  repeat: string,
  currentAlbum = '',
  nextAlbum = '',
) {
  return (
    !!current &&
    !!next &&
    settings.seconds > 0 &&
    !exclusive &&
    repeat !== 'one' &&
    ['music-track', 'local-file'].includes(current.target.kind) &&
    ['music-track', 'local-file'].includes(next.target.kind) &&
    !(settings.preserveAlbums && currentAlbum && currentAlbum === nextAlbum)
  )
}
export function crossfadeGains(fraction: number) {
  const f = Math.max(0, Math.min(1, fraction))
  return { incoming: f, outgoing: 1 - f }
}
