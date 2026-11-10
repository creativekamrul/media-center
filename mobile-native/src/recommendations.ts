export type MixTrack={id:string;title?:string;name?:string;artist?:string;coverArt?:string};
const artistKey=(s?:string)=>(s??'').trim().toLocaleLowerCase();
/** Deterministic daily variety, with artist spacing and no duplicate source IDs. */
export function createMix(candidates:MixTrack[],history:MixTrack[],favorites:MixTrack[],seed:number,mode:'familiar'|'discovery'){
 const artists=new Map<string,number>();history.forEach((t,i)=>{const key=artistKey(t.artist);if(key)artists.set(key,(artists.get(key)??0)+1/(i+1))});
 const played=new Set(history.map(t=>t.id)),liked=new Set(favorites.map(t=>t.id));
 const noise=(id:string)=>{let n=seed;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)/4294967296};
 const unique=[...new Map([...candidates,...favorites,...history].map(t=>[t.id,t])).values()];
 const ranked=unique.map(t=>({t,score:(artists.get(artistKey(t.artist))??0)*3+(liked.has(t.id)?2:0)+(mode==='discovery'?(played.has(t.id)?-5:3):played.has(t.id)?2:0)+noise(t.id)})).sort((a,b)=>b.score-a.score);
 const result:MixTrack[]=[];while(ranked.length&&result.length<30){const last=artistKey(result.at(-1)?.artist);let i=ranked.findIndex(r=>!last||artistKey(r.t.artist)!==last);if(i<0)i=0;result.push(ranked.splice(i,1)[0].t)}return result;
}

export function recommendationReason(track:MixTrack,history:MixTrack[],favorites:MixTrack[]):string {
 if(favorites.some(t=>t.id===track.id))return 'From your favorites';
 if(history.some(t=>t.id===track.id))return 'A track you have played before';
 if(track.artist&&history.some(t=>artistKey(t.artist)===artistKey(track.artist)))return 'More from an artist you listen to';
 return 'An unplayed pick from your available library';
}
