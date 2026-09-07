import { z } from 'zod'
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v},'Choose a valid calendar date.')
export const recapRangeSchema = z.object({start:date,end:date}).strict().refine(r=>r.start<=r.end,'The end date must be on or after the start date.').refine(r=>(Date.parse(r.end)-Date.parse(r.start))/86400000<=3660,'Choose a range of up to ten years.')
export type RecapRange = z.infer<typeof recapRangeSchema>
export interface ListeningRecap extends RecapRange {
  totalSeconds:number; activeDays:number; uniqueItems:number; finishedBooks:number; finishedEpisodes:number
  kinds:{kind:string;seconds:number}[]
  top:{title:string;subtitle:string;kind:string;seconds:number}[]
  days:{day:string;seconds:number}[]
}
