import type { AudioTrack, PlayTarget } from './types'

export function progressKey(target: PlayTarget): string {
  switch (target.kind) {
    case 'music-track': return JSON.stringify([target.serverId, target.kind, target.trackId])
    case 'audiobook': return JSON.stringify([target.serverId, target.kind, target.bookId])
    case 'podcast-episode': return JSON.stringify([target.serverId, target.kind, target.showId, target.episodeId])
    case 'local-file': return JSON.stringify(['local', target.rootId, target.fileId])
    case 'radio': return JSON.stringify([target.serverId, 'radio', target.stationId])
  }
}
export function locateTrack(tracks: AudioTrack[], position: number): { index: number; offset: number } {
  if (!tracks.length) throw new Error('This item has no playable audio files.')
  const ordered = [...tracks].sort((a, b) => a.startOffset - b.startOffset)
  const time = Math.max(0, position)
  const track = ordered.find((t, i) => time < t.startOffset + t.duration || i === ordered.length - 1)!
  return { index: tracks.indexOf(track), offset: Math.min(track.duration, Math.max(0, time - track.startOffset)) }
}
