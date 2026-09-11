import type {QueueItem} from '../../shared/types'
export interface ArtistRequest{query:string;serverId?:string;artistId?:string;rootId?:string}
export function openArtist(request:ArtistRequest){if(request.query.trim())window.dispatchEvent(new CustomEvent('open-artist',{detail:request}))}
export function ArtistLink({item,name}:{item?:QueueItem;name:string}){
 const target=item?.target
 return name.trim()&&(target?.kind==='music-track'||target?.kind==='local-file')?<button className="artist-link" title={`Explore artist ${name}`} onClick={()=>openArtist({query:name,...(target.kind==='music-track'?{serverId:target.serverId}:{rootId:target.rootId})})}>{name}</button>:<>{name}</>
}
