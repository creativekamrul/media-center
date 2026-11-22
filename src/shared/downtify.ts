export interface DtConnection {id:string;name:string;url:string;username:string;version:string;serverIdentity?:string;authMode?:'session'|'device'}
export interface DtTrack {id:string;serverId:string;title:string;artist:string;artists?:string[];album:string;duration:number;saved:boolean;remoteId?:string;albumId?:string;artistId?:string;explicit?:boolean;revision?:string;genre?:string;releaseDate?:string;codec?:string;sampleRate?:number;bytes?:number}
export interface DtStatus {modern:boolean;serverIdentity?:string;version:string;libraryOnly:boolean;role:string;webAdmin:boolean;webSession?:boolean;capabilities:Record<string,boolean>;syncUpdated?:number;syncError?:string}
export interface DtPlaylist {name:string;manual:boolean;mine:boolean;canEdit:boolean;owner:string;visibility:string;followed:boolean;liked:boolean;tracks:DtTrack[];revision:string;hiddenCount:number;sharedWith:string[];editors:string[]}
export interface DtPlaylistEdit {serverId:string;name:string;action:'create'|'rename'|'order'|'add'|'remove'|'follow'|'unfollow'|'hide'|'show';revision?:string;newName?:string;ids?:string[];occurrence?:number;allowDuplicates?:boolean;keys?:string[]}
export type DtPanel='watches'|'wanted'|'releases'|'shows'|'episodes'|'doctor'|'upgrade'|'replacement'|'hidden'|'likes'|'slskd'
export interface DtPanelData {rows:Record<string,any>[];summary?:Record<string,any>;job?:Record<string,any>|null}
export interface DtManage {serverId:string;action:'watch-add'|'watch-update'|'watch-check'|'watch-stop'|'inventory'|'download-missing'|'release-choice'|'wanted-check'|'wanted-download'|'wanted-stop'|'podcast-resolve'|'podcast-subscribe'|'podcast-update'|'podcast-unsubscribe'|'episode-download'|'episode-played'|'metadata'|'doctor-scan'|'doctor-cancel'|'doctor-preview'|'doctor-merge'|'doctor-nav-repair'|'doctor-duplicates'|'doctor-keep'|'doctor-slskd-scan'|'doctor-slskd-clean'|'doctor-slskd-release'|'upgrade-scan'|'upgrade-start'|'upgrade-resume'|'upgrade-pause'|'upgrade-cancel'|'replace'|'playlist-share'|'track-like';visibility?:'private'|'shared'|'public';users?:string[];editors?:string[];newOnly?:boolean;releaseTypes?:('album'|'single'|'ep')[];id?:string;name?:string;url?:string;kind?:'artist'|'playlist';enabled?:boolean;interval?:number;retention?:number;albumIds?:string[];choice?:'on'|'off'|'';trackIds?:string[];changes?:Record<string,string|number|boolean|null>;revisions?:Record<string,string>;files?:string[];keep?:string;videoId?:string;categories?:('artwork'|'lyrics'|'metadata')[];confirmed?:boolean}
export interface DtBrowse {serverId:string;view:'discover'|'search'|'similar'|'library'|'playlist'|'album'|'artist';query?:string;artist?:string;track?:string;playlist?:string;collectionId?:string}
export interface DtCollection {id:string;coverId:string;serverId:string;kind:'album'|'artist';title:string;artist:string}
export interface DtJob {id:string;title:string;artist:string;status:string;progress:number}
export interface DtShelf extends Omit<DtCollection,'kind'> {kind:'album'|'artist'|'playlist';saved:boolean;count?:number;year?:string;releaseType?:string;reason?:string}
export interface DtWorkspace {tracks:DtTrack[];albums:DtShelf[];artists:DtShelf[];playlists:DtShelf[];warnings:string[];description?:string}
export interface DowntifyAPI {
 onDowntifyChange(listener:()=>void):()=>void
 dtChartOpen(input:{serverId:string;id:string}):Promise<void>
 dtStatus(serverId:string):Promise<DtStatus>
 dtSync(serverId:string):Promise<{count:number;updated:number}>
 dtPair(input:{serverId:string;code:string}):Promise<DtConnection>
 dtPlaylist(input:{serverId:string;name:string}):Promise<DtPlaylist>
 dtPlaylistEdit(input:DtPlaylistEdit):Promise<DtPlaylist>
 dtPanel(input:{serverId:string;panel:DtPanel;id?:string;query?:string}):Promise<DtPanelData>
 dtManage(input:DtManage):Promise<unknown>
 dtReplaceFile(input:{serverId:string;trackId:string}):Promise<{cancelled:boolean;message:string}>
 dtEpisodePlay(input:{serverId:string;showId:string;episodeId:string;choice?:'local'|'server';revision?:string}):Promise<void>
 dtWorkspace(input:{serverId:string;mode:'saved'|'discover'|'charts'|'artist'|'album';query?:string;id?:string}):Promise<DtWorkspace>
 dtJobs(serverId:string):Promise<DtJob[]>
 dtCollections(input:{serverId:string;kind:'album'|'artist';query:string}):Promise<DtCollection[]>

 dtConnections():Promise<DtConnection[]>
 dtConnect(input:{id?:string;name:string;url:string;username:string;password:string;authMode?:'session'|'device';pairCode?:string}):Promise<DtConnection>
 dtTest(id:string):Promise<string>
 dtRemove(id:string):Promise<void>
 dtBrowse(input:DtBrowse):Promise<DtTrack[]>
 dtPlaylists(id:string):Promise<string[]>
 dtSave(input:{serverId:string;trackId:string}):Promise<{message:string}>
}
