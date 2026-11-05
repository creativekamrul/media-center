import {defaultAppearance,type Appearance,type AppStyle} from './appearance'
import {themes,type ThemeId} from './themes'

const charcoal = {
 background:'#191a1c', panel:'#101113', accent:'#1ed760', text:'#f2f4f3', muted:'#b0b6b3'
} as const

export const stylePresets=[
 {id:'default',name:'Original',description:'Charcoal surfaces, darker panels and green playback controls.',colors:charcoal},
 {id:'precision',name:'Slate',description:'Cool charcoal with fine edges and a green accent.',colors:{...charcoal,background:'#1a1c1f',panel:'#101215'}},
 {id:'editorial',name:'Paper',description:'Warm paper surfaces with a deep green accent.',colors:{background:'#f4f3ef',panel:'#e7e6e1',accent:'#146437',text:'#20252b',muted:'#515c55'}},
 {id:'frosted',name:'Frosted',description:'Smoked charcoal glass with bright green controls.',colors:{...charcoal,background:'#191c1b',panel:'#101312'}},
 {id:'liquid',name:'Liquid Glass',description:'Layered dark glass with soft highlights and a green accent.',colors:{...charcoal,background:'#1a1d1e',panel:'#101314'}},
] as const
export type CurrentStyle=typeof stylePresets[number]['id']
export function currentStyle(id:AppStyle):CurrentStyle {
 if(id==='precision'||id==='editorial'||id==='frosted'||id==='liquid')return id
 return 'default'
}
export function stylePreset(id:AppStyle){return stylePresets.find(s=>s.id===currentStyle(id))!}
export function appearanceColors(theme:ThemeId,a:Appearance=defaultAppearance){
 const legacy=themes.find(t=>t.id===theme)??themes[0]
 const base=a.stylePalette?stylePreset(a.appStyle).colors:{background:legacy.background,panel:legacy.surface,accent:legacy.accent,text:'#f0edf2',muted:'#b2b8c4'}
 return {...base,...a.colors}
}
export function chooseStyle(a:Appearance,id:CurrentStyle):Appearance {
 return {...a,appStyle:id,stylePalette:true,colors:{},surfaceStyle:'solid',translucency:id==='frosted'||id==='liquid'}
}
export function contrastRatio(foreground:string,background:string){
 const luminance=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)
 const a=luminance(foreground),b=luminance(background)
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)
}
