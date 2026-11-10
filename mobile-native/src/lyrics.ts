export type LyricLine={time:number;text:string};
export function parseLyrics(value:string):LyricLine[]{
 const result:LyricLine[]=[];
 for(const line of value.split(/\r?\n/)){
  const stamps=[...line.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
  const text=line.replace(/\[[^\]]*\]/g,'').trim();
  for(const stamp of stamps)result.push({time:Number(stamp[1])*60+Number(stamp[2])+(stamp[3]?Number('0.'+stamp[3]):0),text});
 }
 return result.sort((a,b)=>a.time-b.time);
}
