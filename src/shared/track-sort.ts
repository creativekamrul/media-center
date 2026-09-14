export const trackSortOptions=[['original','Original order'],['title','Title · A–Z'],['title-desc','Title · Z–A'],['artist','Artist · A–Z'],['album','Album · A–Z'],['added','Date added · newest'],['added-oldest','Date added · oldest'],['year','Release year · newest'],['duration','Duration · longest'],['track','Disc & track number']] as const
export type TrackSort=typeof trackSortOptions[number][0]
type SortableTrack={title:string;artist:string;album:string;duration:number;addedAt?:number;year?:number;discNumber?:number;trackNumber?:number}
const compareText=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'})
// Preserve occurrence indexes: playlists can contain the same track more than once.
export function sortedTrackIndexes(tracks:readonly SortableTrack[],sort:TrackSort){
 const indexes=tracks.map((_,i)=>i)
 const numeric=(a:number|undefined,b:number|undefined,descending=false)=>a===undefined?(b===undefined?0:1):b===undefined?-1:(descending?b-a:a-b)
 return indexes.sort((a,b)=>{
  const x=tracks[a],y=tracks[b]
  const order=sort==='title'?compareText(x.title,y.title):sort==='title-desc'?compareText(y.title,x.title):sort==='artist'?compareText(x.artist,y.artist):sort==='album'?compareText(x.album,y.album):sort==='added'||sort==='added-oldest'?numeric(x.addedAt,y.addedAt,sort==='added'):sort==='year'?numeric(x.year,y.year,true):sort==='duration'?y.duration-x.duration:sort==='track'?numeric(x.discNumber??1,y.discNumber??1)||numeric(x.trackNumber,y.trackNumber):0
  return order||a-b
 })
}
