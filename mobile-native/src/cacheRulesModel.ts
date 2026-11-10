export type OfflineRule={id:string;account:string;kind:'album'|'playlist'|'favorites';item:string;title:string;enabled:boolean;unmetered:boolean;limit:number;lastRun?:number;error?:string};
export function ruleDue(rule:OfflineRule,now:number){return rule.enabled&&now-(rule.lastRun??0)>=3600000;}
export function cacheIds(rows:{id:string}[],limit:number){return [...new Set(rows.map(r=>r.id).filter(Boolean))].slice(0,Math.max(1,Math.min(500,limit)));}
