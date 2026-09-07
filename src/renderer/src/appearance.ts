import { accentText, defaultAppearance, fonts } from '../../shared/appearance'
import type { Preferences } from '../../shared/types'
export function applyAppearance(p:Preferences){
  const root=document.documentElement,a=p.appearance??defaultAppearance
  root.dataset.theme=p.theme
  root.dataset.customColors=Object.keys(a.colors).length?'true':'false'
  const variables:Record<string,string|undefined>={'--bg':a.colors.background,'--panel':a.colors.panel,'--accent':a.colors.accent,'--text':a.colors.text,'--muted':a.colors.muted,'--control':a.colors.panel,'--control-text':a.colors.text}
  if(a.colors.accent){variables['--line']='color-mix(in srgb, var(--accent) 24%, transparent)';variables['--control-border']='color-mix(in srgb, var(--accent) 40%, transparent)';variables['--control-hover']='color-mix(in srgb, var(--accent) 14%, transparent)';variables['--accent-text']=accentText(a.colors.accent)}
  else for(const key of ['--line','--control-border','--control-hover','--accent-text'])variables[key]=undefined
  for(const [key,value] of Object.entries(variables))if(value)root.style.setProperty(key,value);else root.style.removeProperty(key)
  root.style.setProperty('--body-font',fonts[a.bodyFont].css);root.style.setProperty('--heading-font',fonts[a.headingFont].css);root.style.setProperty('--lyrics-font',fonts[a.lyricsFont].css)
}
