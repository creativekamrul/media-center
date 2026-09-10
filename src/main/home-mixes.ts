import type {QueueItem} from '../shared/types'
import type {HomeMix} from '../shared/daily'
import {progressKey} from '../shared/timeline'

// Only music participates. Identity includes source, so equal titles never merge files.
export function musicMixItems(items:QueueItem[],limit=50):QueueItem[] {
 return [...new Map(items.filter(q=>q.target.kind==='music-track'||q.target.kind==='local-file').map(q=>[progressKey(q.target),q])).values()].slice(0,limit)
}
export function homeMixes(favorites:QueueItem[],history:QueueItem[],albums:QueueItem[]):HomeMix[] {
 const mixes:HomeMix[]=[]
 const add=(id:string,title:string,subtitle:string,items:QueueItem[],minimum=1)=>{
  const unique=musicMixItems(items);if(unique.length>=minimum)mixes.push({id,title,subtitle,items:unique})
 }
 add('favorites','Your favorites','A mix of tracks you have starred',favorites)
 add('rotation','Back in rotation','Music from your recent listening',history.filter(q=>q.target.kind==='music-track'))
 add('local','From your folders','Your recently played local music',history.filter(q=>q.target.kind==='local-file'))
 add('album-sampler','Album sampler','Tracks from up to four recently played albums',albums)
 const pool=musicMixItems([...favorites,...history,...albums],1000)
 add('together','All together','Favorites, recent music and your album sampler',pool,2)
 add('short','Short & sweet','A quick listen: tracks up to four minutes',pool.filter(q=>q.duration!==undefined&&q.duration>0&&q.duration<=240),2)
 add('long','Take your time','Room to settle in: tracks seven minutes and longer',pool.filter(q=>(q.duration??0)>=420),2)
 const artists=new Map<string,{name:string;items:QueueItem[]}>()
 for(const q of pool){const name=q.subtitle.trim();if(!name||name.toLowerCase()==='unknown artist')continue;const key=name.toLocaleLowerCase();const group=artists.get(key)??{name,items:[]};group.items.push(q);artists.set(key,group)}
 for(const [key,group] of [...artists].filter(([,g])=>g.items.length>=3).sort((a,b)=>b[1].items.length-a[1].items.length||a[0].localeCompare(b[0])).slice(0,3))add('artist:'+key,group.name+' mix','An artist spotlight from your available music',group.items,3)
 return mixes
}
