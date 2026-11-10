export type Pin={account:string;id:string;kind:string;title:string;cover?:string;route:'/detail'|'/spoken'|'/jellyfin'|'/discover'|'/mixes';showId?:string};
export const pinKey=(p:Pick<Pin,'account'|'kind'|'id'> & Partial<Pick<Pin,'showId'|'route'>>)=>JSON.stringify([p.account,p.route??'/detail',p.kind,p.showId??'',p.id]);
export function togglePin(pins:Pin[],pin:Pin):Pin[]{const key=pinKey(pin);return pins.some(p=>pinKey(p)===key)?pins.filter(p=>pinKey(p)!==key):[...pins,pin];}
export function movePin(pins:Pin[],key:string,direction:number):Pin[]{const next=[...pins],i=next.findIndex(p=>pinKey(p)===key),j=i+direction;if(i<0||j<0||j>=next.length)return pins;[next[i],next[j]]=[next[j],next[i]];return next;}
