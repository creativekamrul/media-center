import {customCssSchema} from '../../shared/custom-css'
import {api} from './actions'

export function currentCssSnapshot(){
 const root=document.documentElement,computed=getComputedStyle(root)
 const variables=Array.from(computed).filter(name=>name.startsWith('--')).sort()
 const sheets=Array.from(document.styleSheets).filter(sheet=>!(sheet.ownerNode instanceof Element&&sheet.ownerNode.id==='custom-theme-css'))
 const imported=document.getElementById('custom-theme-css')?.textContent??''
 // A re-exported snapshot already contains the application rules.
 if(imported.startsWith('/* Media Center CSS snapshot'))return customCssSchema.parse(imported)
 const css=sheets.map(sheet=>Array.from(sheet.cssRules,rule=>rule.cssText).join('\n')).join('\n')
 const custom=document.getElementById('custom-theme-css')?.textContent??''
 return customCssSchema.parse(`/* Media Center CSS snapshot
Theme: ${root.dataset.theme}; application style: ${root.dataset.appStyle}.
Use those selections when importing this file. Edit rules or add overrides at the end.
Includes application rules, current palette/fonts and your custom CSS. */
${css}
/* Current palette, fonts and style tokens */
:root {
${variables.map(name=>`  ${name}: ${computed.getPropertyValue(name).trim()} !important;`).join('\n')}
}
/* Your custom overrides */
${custom}
`)
}
export async function exportCurrentCss(){return api.exportThemeCss(currentCssSnapshot())}
