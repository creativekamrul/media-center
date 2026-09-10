import { z } from 'zod'
import type { QueueItem, Preferences } from './types'
import type { PlayingScreenPreferences } from './playing-screen'
export const transitionSchema = z
  .object({ seconds: z.number().min(0).max(12), preserveAlbums: z.boolean() })
  .strict()
export interface ListeningProfile {
  id: string
  name: string
  preferences: Preferences
  lyrics: PlayingScreenPreferences
  volume: number
  speed: number
}
export interface HealthIssue {
  rootId: string
  fileId: string
  title: string
  issues: string[]
  duplicateGroup?: string
}
export interface Rediscovery {
  title: string
  reason: string
  items: QueueItem[]
}
export interface SeriesShelf {
  id: string
  title: string
  source: string
  books: { item: QueueItem; sequence: string; finished: boolean }[]
}
export interface RecoveryState {
  sources: {
    id: string
    name: string
    provider: string
    connected: boolean
    message: string
  }[]
  pending: number
  playbackError?: string
  syncError?: string
}
export interface PodcastDestination {
  serverId: string
  libraryId: string
  folderId: string
  name: string
}
export interface PodcastFeed {
  title: string
  url: string
  author: string
}
export interface StudioAPI {
  profiles(): Promise<ListeningProfile[]>
  profileSave(name: string): Promise<void>
  profileApply(id: string): Promise<void>
  profileDelete(id: string): Promise<void>
  outputProfile(
    action: 'save' | 'remove' | 'get',
  ): Promise<{ saved: boolean; device: string }>
  transitions(
    input?: z.infer<typeof transitionSchema>,
  ): Promise<z.infer<typeof transitionSchema>>
  libraryHealth(
    rootId: string,
  ): Promise<{ issues: HealthIssue[]; scanned: number; warnings: string[] }>
  rediscover(): Promise<{ shelves: Rediscovery[]; warnings: string[] }>
  seriesShelves(): Promise<{ shelves: SeriesShelf[]; warnings: string[] }>
  recovery(): Promise<RecoveryState>
  exportDiagnostics(): Promise<boolean>
  undoState(): Promise<{ label: string } | null>
  undo(): Promise<void>
  onUndo(listener: (state: { label: string } | null) => void): () => void
  lyricImport(input: {
    key: string
    source: 'file' | 'embedded'
  }): Promise<boolean>
  lyricEdit(input: { key: string; text?: string }): Promise<string>
  playlistArtwork(input: {
    source: string
    id: string
    action: 'get' | 'import' | 'save' | 'remove'
    png?: string
  }): Promise<string | null>
  exportArtwork(png: string): Promise<boolean>
  podcastDestinations(): Promise<PodcastDestination[]>
  podcastDiscover(input: {
    serverId: string
    query: string
  }): Promise<PodcastFeed[]>
  podcastOPML(input: {
    serverId: string
    action: 'import' | 'export'
  }): Promise<PodcastFeed[] | null>
  podcastSubscribe(input: {
    destination: PodcastDestination
    feeds: string[]
  }): Promise<void>
}
