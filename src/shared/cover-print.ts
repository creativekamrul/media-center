const compositions = [
  'eclipse', 'estuary', 'fold', 'arcade', 'tide', 'strata',
  'mobile', 'fan', 'windows', 'contour', 'weave', 'transit',
] as const

// Both processes know the display title, even for old queues with no cover ID.
// Only the resulting asset name is sent to the image host.
export function coverPrintPath(title: string): string {
  const key = title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
  let hash = 2166136261
  for (const char of key) hash = Math.imul(hash ^ char.codePointAt(0)!, 16777619)
  const index = (hash >>> 0) % (compositions.length * 3)
  return `assets/prints/v1/${compositions[index % compositions.length]}-${Math.floor(index / compositions.length)}.jpg`
}

export function publicCoverPrint(title: string): string {
  return 'https://raw.githubusercontent.com/creativekamrul/media-center/main/src/renderer/public/' + coverPrintPath(title)
}
