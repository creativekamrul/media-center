import { z } from 'zod'
export const fontIds=['segoe','georgia','arial','trebuchet','verdana','consolas'] as const
export const fonts={segoe:{name:'Segoe UI',css:'"Segoe UI", sans-serif'},georgia:{name:'Georgia',css:'Georgia, "Times New Roman", serif'},arial:{name:'Arial',css:'Arial, sans-serif'},trebuchet:{name:'Trebuchet MS',css:'"Trebuchet MS", sans-serif'},verdana:{name:'Verdana',css:'Verdana, sans-serif'},consolas:{name:'Consolas',css:'Consolas, monospace'}}
export const colorKeys=['background','panel','accent','text','muted'] as const
export const colorLabels={background:'Background',panel:'Panels',accent:'Accent',text:'Main text',muted:'Secondary text'}
const color=z.string().regex(/^#[0-9a-f]{6}$/i)
export const appearanceSchema=z.object({
 density:z.enum(['comfortable','compact']).default('comfortable'),translucency:z.boolean().default(false),surfaceStyle:z.enum(['solid','gradient']).default('solid'),colors:z.object({background:color.optional(),panel:color.optional(),accent:color.optional(),text:color.optional(),muted:color.optional()}).strict().default({}),bodyFont:z.enum(fontIds).default('segoe'),headingFont:z.enum(fontIds).default('georgia'),lyricsFont:z.enum(fontIds).default('segoe')}).strict()
export type Appearance=z.infer<typeof appearanceSchema>
export const defaultAppearance:Appearance={density:'comfortable',translucency:false,surfaceStyle:'solid',colors:{},bodyFont:'segoe',headingFont:'georgia',lyricsFont:'segoe'}
export function accentText(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#101010':'#ffffff'}
