export interface DtConnection {id:string;name:string;url:string;username:string;version:string}
export interface DtTrack {id:string;serverId:string;title:string;artist:string;artists?:string[];album:string;duration:number;saved:boolean}
export interface DtBrowse {serverId:string;view:'discover'|'search'|'similar'|'library'|'playlist'|'album'|'artist';query?:string;artist?:string;track?:string;playlist?:string;collectionId?:string}
export interface DtCollection {id:string;coverId:string;serverId:string;kind:'album'|'artist';title:string;artist:string}
export interface DtJob {id:string;title:string;artist:string;status:string;progress:number}
export interface DtShelf extends Omit<DtCollection,'kind'> {kind:'album'|'artist'|'playlist';saved:boolean;count?:number;year?:string;releaseType?:string;reason?:string}
export interface DtWorkspace {tracks:DtTrack[];albums:DtShelf[];artists:DtShelf[];playlists:DtShelf[];warnings:string[];description?:string}
export interface DowntifyAPI {
 dtWorkspace(input:{serverId:string;mode:'saved'|'discover'|'artist'|'album';query?:string;id?:string}):Promise<DtWorkspace>
 dtJobs(serverId:string):Promise<DtJob[]>
 dtCollections(input:{serverId:string;kind:'album'|'artist';query:string}):Promise<DtCollection[]>

 dtConnections():Promise<DtConnection[]>
 dtConnect(input:{id?:string;name:string;url:string;username:string;password:string}):Promise<DtConnection>
 dtTest(id:string):Promise<string>
 dtRemove(id:string):Promise<void>
 dtBrowse(input:DtBrowse):Promise<DtTrack[]>
 dtPlaylists(id:string):Promise<string[]>
 dtSave(input:{serverId:string;trackId:string}):Promise<{message:string}>
}
