import type { DailyAPI } from './daily'
export type Provider = 'navidrome' | 'audiobookshelf'
export type Section = 'music' | 'audiobooks' | 'podcasts'
export interface Connection {
  id: string; provider: Provider; name: string; url: string; username: string
}
export interface ConnectionInput extends Omit<Connection, 'id'> { secret: string }
export interface Library { id: string; serverId: string; name: string; kind: Section }
export interface Chapter { id: number; title: string; start: number; end: number }
export interface AudioTrack { index: number; title: string; startOffset: number; duration: number }
interface ItemBase { id: string; serverId: string; libraryId: string; title: string; subtitle: string; description: string; cover?: string }
export interface MusicAlbum extends ItemBase { kind: 'album'; year?: number; trackCount: number; starred?: boolean; rating?: number; genre?: string; duration?: number; playCount?: number; artistId?: string }
export interface MusicTrack { kind: 'music-track'; id: string; serverId: string; title: string; artist: string; album: string; duration: number; codec?: string; bitRate?: number; sampleRate?: number; bitDepth?: number; starred?: boolean; rating?: number; cover?: string; albumId?: string; artistId?: string; genre?: string; year?: number; trackNumber?: number; discNumber?: number; playCount?: number }
export interface Progress { status: 'unplayed' | 'in-progress' | 'finished'; position: number; duration: number; fraction: number; updatedAt?: number; finishedAt?: number }
export interface Audiobook extends ItemBase { kind: 'audiobook'; authors: string[]; narrators: string[]; series: string[]; duration: number; chapters: Chapter[]; tracks: AudioTrack[]; progress?: Progress }
export interface PodcastEpisode { kind: 'podcast-episode'; id: string; showId: string; serverId: string; title: string; description: string; publishedAt?: number; duration: number; downloaded: boolean; season?: string; episode?: string; filename?: string; subtitle?: string; progress?: Progress }
export interface PodcastShow extends ItemBase { kind: 'podcast-show'; author: string; episodeCount: number; episodes: PodcastEpisode[] }
export type LibraryItem = MusicAlbum | Audiobook | PodcastShow
export type ItemDetail = { kind: 'album'; item: MusicAlbum; tracks: MusicTrack[] } | { kind: 'audiobook'; item: Audiobook } | { kind: 'podcast-show'; item: PodcastShow }
export interface Page { items: LibraryItem[]; total: number; page: number; hasMore: boolean }
// A show is never playable. Episode playback always includes its parent show ID.
export type PlayTarget = { kind: 'music-track'; serverId: string; trackId: string } | { kind: 'audiobook'; serverId: string; bookId: string } | { kind: 'podcast-episode'; serverId: string; showId: string; episodeId: string } | { kind: 'local-file'; serverId: 'local'; rootId: string; fileId: string } | { kind: 'radio'; serverId: string; stationId: string }
export type SpokenTarget = Extract<PlayTarget, { kind: 'audiobook' | 'podcast-episode' }>
export interface QueueItem { target: PlayTarget; title: string; subtitle: string; cover?: string; context?: string; duration?: number }
export interface PlaybackState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; title: string; subtitle: string;
  kind?: PlayTarget['kind']; position: number; duration: number; speed: number; volume: number;
  chapters: Chapter[]; queue: QueueItem[]; queueIndex: number; error?: string; syncError?: string;
  sleepAt?: number; codec?: string; sampleRate?: number; repeat: 'off' | 'all' | 'one'; shuffle: boolean; buffering?: boolean; sleepChapter?: boolean
}
export interface Settings { mpvPath: string; exclusive: boolean; audioDevice: string; connections: Connection[] }
export type PlayerCommand = { action: 'toggle' | 'next' | 'previous' | 'stop' | 'shuffle' } | { action: 'seek' | 'speed' | 'volume' | 'sleep'; value: number } | { action: 'repeat'; value: 'off' | 'all' | 'one' }
export interface AudioDevice { name: string; description: string }
export interface UpdateState {
  currentVersion: string
  status: 'unavailable' | 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'installing' | 'error'
  version?: string; percent?: number; transferred?: number; total?: number; checkedAt?: number; error?: string
}
export interface DesktopAPI extends DailyAPI {
  updateState(): Promise<UpdateState>
  checkForUpdates(): Promise<UpdateState>
  downloadUpdate(): Promise<UpdateState>
  installUpdate(): Promise<UpdateState>
  onUpdate(listener: (state: UpdateState) => void): () => void
  settings(): Promise<Settings>
  saveConnection(input: ConnectionInput): Promise<Connection>
  removeConnection(id: string): Promise<void>
  chooseMpv(): Promise<string | null>
  setAudio(input: { exclusive: boolean; audioDevice: string }): Promise<void>
  audioDevices(): Promise<AudioDevice[]>
  libraries(): Promise<{ libraries: Library[]; errors: string[] }>
  browse(input: { library: Library; page: number; search: string }): Promise<Page>
  detail(input: { serverId: string; itemId: string }): Promise<ItemDetail>
  cover(input: { serverId: string; itemId: string }): Promise<string | null>
  play(input: { queue: QueueItem[]; index: number; position?: number }): Promise<void>
  command(command: PlayerCommand): Promise<void>
  seekPlayback(input: { key: string; queueIndex: number; time: number }): Promise<void>
  playingScreenPreferences(): Promise<import('./playing-screen').PlayingScreenPreferences>
  savePlayingScreenPreferences(input: import('./playing-screen').PlayingScreenPreferences): Promise<void>
  playback(): Promise<PlaybackState>
  onPlayback(listener: (state: PlaybackState) => void): () => void
  musicBrowse(input: MusicBrowseInput): Promise<MusicPage>
  musicDetail(input: { serverId: string; kind: 'album' | 'artist' | 'playlist'; id: string }): Promise<MusicDetail>
  musicFavorite(input: { serverId: string; kind: 'song' | 'album' | 'artist'; id: string; favorite: boolean }): Promise<void>
  musicRate(input: { serverId: string; id: string; rating: number }): Promise<void>
  playlistSave(input: { serverId: string; id?: string; name: string; comment: string; public: boolean; songIds?: string[] }): Promise<MusicPlaylist>
  playlistDelete(input: { serverId: string; id: string }): Promise<void>
  spokenBrowse(input: SpokenBrowseInput): Promise<Page>
  spokenProgress(input: { target: SpokenTarget; action: 'finished' | 'unfinished' | 'reset' }): Promise<void>
  spokenContinue(input: { serverId: string; libraryId?: string }): Promise<ContinueItem[]>
  spokenBookmarks(input: { serverId: string; bookId: string }): Promise<Bookmark[]>
  spokenBookmarkSave(input: { serverId: string; bookId: string; time: number; title: string; update?: boolean }): Promise<void>
  spokenBookmarkDelete(input: { serverId: string; bookId: string; time: number }): Promise<void>
  queueEdit(input: QueueEdit): Promise<void>
  localRoots(): Promise<LocalRoot[]>
  localAdd(): Promise<LocalRoot | null>
  localRemove(id: string): Promise<void>
  localBrowse(input: { rootId: string; folder: string }): Promise<LocalFolder>
  localCover(input: { rootId: string; fileId: string }): Promise<string | null>
  laterList(): Promise<ListenLater[]>
  laterSave(input: { item: QueueItem; due: string; note: string; id?: string; done?: boolean }): Promise<ListenLater>
  laterDelete(id: string): Promise<void>
  history(): Promise<HistoryItem[]>
  preferences(): Promise<Preferences>
  savePreferences(input: Preferences): Promise<void>
}
export const emptyPlayback: PlaybackState = { status: 'idle', title: 'Nothing playing yet', subtitle: 'Find something worth listening to', position: 0, duration: 0, speed: 1, volume: 80, chapters: [], queue: [], queueIndex: 0, repeat: 'off', shuffle: false }

