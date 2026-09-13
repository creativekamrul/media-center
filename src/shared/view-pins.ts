import {z} from 'zod'
const ordered = <T extends [string,...string[]]>(ids:T) => z.array(z.enum(ids)).min(1).max(ids.length).refine(v=>new Set(v).size===v.length,'Pin each view only once.')
export const viewPinsSchema=z.object({
 music:ordered(['albums','songs','artists','playlists','newest','recent','frequent','random','favorites','genres','radio']).optional(),
 local:ordered(['songs','albums','artists','playlists','genres','favorites','newest','recent','folders']).optional(),
 tools:ordered(['mixes','shelves','offline','people','discover','series','podcasts','health','profiles','recovery']).optional()
}).strict()
export type ViewPinScope=keyof z.infer<typeof viewPinsSchema>
export const defaultViewPins={music:['albums','songs','artists','playlists'],local:['songs','albums','artists','playlists'],tools:['mixes','shelves','offline','people']} as const
