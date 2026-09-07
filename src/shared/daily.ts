import type { Chapter, ContinueItem, MusicAlbum, PlayTarget, PodcastEpisode, QueueItem } from './types'

export interface DailySettings { downloadLimitGB: number; smartRewind: boolean; shortRewind: number; longRewind: number; gapless: boolean; dailyGoalMinutes: number }
export const defaultDailySettings: DailySettings = { downloadLimitGB: 20, smartRewind: true, shortRewind: 5, longRewind: 15, gapless: true, dailyGoalMinutes: 30 }
export interface SavedQueue { id: string; name: string; items: QueueItem[]; index: number; position: number; updatedAt: number }
export interface ListeningNote { id: string; item: QueueItem; position: number; title: string; text: string; updatedAt: number }
export interface SmartPlaylist { id: string; name: string; serverId: string; libraryId: string; favorite: boolean; minRating: number; genre: string; artist: string; neverPlayed: boolean; minYear: number; maxYear: number; order: 'title' | 'artist' | 'random'; limit: number }
export interface DownloadEntry { id: string; item: QueueItem; status: 'queued' | 'downloading' | 'paused' | 'ready' | 'error'; bytes: number; total: number; error?: string; createdAt: number; duration: number; chapters: Chapter[] }
export interface DownloadState { entries: DownloadEntry[]; limitBytes: number; usedBytes: number }
export interface InboxEpisode { episode: PodcastEpisode; showTitle: string; item: QueueItem }
export interface InboxPage { items: InboxEpisode[]; total: number; page: number; updatedAt: number; warnings: string[] }
export interface HomeData { continuing: ContinueItem[]; albums: MusicAlbum[]; episodes: InboxEpisode[]; warnings: string[] }
export interface ListeningStats { days: { day: string; seconds: number; music: number; books: number; podcasts: number; local: number }[]; totalSeconds: number; finishedBooks: number; finishedEpisodes: number; top: { title: string; subtitle: string; seconds: number }[] }
export interface BackupPreview { token: string; queues: number; notes: number; plans: number; rules: number; unmatchedServers: number; unmatchedFolders: number }
export interface DiscordSettings { enabled: boolean; applicationId: string; music: boolean; books: boolean; podcasts: boolean; local: boolean; showPaused: boolean; hasLastfmKey: boolean }
export interface DiscordStatus { connected: boolean; message: string; artwork: boolean; artworkMessage?: string }
export interface DailyAPI {
  lyrics(input:{refresh?:boolean}):Promise<import('./lyrics').LyricsResult>
  searchLyrics(input:{key:string;query:string}):Promise<import('./lyrics').LyricsRecord[]>
  bindLyrics(input:{key:string;id:number}):Promise<void>
  clearLyrics(input:{key:string}):Promise<void>
  seekLyric(input:{key:string;time:number}):Promise<void>
  dailySettings(): Promise<DailySettings>
  saveDailySettings(input: DailySettings): Promise<void>
  home(refresh?: boolean): Promise<HomeData>
  podcastInbox(input: { page: number; search: string; status: 'all' | 'unfinished' | 'in-progress' | 'finished'; sort: 'newest' | 'oldest' | 'show'; refresh?: boolean }): Promise<InboxPage>
  inboxStatus(input: { targets: PlayTarget[]; finished: boolean }): Promise<{ updated: number; failed: number }>
  downloadList(): Promise<DownloadState>
  downloadAdd(items: QueueItem[]): Promise<void>
  downloadAction(input: { id: string; action: 'pause' | 'retry' | 'remove' }): Promise<void>
  downloadBatch(input: { ids: string[]; action: 'pause' | 'retry' | 'remove' }): Promise<{ completed: number; failed: string[] }>
  offlineProgressPreview(id: string): Promise<{ token: string; localPosition: number; serverPosition: number; serverUpdatedAt?: number }>
  offlineProgressSync(token: string): Promise<void>
  onDownloads(listener: (state: DownloadState) => void): () => void
  savedQueues(): Promise<SavedQueue[]>
  saveQueue(input: { id?: string; name: string }): Promise<SavedQueue>
  loadQueue(input: { id: string; play: boolean }): Promise<void>
  deleteQueue(id: string): Promise<void>
  notes(): Promise<ListeningNote[]>
  saveNote(input: { id?: string; item: QueueItem; position: number; title: string; text: string }): Promise<ListeningNote>
  deleteNote(id: string): Promise<void>
  smartPlaylists(): Promise<SmartPlaylist[]>
  saveSmartPlaylist(input: Omit<SmartPlaylist, 'id'> & { id?: string }): Promise<SmartPlaylist>
  runSmartPlaylist(id: string): Promise<QueueItem[]>
  deleteSmartPlaylist(id: string): Promise<void>
  exportPlaylist(input: { serverId: string; id: string }): Promise<boolean>
  importPlaylist(input: { serverId: string }): Promise<{ name: string; count: number } | null>
  listeningRecap(range: import('./recap').RecapRange): Promise<import('./recap').ListeningRecap>
  exportRecap(input: {range: import('./recap').RecapRange;png:string}): Promise<boolean>
  miniState(): Promise<{pinned:boolean}>
  onMiniState(listener:(state:{pinned:boolean})=>void):()=>void
  onTheme(listener:(theme:import('./types').Preferences)=>void):()=>void
  listeningStats(): Promise<ListeningStats>
  exportBackup(): Promise<boolean>
  previewBackup(): Promise<BackupPreview | null>
  restoreBackup(token: string): Promise<void>
  miniPlayer(input: { action: 'open' | 'close' | 'main' | 'pin'; pinned?: boolean }): Promise<{pinned:boolean}>
  discordSettings(): Promise<DiscordSettings>
  saveDiscordSettings(input: Omit<DiscordSettings, 'hasLastfmKey'> & { lastfmKey?: string }): Promise<void>
  retryDiscordArtwork(): Promise<void>
  discordStatus(): Promise<DiscordStatus>
  correctDiscordArtwork(input: { artist: string; album: string }): Promise<void>
}
