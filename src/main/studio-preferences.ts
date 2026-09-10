import type {Preferences} from '../shared/types'
import { z } from 'zod'
import { id, preferenceSchema } from './features'
import { playingScreenSchema } from '../shared/playing-screen'
export const profileSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(80),
    preferences: preferenceSchema,
    lyrics: playingScreenSchema,
    volume: z.number().min(0).max(100),
    speed: z.number().min(0.5).max(3),
  })
  .strict()
export const outputSchema = z
  .object({
    volume: z.number().min(0).max(100),
    equalizer: z.array(z.number().min(-12).max(12)).length(10),
  })
  .strict()

export function applyProfilePreferences(saved:Preferences,current:Preferences):Preferences {
 return {...saved,scrobble:current.scrobble,closeToTray:current.closeToTray}
}
