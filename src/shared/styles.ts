import {defaultAppearance,type Appearance,type AppStyle} from './appearance'
import {themes,type ThemeId} from './themes'

export const stylePresets=[
 {id:'default',name:'Original',description:'Neutral dark surfaces and quiet accents.',colors:{background:'#101113',panel:'#1b1d20',accent:'#ededf0',text:'#f3f3f5',muted:'#adb1bb'}},
 {id:'precision',name:'Slate',description:'Cool charcoal, fine edges and a restrained blue accent.',colors:{background:'#151a21',panel:'#222a35',accent:'#b7d2f5',text:'#f0f3f8',muted:'#b0bdcc'}},
 {id:'editorial',name:'Paper',description:'Warm light surfaces with dark, readable text.',colors:{background:'#f4f3ef',panel:'#e7e6e1',accent:'#284b60',text:'#20252b',muted:'#565f68'}},
 {id:'frosted',name:'Frosted',description:'Smoky glass panels over a calm dark background.',colors:{background:'#111b22',panel:'#263540',accent:'#c2dce8',text:'#f0f5f7',muted:'#b3c2ca'}},
 {id:'liquid',name:'Liquid Glass',description:'Layered glass with subtle highlights and soft depth.',colors:{background:'#101824',panel:'#253344',accent:'#c3e3ff',text:'#f3f6fb',muted:'#b4c4d8'}},
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
