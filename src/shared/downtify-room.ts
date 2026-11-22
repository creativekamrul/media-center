import type {DtTrack,DtWorkspace} from './downtify'
import type {HistoryItem,QueueItem} from './types'

/** Only live catalog identities from this connection can become music shortcuts. */
export function roomRecents(history:HistoryItem[],serverId:string,saved:DtTrack[]):HistoryItem[]{
 const byId=new Map(saved.filter(t=>t.serverId===serverId).map(t=>[t.id,t]))
 return history.flatMap(h=>{
  const target=h.item.target
  if(target.serverId!==serverId)return []
  if(target.kind==='downtify-episode')return [h]
  if(target.kind!=='downtify-track')return []
  const track=byId.get(target.trackId)
  if(!track)return []
  const item:QueueItem={...h.item,title:track.title,subtitle:track.artist,cover:track.id,duration:track.duration,context:track.album}
  return [{...h,item}]
 }).slice(0,6)
}

export function roomFeature(discovery:DtWorkspace,saved:DtWorkspace,history:HistoryItem[],serverId:string):DtTrack|undefined{
 const recent=roomRecents(history,serverId,saved.tracks).find(h=>h.item.target.kind==='downtify-track')
 const target=recent?.item.target
 return (target?.kind==='downtify-track'?saved.tracks.find(t=>t.id===target.trackId):undefined)
  ??discovery.tracks.find(t=>t.serverId===serverId)??saved.tracks.find(t=>t.serverId===serverId)
}
