export function serverUrl(base: string, path: string): URL {
  const root = new URL(base.endsWith('/') ? base : base + '/')
  if (!['http:', 'https:'].includes(root.protocol) || root.username || root.password || root.search || root.hash) throw new Error('Use an HTTP or HTTPS server address without credentials or query parameters.')
  return new URL(path.replace(/^\/+/, ''), root)
}
export async function request(url: URL | string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try { response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000), redirect: 'error' }) }
  catch { throw new Error('Cannot reach the server. Check its address, certificate, and connection. Use the final server URL if it redirects.') }
  if (response.status === 401 || response.status === 403) throw new Error('The server refused access. Check your credentials and library permissions.')
  if (!response.ok) throw new Error(`Server request failed (HTTP ${response.status}).`)
  return response
}
export async function json(url: URL | string, init: RequestInit = {}): Promise<unknown> {
  const response = await request(url, init)
  try { return await response.json() } catch { throw new Error('The server did not return valid JSON. Check the server address.') }
}
export async function coverData(url: URL, headers: Record<string, string> = {}): Promise<string | null> {
  const response = await request(url, { headers })
  const mime = response.headers.get('content-type')?.split(';')[0]
  if (!mime || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return null
  const reader = response.body?.getReader(); if (!reader) return null
  const chunks: Uint8Array[] = []; let size = 0
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 5 * 1024 * 1024) { await reader.cancel(); return null }; chunks.push(value) }
  return `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`
}
