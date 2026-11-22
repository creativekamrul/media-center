import {progressKey} from './timeline'
import type {SearchCollection,SearchGroup} from './experience'
import type {QueueItem} from './types'
import type {JfItem,JfLibrary} from './jellyfin'
import type {PersonResult} from './personal-library'
export type ResultKind='artists'|'albums'|'playlists'|'tracks'|'books'|'podcasts'|'movies'|'tv'|'creators'
export type SearchResult=
 |{kind:'collection';category:'artists'|'albums';key:string;title:string;subtitle:string;source:string;sourceId:string;collection:SearchCollection}
 |{kind:'track';category:'tracks'|'books'|'podcasts';key:string;title:string;subtitle:string;source:string;sourceId:string;item:QueueItem;unavailable:boolean}
 |{kind:'jellyfin';category:'artists'|'albums'|'playlists'|'tracks'|'movies'|'tv';key:string;title:string;subtitle:string;source:string;sourceId:string;item:JfItem;library:JfLibrary&{serverId:string;serverName:string}}
 |{kind:'creator';category:'creators';key:string;title:string;subtitle:string;source:string;sourceId:string;people:PersonResult[]}
export const searchName=(value:string)=>value.trim().normalize('NFKC').toLocaleLowerCase()
export const resultLabels:Record<ResultKind,string>={artists:'Artists',albums:'Albums',playlists:'Playlists',tracks:'Tracks',books:'Audiobooks',podcasts:'Podcasts',movies:'Movies',tv:'Shows & episodes',creators:'Authors & narrators'}
const jfCategories={MusicArtist:'artists',MusicAlbum:'albums',Playlist:'playlists',Audio:'tracks',Movie:'movies',Series:'tv',Season:'tv',Episode:'tv'} as const
export function searchResults(groups:SearchGroup[],jellyfin:{library:JfLibrary&{serverId:string;serverName:string};items:JfItem[]}[],people:PersonResult[]):SearchResult[]{
 const results:SearchResult[]=[]
 for(const g of groups){
  for(const c of g.collections??[])results.push({kind:'collection',category:c.kind==='artist'?'artists':'albums',key:JSON.stringify([c.provider,c.sourceId,c.kind,c.id]),title:c.title,subtitle:c.subtitle,source:g.name,sourceId:g.id,collection:c})
  for(const item of g.items){const target=item.target;const key=progressKey(target);results.push({kind:'track',category:target.kind==='audiobook'?'books':target.kind==='podcast-episode'||target.kind==='downtify-episode'?'podcasts':'tracks',key,title:item.title,subtitle:item.subtitle,source:g.name,sourceId:g.id,item,unavailable:g.unavailable?.includes(progressKey(target))??false})}
 }
 for(const g of jellyfin)for(const item of g.items)results.push({kind:'jellyfin',category:jfCategories[item.kind],key:JSON.stringify(['jellyfin',item.serverId,item.kind,item.id]),title:item.title,subtitle:item.subtitle,source:g.library.serverName+' · '+g.library.name,sourceId:`jellyfin:${g.library.serverId}:${g.library.id}`,item,library:g.library})
 const creators=new Map<string,PersonResult[]>()
 for(const person of people){const key=person.role+':'+searchName(person.name);const group=creators.get(key)??[];if(!group.some(p=>JSON.stringify(p.ref)===JSON.stringify(person.ref)))group.push(person);creators.set(key,group)}
 for(const [key,people]of creators){results.push({kind:'creator',category:'creators',key:'creator:'+key,title:people[0].name,subtitle:people[0].role,source:'Your book libraries',sourceId:'creators',people})}
 return [...new Map(results.map(r=>[r.key,r])).values()]
}
export function rankResults(rows:SearchResult[],query:string):SearchResult[]{
 const term=searchName(query),words=term.split(/\s+/).filter(Boolean)
 const score=(r:SearchResult)=>{const title=searchName(r.title);return (title===term?100:title.startsWith(term)?70:title.includes(term)?45:words.filter(w=>title.includes(w)).length*10)+(r.category==='artists'?4:r.category==='albums'?2:0)}
 return [...rows].sort((a,b)=>score(b)-score(a)||a.title.localeCompare(b.title)||a.key.localeCompare(b.key))
}

export function filterResultSources(rows:SearchResult[],sourceId:string):SearchResult[]{
 if(sourceId==='all')return rows
 return rows.flatMap((row):SearchResult[]=>{
  if(row.sourceId===sourceId)return [row]
  if(row.kind!=='creator')return []
  const people=row.people.filter(p=>p.ref.kind==='playable'&&p.libraryId&&`books:${p.ref.item.target.serverId}:${p.libraryId}`===sourceId)
  return people.length?[{...row,people}]:[]
 })
}
