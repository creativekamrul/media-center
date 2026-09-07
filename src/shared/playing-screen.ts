import { z } from 'zod'
export const playingScreenSchema=z.object({background:z.enum(['aurora','artwork','midnight','sunset','stars']),fontSize:z.number().int().min(24).max(64),motion:z.boolean()}).strict()
export type PlayingScreenPreferences=z.infer<typeof playingScreenSchema>
export const defaultPlayingScreen:PlayingScreenPreferences={background:'aurora',fontSize:40,motion:true}
