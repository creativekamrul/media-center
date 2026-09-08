import { z } from 'zod'
export const MAX_THEME_BYTES = 512 * 1024
// Shared with preference/backup validation: only text is persisted, never a path.
export const customCssSchema = z.string().max(MAX_THEME_BYTES).refine(
  text => !/[\u0000\uFEFF]/.test(text) && new TextEncoder().encode(text).length <= MAX_THEME_BYTES,
  'Theme CSS must be UTF-8 text without NUL or embedded BOM characters, at most 512 KB.'
)
