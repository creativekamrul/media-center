export type TranscriptCue={start:number|null;end:number|null;text:string};
function seconds(value:string):number|null {
 const m=value.trim().match(/^(?:(\d{1,5}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);if(!m)return null;
 const h=Number(m[1]??0),min=Number(m[2]),sec=Number(m[3]);if(min>=60||sec>=60)return null;
 return h*3600+min*60+sec+Number((m[4]??'').padEnd(3,'0'))/1000;
}
/** Imported transcripts are separate from song lyrics; source timestamps stay whole-item seconds. */
export function parseTranscript(raw:string):TranscriptCue[]{
 if(raw.length>500000||raw.includes('\0'))throw Error('Choose a transcript smaller than 500,000 characters.');
 const text=raw.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();if(!text)return [];
 const timed=/-->/.test(text)||/^WEBVTT(?:\s|$)/.test(text);const out:TranscriptCue[]=[];
 for(const block of text.split(/\n\s*\n/)){
  if(out.length>=10000)throw Error('This transcript has more than 10,000 sections.');
  const lines=block.split('\n');if(timed&&/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0]))continue;
  const i=lines.findIndex(l=>l.includes('-->'));
  if(i<0){if(!timed)out.push({start:null,end:null,text:block});continue}
  const range=lines[i].match(/^(\S+)\s+-->\s+(\S+)(?:\s.*)?$/);if(!range)continue;
  const start=seconds(range[1]),end=seconds(range[2]);if(start===null||end===null||end<=start)continue;
  const body=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').trim();if(body)out.push({start,end,text:body});
 }
 if(timed&&!out.length)throw Error('No valid transcript timestamps were found. Use VTT, SRT or plain text.');
 return out.sort((a,b)=>(a.start??0)-(b.start??0));
}
export function searchTranscript(cues:TranscriptCue[],query:string){const words=query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return cues.filter(c=>{const text=c.text.normalize('NFKC').toLocaleLowerCase();return words.every(w=>text.includes(w))})}
