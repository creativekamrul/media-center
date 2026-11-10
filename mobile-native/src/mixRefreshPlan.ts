import {buildRuleMix,mixPeriod,type MixCandidate,type MixRecipe} from './mixRules.ts';
export type MixRefreshStatus={id:string;due:boolean;updated:number;error?:string};
/** Share each source scan within a pass; a failed or cancelled source never replaces a saved mix. */
export async function refreshSavedMixes(recipes:MixRecipe[],status:MixRefreshStatus[],read:(id:string)=>Promise<MixCandidate[]>,history:MixCandidate[],likes:string[],cancelled:()=>boolean,commit:(recipe:MixRecipe,rows:MixCandidate[],period:number)=>Promise<void>,failed:(recipe:MixRecipe)=>Promise<void>,now=Date.now()){
 const due=status.filter(s=>s.due).sort((a,b)=>a.updated-b.updated).map(s=>recipes.find(r=>r.id===s.id&&r.refresh!=='manual')).filter((r):r is MixRecipe=>!!r).slice(0,4);const sources=new Map<string,Promise<MixCandidate[]>>();let generated=0;
 for(const recipe of due){if(cancelled())break;try{const candidates:MixCandidate[]=[];for(const id of recipe.sources){if(cancelled())break;let result=sources.get(id);if(!result){result=read(id);sources.set(id,result)}candidates.push(...await result)}if(cancelled())break;const rows=buildRuleMix(candidates,recipe,history,likes,now);await commit(recipe,rows,mixPeriod(recipe,now));generated++}catch{if(!cancelled())try{await failed(recipe)}catch{/* Native revision validation may reject a recipe changed during the scan. */}}}return generated;
}
