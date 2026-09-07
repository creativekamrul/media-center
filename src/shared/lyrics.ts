export interface LyricLine {time:number;text:string}
export interface LyricsResult {key:string;title:string;artist:string;status:'found'|'missing'|'instrumental'|'unsupported';plain:string;lines:LyricLine[];saved?:boolean;recordId?:number}
export interface LyricsRecord {id:number;title:string;artist:string;album:string;duration:number;status:'found'|'missing'|'instrumental';plain:string;lines:LyricLine[]}
export interface LyricsSignature {title:string;artist:string;album:string;duration:number}
export function parseLrc(input:string):LyricLine[] {
  const lines:LyricLine[]=[]
  for(const raw of input.split(/\r?\n/)){
    const tags=[...raw.matchAll(/\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)]
    if(!tags.length)continue
    const text=raw.replace(/\[[^\]]*\]/g,'').replace(/<\d+:\d+(?:\.\d+)?>/g,'').trim()
    for(const tag of tags){lines.push({time:Number(tag[1])*60+Number(tag[2])+Number('0.'+(tag[3]??'0')),text});if(lines.length>=5000)return lines.sort((a,b)=>a.time-b.time)}
  }
  return lines.sort((a,b)=>a.time-b.time)
}
export function activeLyricIndex(lines:LyricLine[],position:number):number {
  let low=0,high=lines.length-1,result=-1
  while(low<=high){const mid=(low+high)>>1;if(lines[mid].time<=position+0.025){result=mid;low=mid+1}else high=mid-1}return result
}
