export function artistName(value:string){return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
export function matchingArtists<T extends {id:string;name?:string;title?:string}>(rows:T[],name:string):T[]{const key=artistName(name);return key?[...new Map(rows.filter(r=>artistName(r.name??r.title??'')===key).map(r=>[r.id,r])).values()]:[];}
