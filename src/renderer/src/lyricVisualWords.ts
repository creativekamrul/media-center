import type {LyricLine, LyricWord} from '../../shared/lyrics'

/** Presentation-only estimates for Flow. Never write these into the lyric record. */
export function lyricVisualWords(line: LyricLine, end: number, flow: boolean): LyricWord[] | undefined {
  if (line.words?.length) return line.words
  if (!flow || !Number.isFinite(end) || end <= line.time || !line.text.trim()) return undefined
  const parts = line.text.match(/\s*\S+\s*/gu) ?? []
  const weights = parts.map(text => Math.max(1, Array.from(text.replace(/[\s\p{M}]/gu, '')).length))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let offset = 0
  return parts.map((text, i) => {
    const time = line.time + (end - line.time) * offset / total
    offset += weights[i]
    return {text, time, end: i === parts.length - 1 ? end : line.time + (end - line.time) * offset / total}
  })
}