export type MusicView = 'albums' | 'newest' | 'recent' | 'frequent' | 'random' | 'songs' | 'artists' | 'playlists' | 'favorites' | 'genres' | 'radio'
export interface MusicArtist { kind: 'artist'; id: string; serverId: string; title: string; albumCount: number; starred?: boolean; cover?: string; description?: string }
export interface MusicPlaylist { kind: 'playlist'; readonly?: boolean; id: string; serverId: string; title: string; comment: string; public: boolean; owner?: string; songCount: number; duration: number; cover?: string }
export interface MusicGenre { kind: 'genre'; id: string; title: string; songCount: number; albumCount: number }
export interface RadioStation { kind: 'radio'; id: string; serverId: string; title: string; homepage?: string }
export type MusicEntity = MusicAlbum | MusicTrack | MusicArtist | MusicPlaylist | MusicGenre | RadioStation
export interface MusicBrowseInput { serverId: string; libraryId: string; view: MusicView; page: number; search: string; genre?: string; sort?: string; descending?: boolean }
export interface MusicPage { items: MusicEntity[]; page: number; hasMore: boolean; total?: number }
export interface MusicDetail { kind: 'album' | 'artist' | 'playlist'; title: string; subtitle: string; cover?: string; tracks: MusicTrack[]; albums: MusicAlbum[]; playlist?: MusicPlaylist; artist?: MusicArtist; album?: MusicAlbum }
export interface SpokenBrowseInput { library: Library; page: number; search: string; sort: string; descending: boolean; status: 'all' | 'unplayed' | 'in-progress' | 'unfinished' | 'finished' }
export interface ContinueItem { item: QueueItem; progress: Progress; libraryId: string }
export interface Bookmark { time: number; title: string; createdAt?: number }
export type QueueEdit = { action: 'append' | 'next'; items: QueueItem[] } | { action: 'remove' | 'jump'; index: number } | { action: 'move'; from: number; to: number } | { action: 'clear' | 'clear-upcoming' | 'restore' } | { action: 'sleep-chapter'; enabled: boolean }
export interface LocalRoot { id: string; name: string; path: string }
export interface LocalFile { id: string; name: string; title: string; artist: string; album: string; duration: number; size: number; modified: number; codec?: string; sampleRate?: number; bitDepth?: number; bitRate?: number; trackNumber?: number; year?: number; hasCover: boolean; error?: string }
export interface LocalFolder { rootId: string; folder: string; folders: { id: string; name: string }[]; files: LocalFile[]; warnings: string[] }
export interface ListenLater { id: string; item: QueueItem; due: string; note: string; done: boolean; createdAt: number }
export interface HistoryItem { id: string; item: QueueItem; position: number; duration: number; playedAt: number }
export interface Preferences { replayGain: 'no' | 'track' | 'album'; preventClipping: boolean; equalizer: number[]; closeToTray: boolean; theme: import('./themes').ThemeId; appearance?: import('./appearance').Appearance; scrobble: boolean }
export const defaultPreferences: Preferences = { replayGain: 'no', preventClipping: true, equalizer: [0,0,0,0,0,0,0,0,0,0], closeToTray: false, theme: 'forest', scrobble: true }
