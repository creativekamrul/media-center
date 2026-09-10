import { z } from 'zod'
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v},'Choose a valid calendar date.')
export const recapRangeSchema = z.object({start:date,end:date}).strict().refine(r=>r.start<=r.end,'The end date must be on or after the start date.').refine(r=>(Date.parse(r.end)-Date.parse(r.start))/86400000<=3660,'Choose a range of up to ten years.')
export type RecapRange = z.infer<typeof recapRangeSchema>
export interface ListeningRecap extends RecapRange {
  calendarDays:number; averageSeconds:number; longestStreak:number; peakDay?:{day:string;seconds:number}
  artists:{name:string;seconds:number}[]
  comparison:{start:string;end:string;totalSeconds:number;changePercent:number|null;artists:{name:string;seconds:number}[]}
  totalSeconds:number; activeDays:number; uniqueItems:number; finishedBooks:number; finishedEpisodes:number
  kinds:{kind:string;seconds:number}[]
  top:{title:string;subtitle:string;kind:string;seconds:number}[]
  days:{day:string;seconds:number}[]
}

export function recapInsights(start:string,end:string,days:{day:string;seconds:number}[]) {
 const dayMs=86400000,calendarDays=Math.round((Date.parse(end)-Date.parse(start))/dayMs)+1
 let longestStreak=0,streak=0,previous=-Infinity
 for(const d of days){const time=Date.parse(d.day);streak=time-previous===dayMs?streak+1:1;longestStreak=Math.max(longestStreak,streak);previous=time}
 const peakDay=days.reduce<{day:string;seconds:number}|undefined>((best,d)=>!best||d.seconds>best.seconds?d:best,undefined)
 const priorEnd=new Date(Date.parse(start)-dayMs).toISOString().slice(0,10),priorStart=new Date(Date.parse(start)-calendarDays*dayMs).toISOString().slice(0,10)
 return{calendarDays,longestStreak,peakDay,priorStart,priorEnd}
}
