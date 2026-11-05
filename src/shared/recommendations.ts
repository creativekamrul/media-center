import type {SearchCollection} from './experience'
import type {QueueItem} from './types'
import {progressKey} from './timeline'
export interface Recommendation {item:QueueItem;reason:string;source:string;score:number;heard?:boolean;album?:SearchCollection}
export function rankLibrary(pool:{item:QueueItem;source:string}[],listens:{subtitle:string;seconds:number;day:string;kind:string}[],now=Date.now()):Recommendation[]{
 const affinity=new Map<string,number>()
 for(const row of listens){if(!['music-track','local-file','downtify-track','jellyfin-music'].includes(row.kind)||!row.subtitle.trim()||!Number.isFinite(row.seconds)||row.seconds<=0)continue;const age=Math.max(0,(now-Date.parse(row.day+'T12:00:00'))/86400000);if(!Number.isFinite(age))continue;const key=row.subtitle.trim().toLowerCase();affinity.set(key,(affinity.get(key)??0)+Math.log1p(row.seconds/60)*Math.pow(.5,age/30))}
 const seen=new Set<string>(),artists=new Map<string,number>(),sources=new Map<string,number>()
 const candidates=pool.filter(({item})=>{const key=progressKey(item.target);if(seen.has(key))return false;seen.add(key);return true}).map(({item,source})=>{const weight=affinity.get(item.subtitle.trim().toLowerCase())??0;return {item,source,score:weight,reason:weight?`Because you listen to ${item.subtitle}`:`From ${source}`}}).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title))
 const result:Recommendation[]=[]
 while(candidates.length&&result.length<36){let best=0,bestScore=-Infinity;for(let i=0;i<candidates.length;i++){const c=candidates[i],score=c.score+1-(artists.get(c.item.subtitle.toLowerCase())??0)*3-(sources.get(c.source)??0)*.5;if(score>bestScore){best=i;bestScore=score}}const [c]=candidates.splice(best,1);result.push(c);artists.set(c.item.subtitle.toLowerCase(),(artists.get(c.item.subtitle.toLowerCase())??0)+1);sources.set(c.source,(sources.get(c.source)??0)+1)}
 return result
}
