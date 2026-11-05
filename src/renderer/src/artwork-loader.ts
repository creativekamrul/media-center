// Bound concurrent artwork work when a large grid enters the viewport.
export function createArtworkLoader(limit=6){
 let active=0
 const waiting:Array<()=>void>=[]
 const drain=()=>{while(active<limit&&waiting.length){active++;waiting.shift()!()}}
 return function load<T>(work:()=>Promise<T>,isRelevant=()=>true):Promise<T|undefined>{
  return new Promise((resolve,reject)=>{
   waiting.push(()=>{Promise.resolve().then(()=>isRelevant()?work():undefined).then(resolve,reject).finally(()=>{active--;drain()})})
   drain()
  })
 }
}
export const loadArtwork=createArtworkLoader()
