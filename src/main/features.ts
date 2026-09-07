import { dialog, type BrowserWindow } from 'electron'
import { z } from 'zod'
import { Store } from './store'
import { Player } from './player'
import { LocalFiles } from './local'
import { Navidrome } from './providers/navidrome'
import { Audiobookshelf } from './providers/audiobookshelf'
import { progressKey } from '../shared/timeline'
export const id = z.string().min(1).max(2048)
export const spokenTarget = z.discriminatedUnion('kind', [z.object({ kind: z.literal('audiobook'), serverId: id, bookId: id }).strict(), z.object({ kind: z.literal('podcast-episode'), serverId: id, showId: id, episodeId: id }).strict()])
export const targetSchema = z.discriminatedUnion('kind', [...spokenTarget.options, z.object({ kind: z.literal('music-track'), serverId: id, trackId: id }).strict(), z.object({ kind: z.literal('local-file'), serverId: z.literal('local'), rootId: id, fileId: id }).strict(), z.object({ kind: z.literal('radio'), serverId: id, stationId: id }).strict()])
export const queueItemSchema = z.object({ target: targetSchema, title: z.string().max(2000), subtitle: z.string().max(2000), cover: z.string().max(2048).optional(), context: z.string().max(2000).optional(), duration: z.number().finite().nonnegative().optional() }).strict()
export const preferenceSchema = z.object({ replayGain: z.enum(['no', 'track', 'album']), preventClipping: z.boolean(), equalizer: z.array(z.number().finite().min(-12).max(12)).length(10), closeToTray: z.boolean(), theme: z.enum(['forest', 'charcoal']), scrobble: z.boolean() }).strict()
export type Handle = <T extends z.ZodTypeAny>(channel: string, schema: T, action: (input: z.infer<T>) => unknown) => void
export function registerFeatures(handle: Handle, store: Store, player: Player, local: LocalFiles, provider: (id: string) => Navidrome | Audiobookshelf, window: () => BrowserWindow) {
  const inflight=new Map<string,Promise<unknown>>()
  const cached = async <T>(key:string,work:()=>Promise<T>):Promise<T> => {const cache=store.cache<T>(key);if(cache && Date.now()-cache.updated<30000)return cache.value;if(inflight.has(key))return inflight.get(key) as Promise<T>;const promise=work().then(value=>{store.cacheSet(key,value);return value}).finally(()=>inflight.delete(key));inflight.set(key,promise);return promise}
  const nav = (id: string) => { const p = provider(id); if (!(p instanceof Navidrome)) throw new Error('Choose a Navidrome server.'); return p }
  const abs = (id: string) => { const p = provider(id); if (!(p instanceof Audiobookshelf)) throw new Error('Choose an Audiobookshelf server.'); return p }
  handle('music:browse', z.object({ serverId: id, libraryId: id, view: z.enum(['albums','newest','recent','frequent','random','songs','artists','playlists','favorites','genres','radio']), page: z.number().int().min(0).max(100000), search: z.string().max(500), genre: z.string().max(500).optional(), sort: z.string().max(100).optional(), descending: z.boolean().optional() }).strict(), i => cached(`music:${JSON.stringify(i)}`,()=>nav(i.serverId).catalog(i)))
  handle('music:detail', z.object({ serverId: id, kind: z.enum(['album','artist','playlist']), id }).strict(), i => nav(i.serverId).collection(i.kind, i.id))
  handle('music:favorite', z.object({ serverId: id, kind: z.enum(['song','album','artist']), id, favorite: z.boolean() }).strict(), async i => {await nav(i.serverId).favorite(i.kind,i.id,i.favorite);store.cacheClear()})
  handle('music:rate', z.object({ serverId: id, id, rating: z.number().int().min(0).max(5) }).strict(), async i=>{await nav(i.serverId).rate(i.id,i.rating);store.cacheClear()})
  handle('playlist:save', z.object({ serverId: id, id: id.optional(), name: z.string().trim().min(1).max(200), comment: z.string().max(5000), public: z.boolean(), songIds: z.array(id).max(5000).optional() }).strict(), async i=>{const result=await nav(i.serverId).savePlaylist(i);store.cacheClear();return result})
  handle('playlist:delete', z.object({ serverId: id, id }).strict(), async i=>{await nav(i.serverId).deletePlaylist(i.id);store.cacheClear()})
  handle('spoken:browse', z.object({ library: z.object({ id, serverId: id, name: z.string(), kind: z.enum(['audiobooks','podcasts']) }), page: z.number().int().min(0).max(100000), search: z.string().max(500), sort: z.string().max(100), descending: z.boolean(), status: z.enum(['all','unplayed','in-progress','unfinished','finished']) }).strict(), i => abs(i.library.serverId).catalog(i))
  handle('spoken:progress', z.object({ target: spokenTarget, action: z.enum(['finished','unfinished','reset']) }).strict(), async i => {
    const current = player.state.queue[player.state.queueIndex]
    if (current && progressKey(current.target) === progressKey(i.target) && player.state.status !== 'idle') await player.command({ action: 'stop' })
    await abs(i.target.serverId).setProgress(i.target, i.action); store.cacheClear('podcast-inbox')
  })
  handle('spoken:continue', z.object({ serverId: id, libraryId: id.optional() }).strict(), i => abs(i.serverId).continuing(i.libraryId))
  handle('spoken:bookmarks', z.object({ serverId: id, bookId: id }).strict(), i => abs(i.serverId).bookmarks(i.bookId))
  handle('spoken:bookmark-save', z.object({ serverId: id, bookId: id, time: z.number().finite().nonnegative(), title: z.string().trim().min(1).max(1000), update: z.boolean().optional() }).strict(), i => abs(i.serverId).bookmark(i.bookId, i.time, i.title, i.update))
  handle('spoken:bookmark-delete', z.object({ serverId: id, bookId: id, time: z.number().finite().nonnegative() }).strict(), i => abs(i.serverId).bookmark(i.bookId, i.time))
  const index = z.number().int().min(0).max(4999)
  handle('queue:edit', z.union([z.object({ action: z.enum(['append','next']), items: z.array(queueItemSchema).min(1).max(5000) }).strict(), z.object({ action: z.enum(['remove','jump']), index }).strict(), z.object({ action: z.literal('move'), from: index, to: index }).strict(), z.object({ action: z.enum(['clear','clear-upcoming','restore']) }).strict(), z.object({ action: z.literal('sleep-chapter'), enabled: z.boolean() }).strict()]), i => player.edit(i))
  handle('local:roots', z.undefined(), () => local.roots())
  handle('local:add', z.undefined(), async () => { const result = await dialog.showOpenDialog(window(), { title: 'Choose a local audio folder', properties: ['openDirectory'] }); return result.canceled || !result.filePaths[0] ? null : local.add(result.filePaths[0]) })
  handle('local:remove', id, async id => { if (player.state.queue.some(q => q.target.kind === 'local-file' && q.target.rootId === id)) await player.command({ action: 'stop' }); local.remove(id) })
  handle('local:browse', z.object({ rootId: id, folder: z.string().max(4096) }).strict(), i => local.browse(i.rootId, i.folder))
  handle('local:cover', z.object({ rootId: id, fileId: id }).strict(), i => local.cover(i.rootId, i.fileId))
  handle('later:list', z.undefined(), () => store.laterList())
  handle('later:save', z.object({ item: queueItemSchema, due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(5000), id: id.optional(), done: z.boolean().optional() }).strict(), i => store.laterSave(i))
  handle('later:delete', id, id => store.laterDelete(id))
  handle('history:list', z.undefined(), () => store.history())
  handle('preferences:get', z.undefined(), () => store.preferences())
  handle('preferences:save', preferenceSchema, async i => { if (player.state.status === 'playing' || player.state.status === 'paused') await player.audioPreferences(i); store.set('preferences', i) })
}
