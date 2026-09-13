import {z} from 'zod'
import type {Connection, MusicBrowseInput, MusicPage} from '../shared/types'

export const musicQuerySchema = z.object({
  view: z.enum(['albums','newest','recent','frequent','random','songs','artists','playlists','favorites','genres','radio']),
  page: z.number().int().min(0).max(100000), search: z.string().max(500),
  genre: z.string().max(500).optional(), sort: z.string().max(100).optional(), descending: z.boolean().optional()
}).strict()

/** One page per server: no slow full-library scan, and no server can crowd out another. */
export async function browseAllMusic(
  connections: Connection[], query: Omit<MusicBrowseInput, 'serverId'|'libraryId'>,
  browse: (input: MusicBrowseInput) => Promise<MusicPage>
): Promise<MusicPage> {
  const servers = connections.filter(c => c.provider === 'navidrome')
  if (!servers.length) throw new Error('Connect a Navidrome server to browse music.')
  const results = await Promise.allSettled(servers.map(c => browse({...query, serverId:c.id, libraryId:'all'})))
  const pages = results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
  const errors = results.flatMap((r,i) => r.status === 'rejected' ? [`${servers[i].name}: Could not load music. Check the connection and retry.`] : [])
  if (!pages.length) throw new Error(errors.join('\n'))
  const items: MusicPage['items'] = []
  const seen = new Set<string>()
  for (let index=0; index<Math.max(...pages.map(p=>p.items.length)); index++) {
    for (const page of pages) {
      const item = page.items[index]
      if (!item) continue
      const key = JSON.stringify([item.serverId,item.kind,item.id])
      if (!seen.has(key)) {seen.add(key);items.push(item)}
    }
  }
  return {items, page:query.page, hasMore:pages.some(p=>p.hasMore), errors,
    total:!errors.length && pages.every(p=>p.total!==undefined) ? pages.reduce((sum,p)=>sum+p.total!,0) : undefined}
}
