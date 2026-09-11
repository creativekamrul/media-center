export interface LyricWord {time:number;end?:number;text:string}
export interface LyricLine {time:number;text:string;words?:LyricWord[]}
export interface LyricsResult {key:string;title:string;artist:string;status:'found'|'missing'|'instrumental'|'unsupported';plain:string;lines:LyricLine[];saved?:boolean;recordId?:number;source?:'embedded'|'navidrome'|'lrclib';warning?:string}
export interface LyricsRecord {id:number;title:string;artist:string;album:string;duration:number;status:'found'|'missing'|'instrumental';plain:string;lines:LyricLine[]}
export interface LyricsSignature {title:string;artist:string;album:string;duration:number}
const timestamp = (tag: RegExpMatchArray) => Number(tag[1])*60+Number(tag[2])+Number('0.'+(tag[3]??'0'))
export function parseLrc(input:string):LyricLine[] {
  const lines:LyricLine[]=[]
  const offsetMatch=input.match(/\[offset:([+-]?\d+)\]/i),offset=offsetMatch?Number(offsetMatch[1])/1000:0
  for(const raw of input.split(/\r?\n/)){
    const tags=[...raw.matchAll(/\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)]
    if(!tags.length)continue
    const body=raw.replace(/\[[^\]]*\]/g,''),inline=[...body.matchAll(/<(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?>/g)]
    const text=body.replace(/<\d+:\d+(?:[.:]\d+)?>/g,'').trim()
    for(const tag of tags){
      const shift=timestamp(tag)-timestamp(tags[0])+offset
      const line:LyricLine={time:Math.max(0,timestamp(tag)+offset),text}
      // One inline timestamp is a corrected line start, not invented word timing.
      if(inline.length===1)line.time=Math.max(0,timestamp(inline[0])+shift)
      if(inline.length>1){
        const words:LyricWord[]=[]
        const prefix=body.slice(0,inline[0].index)
        if(prefix.trim())words.push({time:line.time,text:prefix,end:Math.max(line.time,timestamp(inline[0])+shift)})
        for(let i=0;i<inline.length;i++){
          const current=inline[i],next=inline[i+1],word=body.slice(current.index!+current[0].length,next?.index??body.length)
          if(word)words.push({time:Math.max(0,timestamp(current)+shift),text:word,...(next?{end:Math.max(0,timestamp(next)+shift)}:{})})
        }
        if(words.length&&words.every((w,i)=>w.time>=line.time&&(!i||w.time>=words[i-1].time)&&(w.end===undefined||w.end>=w.time)))line.words=words
      }
      lines.push(line);if(lines.length>=5000)break
    }
    if(lines.length>=5000)break
  }
  lines.sort((a,b)=>a.time-b.time)
  let next:LyricLine|undefined
  for(let i=lines.length-1;i>=0;i--){
    const line=lines[i]
    if(lines[i+1]?.time>line.time)next=lines[i+1]
    if(line.words&&next){
      const boundary=next.time
      if(line.words.some(w=>w.time>=boundary)){delete line.words;continue}
      for(const word of line.words)word.end=Math.min(word.end??boundary,boundary)
    }
  }
  return lines
}
/** Line-only timing is a visual sweep, not a claim of word-level alignment. */
export function lyricFill(position:number,start:number,end:number){return end<=start?(position>=end?100:0):Math.max(0,Math.min(100,(position-start)/(end-start)*100))}
export function activeLyricIndex(lines:LyricLine[],position:number):number {
  let low=0,high=lines.length-1,result=-1
  while(low<=high){const mid=(low+high)>>1;if(lines[mid].time<=position+0.025){result=mid;low=mid+1}else high=mid-1}return result
}

export function encodeLrc(record:Pick<LyricsRecord,'lines'|'plain'>){
 const stamp=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(3).padStart(6,'0')}`
 return record.lines.length?record.lines.map(l=>`[${stamp(l.time)}]`+(l.words?.length?l.words.map(w=>`<${stamp(w.time)}>${w.text}`).join('')+(l.words.at(-1)?.end!==undefined?`<${stamp(l.words.at(-1)!.end!)}>`:''):l.text)).join('\n'):record.plain
}
