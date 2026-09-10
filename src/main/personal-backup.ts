import { profileSchema, outputSchema } from './studio-preferences'
import { transitionSchema } from '../shared/studio'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { experienceSchema } from '../shared/experience'
import {
  playingScreenSchema,
  defaultPlayingScreen,
} from '../shared/playing-screen'
import { queueItemSchema, targetSchema, id } from './features'
import type { Store } from './store'
import type { QueueItem } from '../shared/types'
import { progressKey } from '../shared/timeline'
const number = z.number().finite().nonnegative(),
  text = z.string().max(2000)
const word = z
  .object({ time: number, end: number.optional(), text: z.string().max(10000) })
  .strict()
const lyric = z
  .object({
    id: z.number().int().positive(),
    title: text,
    artist: text,
    album: text,
    duration: number,
    status: z.enum(['found', 'missing', 'instrumental']),
    plain: z.string().max(200000),
    lines: z
      .array(
        z
          .object({
            time: number,
            text: z.string().max(10000),
            words: z.array(word).max(10000).optional(),
          })
          .strict(),
      )
      .max(5000),
  })
  .strict()
export const personalExtraSchema = z
  .object({
    experience: experienceSchema,
    playingScreen: playingScreenSchema,
    profiles: z.array(profileSchema).max(30).default([]),
    transitions: transitionSchema.default({ seconds: 0, preserveAlbums: true }),
    profileSpeed: z.number().min(0.5).max(3).default(1),
    outputs: z
      .array(
        z
          .object({ device: z.string().max(2000), value: outputSchema })
          .strict(),
      )
      .max(100)
      .default([]),
    history: z
      .array(
        z
          .object({
            id: z.string().max(10000),
            item: queueItemSchema,
            position: number,
            duration: number,
            playedAt: number,
          })
          .strict(),
      )
      .max(500),
    local: z
      .array(
        z
          .object({
            rootId: id,
            favorites: z.array(id).max(100000),
            playlists: z
              .array(
                z
                  .object({
                    id,
                    name: z.string().min(1).max(200),
                    files: z.array(id).max(5000),
                  })
                  .strict(),
              )
              .max(100),
          })
          .strict(),
      )
      .max(100),
    lyrics: z
      .array(
        z
          .object({
            hash: z.string().regex(/^[a-f0-9]{64}$/),
            key: z.string().max(10000).optional(),
            record: lyric,
          })
          .strict(),
      )
      .max(10000),
    offsets: z
      .array(
        z
          .object({
            key: z.string().max(10000),
            seconds: z.number().finite().min(-30).max(30),
          })
          .strict(),
      )
      .max(10000),
    stats: z
      .array(
        z
          .object({
            day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            target: targetSchema,
            kind: z.enum([
              'music-track',
              'audiobook',
              'podcast-episode',
              'local-file',
              'radio',
            ]),
            title: text,
            subtitle: text,
            seconds: number,
            finished: z.union([z.literal(0), z.literal(1)]),
          })
          .strict()
          .refine((r) => r.kind === r.target.kind),
      )
      .max(200000),
  })
  .strict()
const hash = (key: string) => createHash('sha256').update(key).digest('hex')
export function exportExtra(store: Store) {
  const candidates = new Map(
    store.history().map((h) => {
      const key = progressKey(h.item.target)
      return [hash(key), key]
    }),
  )
  return personalExtraSchema.parse({
    profiles: store.get('listeningProfiles') ?? [],
    transitions: store.get('transitions') ?? {
      seconds: 0,
      preserveAlbums: true,
    },
    profileSpeed: store.get('profileSpeed') ?? 1,
    outputs: store
      .entries('output-profile:')
      .filter((r) => r.value)
      .map((r) => ({ device: r.key.slice(15), value: r.value })),
    experience: store.get('experience') ?? {},
    playingScreen: store.get('playingScreen') ?? defaultPlayingScreen,
    history: store.history(),
    local: (store.get<{ id: string }[]>('localRoots') ?? []).map((r) => ({
      rootId: r.id,
      favorites: store.get('local-favorites:' + r.id) ?? [],
      playlists: store.get('local-playlists:' + r.id) ?? [],
    })),
    lyrics: store
      .entries('lyrics-binding:')
      .filter((r) => r.value)
      .map((r) => ({
        hash: r.key.slice(15),
        key:
          store.get<string>('lyrics-identity:' + r.key.slice(15)) ??
          candidates.get(r.key.slice(15)),
        record: r.value,
      })),
    offsets: store
      .entries('lyric-offset:')
      .map((r) => ({ key: r.key.slice(13), seconds: r.value })),
    stats: store.listeningRows(),
  })
}
export function restoreExtra(
  extra: z.infer<typeof personalExtraSchema>,
  maps: {
    servers: Map<string, string | undefined>
    folders: Map<string, string | undefined>
  },
  remap: (q: QueueItem) => QueueItem,
) {
  const server = (id: string) => {
      const v = maps.servers.get(id)
      if (!v) throw Error('Backup contains an unknown server.')
      return v
    },
    folder = (id: string) => {
      const v = maps.folders.get(id)
      if (!v) throw Error('Backup contains an unknown local source.')
      return v
    }
  const key = (value: string) => {
    const a = z.array(z.string()).min(3).max(4).parse(JSON.parse(value))
    if (a[0] === 'local') a[1] = folder(a[1])
    else a[0] = server(a[0])
    return JSON.stringify(a)
  }
  const values: Record<string, unknown> = {
    listeningProfiles: extra.profiles,
    transitions: extra.transitions,
    profileSpeed: extra.profileSpeed,
    experience: {
      ...extra.experience,
      pins: extra.experience.pins.map((p) => ({
        ...p,
        source: p.kind === 'local' ? folder(p.source) : server(p.source),
      })),
      podcastRules: extra.experience.podcastRules.map((r) => ({
        ...r,
        serverId: server(r.serverId),
      })),
    },
    playingScreen: extra.playingScreen,
    history: extra.history.map((h) => {
      const item = remap(h.item)
      return { ...h, item, id: JSON.stringify(item.target) }
    }),
  }
  for (const o of extra.outputs) values['output-profile:' + o.device] = o.value
  for (const r of extra.local) {
    const root = folder(r.rootId)
    values['local-favorites:' + root] = r.favorites
    values['local-playlists:' + root] = r.playlists
  }
  for (const l of extra.lyrics) {
    const identity = l.key ? key(l.key) : undefined,
      h = identity ? hash(identity) : l.hash
    values['lyrics-binding:' + h] = l.record
    if (identity) values['lyrics-identity:' + h] = identity
  }
  for (const o of extra.offsets)
    values['lyric-offset:' + key(o.key)] = o.seconds
  const stats = extra.stats.map((r) => {
    const target =
      r.target.kind === 'local-file'
        ? { ...r.target, rootId: folder(r.target.rootId) }
        : { ...r.target, serverId: server(r.target.serverId) }
    return { ...r, target }
  })
  return { values, stats }
}
