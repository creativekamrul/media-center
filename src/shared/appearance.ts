import { z } from 'zod'
export const fontIds=['segoe','georgia','arial','trebuchet','verdana','consolas','calibri','cambria','tahoma','times','palatino','garamond','century','bahnschrift'] as const
export const fonts:Record<typeof fontIds[number],{name:string;css:string}>={
 segoe:{name:'Segoe UI',css:'"Segoe UI", sans-serif'},georgia:{name:'Georgia',css:'Georgia, "Times New Roman", serif'},arial:{name:'Arial',css:'Arial, sans-serif'},trebuchet:{name:'Trebuchet MS',css:'"Trebuchet MS", sans-serif'},verdana:{name:'Verdana',css:'Verdana, sans-serif'},consolas:{name:'Consolas',css:'Consolas, monospace'},
 calibri:{name:'Calibri',css:'Calibri, sans-serif'},cambria:{name:'Cambria',css:'Cambria, serif'},tahoma:{name:'Tahoma',css:'Tahoma, sans-serif'},times:{name:'Times New Roman',css:'"Times New Roman", serif'},palatino:{name:'Palatino Linotype',css:'"Palatino Linotype", serif'},garamond:{name:'Garamond',css:'Garamond, serif'},century:{name:'Century Gothic',css:'"Century Gothic", sans-serif'},bahnschrift:{name:'Bahnschrift',css:'Bahnschrift, sans-serif'}
}
export const installedFontNameSchema=z.string().trim().min(1).max(120).regex(/^[\p{L}\p{N}\p{M} ._'()&+,-]+$/u)
export const fontChoiceSchema=z.union([z.enum(fontIds),z.string().refine(value=>value.startsWith('system:')&&value.slice(7)===value.slice(7).trim()&&installedFontNameSchema.safeParse(value.slice(7)).success,'Choose a valid font family')])
export function fontCss(value:string){
 if(Object.hasOwn(fonts,value))return fonts[value as typeof fontIds[number]].css
 if(fontChoiceSchema.safeParse(value).success&&value.startsWith('system:'))return `${JSON.stringify(value.slice(7))}, sans-serif`
 return fonts.segoe.css
}

export const colorKeys=['background','panel','accent','text','muted'] as const
export const colorLabels={background:'Background',panel:'Panels',accent:'Accent',text:'Main text',muted:'Secondary text'}
export const appStyleIds=['default','soft','precision','outline','bold','retro','editorial','neon','ribbon'] as const
export type AppStyle=typeof appStyleIds[number]
const color=z.string().regex(/^#[0-9a-f]{6}$/i)
export const appearanceSchema=z.object({
 appStyle:z.enum(appStyleIds).default('default'),
 density:z.enum(['comfortable','compact']).default('comfortable'),translucency:z.boolean().default(false),surfaceStyle:z.enum(['solid','gradient']).default('solid'),colors:z.object({background:color.optional(),panel:color.optional(),accent:color.optional(),text:color.optional(),muted:color.optional()}).strict().default({}),bodyFont:fontChoiceSchema.default('segoe'),headingFont:fontChoiceSchema.default('georgia'),lyricsFont:fontChoiceSchema.default('segoe')}).strict()
export type Appearance=z.infer<typeof appearanceSchema>
export const defaultAppearance:Appearance={appStyle:'default',density:'comfortable',translucency:false,surfaceStyle:'solid',colors:{},bodyFont:'segoe',headingFont:'georgia',lyricsFont:'segoe'}
export function accentText(hex:string){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?'#101010':'#ffffff'}
