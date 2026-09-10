interface EmbeddedTag {
  text?: string
  syncText?: { text: string; timestamp?: number }[]
  timeStampFormat?: number
  contentType?: number
}
/** ID3 timestamp format 2 is milliseconds; MPEG-frame timestamps are never treated as seconds. */
export function embeddedLyrics(tags: EmbeddedTag[]): string {
  const allowed = tags.filter(
    (t) => t.contentType === undefined || t.contentType === 1,
  )
  const synced = allowed.find(
    (t) =>
      t.timeStampFormat === 2 &&
      t.syncText?.length &&
      t.syncText.every(
        (w) =>
          w.timestamp !== undefined &&
          Number.isFinite(w.timestamp) &&
          w.timestamp >= 0,
      ),
  )
  const stamp = (ms: number) =>
    `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${((ms / 1000) % 60).toFixed(3).padStart(6, '0')}`
  if (synced?.syncText) {
    if (!synced.syncText.some((w) => w.text.includes('\n')))
      return synced.syncText
        .map((w) => `[${stamp(w.timestamp!)}]${w.text}`)
        .join('\n')
    let result = '',
      start = true
    for (const word of synced.syncText) {
      const parts = word.text.split(/\r?\n/)
      for (let i = 0; i < parts.length; i++) {
        if (i) {
          result += '\n'
          start = true
        }
        if (parts[i]) {
          if (start) {
            result += `[${stamp(word.timestamp!)}]`
            start = false
          }
          result += `<${stamp(word.timestamp!)}>${parts[i]}`
        }
      }
    }
    return result.trim()
  }
  const plain = allowed.find((t) => t.text?.trim())
  if (plain?.text) return plain.text
  return (
    allowed
      .find((t) => t.syncText?.length)
      ?.syncText?.map((w) => w.text)
      .join('\n') ?? ''
  )
}
