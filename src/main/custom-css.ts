import { open } from 'node:fs/promises'
import { extname } from 'node:path'
import { customCssSchema, MAX_THEME_BYTES } from '../shared/custom-css'
export async function readThemeCss(path: string): Promise<string> {
  if (extname(path).toLowerCase() !== '.css') throw new Error('Choose a local .css file.')
  const file = await open(path, 'r')
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size > MAX_THEME_BYTES) throw new Error('Theme CSS must be a file no larger than 512 KB.')
    const bytes = Buffer.alloc(MAX_THEME_BYTES + 1)
    let size = 0
    while (size < bytes.length) { const read = await file.read(bytes, size, bytes.length - size, null); if (!read.bytesRead) break; size += read.bytesRead }
    if (size > MAX_THEME_BYTES) throw new Error('Theme CSS must be no larger than 512 KB.')
    let text: string
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)) }
    catch { throw new Error('Theme CSS must use UTF-8 encoding.') }
    // TextDecoder consumes a single UTF-8 BOM; embedded BOMs and NULs are invalid.
    const parsed = customCssSchema.safeParse(text)
    if (!parsed.success) throw new Error('Theme CSS must be at most 512 KB and contain no NUL or embedded BOM characters.')
    return parsed.data
  } finally { await file.close() }
}
