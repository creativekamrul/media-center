/** Short-lived read cache for creator metadata scans; never written to the user database. */
export class CreatorPageCache<T>{
 private entries=new Map<string,{expires:number;promise:Promise<T>}>()
 constructor(private ttl=30000,private limit=64){}
 get(key:string,load:()=>Promise<T>):Promise<T>{
  const now=Date.now();for(const [id,value]of this.entries)if(value.expires<=now)this.entries.delete(id)
  const existing=this.entries.get(key);if(existing)return existing.promise
  const promise=Promise.resolve().then(load).catch(error=>{if(this.entries.get(key)?.promise===promise)this.entries.delete(key);throw error})
  this.entries.set(key,{expires:now+this.ttl,promise});while(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value!)
  return promise
 }
}
