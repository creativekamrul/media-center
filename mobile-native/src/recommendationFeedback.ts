export type Feedback={tracks:string[];artists:string[]};
const normalized=(s:string)=>s.trim().toLocaleLowerCase();
export function readFeedback(raw:unknown):Feedback{const r=raw as Partial<Feedback>|undefined;return {tracks:Array.isArray(r?.tracks)?r.tracks.filter(x=>typeof x==='string').slice(0,10000):[],artists:Array.isArray(r?.artists)?r.artists.filter(x=>typeof x==='string').map(normalized).slice(0,1000):[]}}
export const feedbackKey=(account:string,id:string)=>JSON.stringify([account,id]);
export function allowedRecommendation(f:Feedback,account:string,track:{id:string;artist?:string}){return !f.tracks.includes(feedbackKey(account,track.id))&&!f.artists.includes(normalized(track.artist??''))}
export function hideRecommendation(f:Feedback,account:string,track:{id:string;artist?:string},artist=false):Feedback{return artist&&track.artist?{...f,artists:[...new Set([...f.artists,normalized(track.artist)])]}:{...f,tracks:[...new Set([...f.tracks,feedbackKey(account,track.id)])]}}
