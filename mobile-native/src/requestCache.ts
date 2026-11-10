// Coalesce concurrent requests, bound retained responses, and never retain failures.
export function createReadCache<T>(ttl:number,limit:number,weight:(value:T)=>number=()=>1,maxWeight=limit){
 const entries=new Map<string,{until:number;value:Promise<T>;weight:number}>();let retained=0;
 const remove=(key:string)=>{const entry=entries.get(key);if(entry)retained-=entry.weight;entries.delete(key)};
 return {clear:()=>{entries.clear();retained=0},read:(key:string,load:()=>Promise<T>):Promise<T>=>{
  const existing=entries.get(key);if(existing&&existing.until>Date.now()){entries.delete(key);entries.set(key,existing);return existing.value}if(existing)remove(key);
  const entry={until:Infinity,value:Promise.resolve().then(load),weight:0};entries.set(key,entry);
  while(entries.size>limit)remove(entries.keys().next().value!);
  entry.value.then(value=>{if(entries.get(key)!==entry)return;entry.until=Date.now()+ttl;entry.weight=Math.max(0,weight(value));retained+=entry.weight;while(retained>maxWeight&&entries.size)remove(entries.keys().next().value!)},()=>{if(entries.get(key)===entry)remove(key)});
  return entry.value;
 }};
}
