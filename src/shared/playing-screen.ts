import { z } from 'zod'
import { fontIds } from './appearance'
const color=z.string().regex(/^#[0-9a-f]{6}$/i)
// Field defaults migrate older saves while preserving their background, size and motion.
export const playingScreenSchema=z.object({
 showMusicLyrics:z.boolean().default(true),
 background:z.enum(['aurora','artwork','midnight','sunset','stars']),
 fontSize:z.number().int().min(24).max(64),motion:z.boolean(),
 font:z.enum(['theme',...fontIds]).default('theme'),
 weight:z.enum(['500','650','800']).default('800'),
 alignment:z.enum(['left','center']).default('left'),
 lineHeight:z.number().min(1.2).max(2).default(1.5),
 textColor:color.default('#cbd3e3'),sungColor:color.default('#ffffff'),wordColor:color.default('#b9e8ff'),
 inactiveOpacity:z.number().min(.2).max(1).default(.5),
 animation:z.enum(['flow','focus','fade','none']).default('flow'),
 glow:z.number().min(0).max(24).default(8),
 backdropDim:z.number().min(0).max(.8).default(.15)
}).strict()
export type PlayingScreenPreferences=z.infer<typeof playingScreenSchema>
export const defaultPlayingScreen:PlayingScreenPreferences=playingScreenSchema.parse({background:'aurora',fontSize:40,motion:true})
