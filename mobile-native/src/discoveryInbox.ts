import {pinKey,type Pin} from './pins.ts';
export type DiscoveryNote={pin:Pin;added:number;reviewed:boolean};
export function readDiscoveries(raw:unknown):DiscoveryNote[]{
 if(!Array.isArray(raw))return [];const seen=new Set<string>(),out:DiscoveryNote[]=[];
 for(const value of raw.slice(0,500)){const row=value as DiscoveryNote,p=row?.pin;if(!p||typeof p.account!=='string'||!p.account||p.account.length>512||typeof p.id!=='string'||!p.id||p.id.length>512||typeof p.title!=='string'||p.title.length>1000||!['track','album','artist'].includes(p.kind)||!['/detail','/discover'].includes(p.route)||!Number.isFinite(row.added))continue;const k=pinKey(p);if(seen.has(k))continue;seen.add(k);out.push({pin:{account:p.account,id:p.id,title:p.title,kind:p.kind,route:p.route,...(typeof p.cover==='string'&&p.cover.length<=512?{cover:p.cover}:{})},added:row.added,reviewed:row.reviewed===true})}return out;
}
export function saveDiscovery(raw:unknown,pin:Pin,now=Date.now()):DiscoveryNote[]{const entry=readDiscoveries([{pin,added:now,reviewed:false}])[0];if(!entry)throw Error('This discovery cannot be saved.');return [entry,...readDiscoveries(raw).filter(r=>pinKey(r.pin)!==pinKey(pin))].slice(0,500)}
