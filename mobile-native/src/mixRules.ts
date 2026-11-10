export type MixCandidate={account:string;id:string;title?:string;artist?:string;genre?:string;genres?:string[];year?:number;duration?:number;coverArt?:string};
export type MixRecipe={id:string;name:string;sources:string[];genres:string[];artists:string[];yearFrom?:number;yearTo?:number;maxMinutes?:number;count:number;familiarity:'balanced'|'familiar'|'unheard';refresh:'manual'|'daily'|'weekly';seed:number};
export const mediaKey=(t:{account:string;id:string})=>JSON.stringify([t.account,t.id]);
const key=(v:string)=>v.trim().toLocaleLowerCase();
export function validateRecipe(r:MixRecipe):MixRecipe{
 if(!r||typeof r!=='object'||typeof r.id!=='string'||r.id.length>120||typeof r.name!=='string'||![r.sources,r.genres,r.artists].every(a=>Array.isArray(a)&&a.length<=100&&a.every(v=>typeof v==='string'&&v.length<=512)))throw Error('Invalid mix rules.');
 if(!r.name.trim()||r.name.length>80||!r.sources.length||!Number.isInteger(r.count)||r.count<1||r.count>500)throw Error('Choose a name, at least one source and 1–500 tracks.');
 if(!['balanced','familiar','unheard'].includes(r.familiarity)||!['manual','daily','weekly'].includes(r.refresh)||!Number.isFinite(r.seed))throw Error('Invalid mix settings.');
 for(const y of [r.yearFrom,r.yearTo])if(y!==undefined&&(!Number.isInteger(y)||y<1||y>9999))throw Error('Enter a valid release year.');
 if(r.yearFrom!==undefined&&r.yearTo!==undefined&&r.yearFrom>r.yearTo)throw Error('The first year must come before the last year.');
 if(r.maxMinutes!==undefined&&(!Number.isFinite(r.maxMinutes)||r.maxMinutes<1||r.maxMinutes>1440))throw Error('Choose a duration between 1 and 1440 minutes.');
 return {...r,name:r.name.trim(),sources:[...new Set(r.sources)],genres:r.genres.map(key).filter(Boolean),artists:r.artists.map(key).filter(Boolean)};
}
export function readMixRecipes(raw:unknown):MixRecipe[]{
 if(!Array.isArray(raw))return [];const seen=new Set<string>(),out:MixRecipe[]=[];
 for(const value of raw.slice(0,100)){try{const r=validateRecipe(value as MixRecipe);if(r.id&&!seen.has(r.id)){seen.add(r.id);out.push(r)}}catch{/* Preserve valid recipes when an older entry is malformed. */}}return out;
}
export function mixPeriod(recipe:Pick<MixRecipe,'refresh'>,now=Date.now()){return recipe.refresh==='manual'?0:Math.floor(now/(86400000*(recipe.refresh==='weekly'?7:1)))}
export function buildRuleMix(input:MixCandidate[],recipe:MixRecipe,history:MixCandidate[],likes:string[],now=Date.now()){
 const r=validateRecipe(recipe),played=new Set(history.map(mediaKey)),favorite=new Set(likes),artistScores=new Map<string,number>();history.forEach((t,i)=>artistScores.set(key(t.artist??''),(artistScores.get(key(t.artist??''))??0)+1/(i+1)));
 const seed=r.seed+mixPeriod(r,now);
 const noise=(id:string)=>{let h=seed;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296};
 const ranked=[...new Map(input.map(t=>[mediaKey(t),t])).values()].filter(t=>r.sources.includes(t.account)).filter(t=>!r.genres.length||[...(t.genres??[]),t.genre??''].some(g=>r.genres.includes(key(g)))).filter(t=>!r.artists.length||r.artists.some(a=>key(t.artist??'').includes(a))).filter(t=>(r.yearFrom===undefined||(!!t.year&&t.year>=r.yearFrom))&&(r.yearTo===undefined||(!!t.year&&t.year<=r.yearTo))).filter(t=>r.familiarity!=='unheard'||!played.has(mediaKey(t))).map(t=>({t,score:noise(mediaKey(t))+(r.familiarity==='familiar'?(played.has(mediaKey(t))?4:0)+(favorite.has(t.account+':'+t.id)?3:0)+(artistScores.get(key(t.artist??''))??0):r.familiarity==='balanced'?(favorite.has(t.account+':'+t.id)?.5:0)+Math.min(.5,artistScores.get(key(t.artist??''))??0):0)})).sort((a,b)=>b.score-a.score);
 const result:MixCandidate[]=[];let seconds=0;while(ranked.length&&result.length<r.count){const previous=key(result.at(-1)?.artist??'');let i=ranked.findIndex(x=>!previous||key(x.t.artist??'')!==previous);if(i<0)i=0;const t=ranked.splice(i,1)[0].t;if(r.maxMinutes!==undefined&&(!t.duration||seconds+t.duration>r.maxMinutes*60))continue;result.push(t);seconds+=t.duration??0;}return result;
}
