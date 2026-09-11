import { z } from 'zod'
import { parseLrc } from '../shared/lyrics'
import type { LyricsContent } from './lyrics'

export function textLyrics(text: string): LyricsContent | undefined {
  if (!text.trim() || text.length > 200000) return undefined
  const lines = parseLrc(text)
  if (!lines.some(line => line.text.trim()) && !text.replace(/\[[^\]]*\]/g, '').trim()) return undefined
  return { status: 'found', plain: lines.length ? lines.map(line => line.text).join('\n') : text.trim(), lines }
}

const structured = z.object({
  synced: z.boolean(), offset: z.number().finite().safe().nullish(),
  line: z.array(z.object({ value: z.string().max(200000), start: z.number().finite().nonnegative().safe().nullish() })).max(5000),
})

/** OpenSubsonic songLyrics v1 (Navidrome 0.60.3): start and offset are milliseconds. */
export function navidromeLyrics(raw: unknown): LyricsContent | undefined {
  const list = z.object({ structuredLyrics: z.array(z.unknown()).max(100).nullish() }).safeParse(raw)
  if (!list.success) return undefined
  const candidates: LyricsContent[] = []
  for (const rawLyrics of list.data.structuredLyrics ?? []) {
    const parsed = structured.safeParse(rawLyrics)
    if (!parsed.success) continue
    const lyric = parsed.data, plain = lyric.line.map(line => line.value).join('\n')
    if (!plain.trim() || plain.length > 200000) continue
    const lines = lyric.synced && lyric.line.every(line => line.start != null)
      ? lyric.line.map(line => ({ time: Math.max(0, (line.start! + (lyric.offset ?? 0)) / 1000), text: line.value })).sort((a, b) => a.time - b.time)
      : []
    candidates.push({ status: 'found', plain, lines })
  }
  return candidates.find(candidate => candidate.lines.length) ?? candidates[0]
}

/** Local/server lookup always runs before LRCLIB, including when LRCLIB has cached a match. */
export async function automaticLyrics(options: {
  source: 'embedded' | 'navidrome'
  preferred: () => Promise<LyricsContent | undefined>
  fallback: () => Promise<LyricsContent>
  assertCurrent: () => void
}): Promise<LyricsContent & { source: 'embedded' | 'navidrome' | 'lrclib'; warning?: string }> {
  let preferred: LyricsContent | undefined, warning: string | undefined
  try { preferred = await options.preferred() }
  catch { warning = options.source === 'embedded' ? 'Embedded lyrics could not be read; tried LRCLIB.' : 'Navidrome lyrics are unavailable; tried LRCLIB.' }
  options.assertCurrent()
  if (preferred?.status === 'found' || preferred?.status === 'instrumental') return { ...preferred, source: options.source }
  const content = await options.fallback()
  options.assertCurrent()
  return { ...content, source: 'lrclib', ...(warning ? { warning } : {}) }
}
