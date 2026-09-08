import {describe,it,expect,vi} from 'vitest'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
vi.mock('electron',()=>({safeStorage:{}}))
import {readThemeCss} from '../src/main/custom-css'
import {customCssSchema,MAX_THEME_BYTES} from '../src/shared/custom-css'
import {preferenceSchema} from '../src/main/features'
import {backupSchema} from '../src/main/daily'
import {defaultPreferences} from '../src/shared/types'
import {defaultDailySettings} from '../src/shared/daily'
describe('Local CSS themes',()=>{
  it('reads only bounded UTF-8 CSS files and handles a leading BOM',async()=>{
    const folder=await mkdtemp(join(tmpdir(),'media-center-css-'))
    try {
      const file=join(folder,'theme.CSS')
      await writeFile(file,'\uFEFF:root { --accent: #aaccee; }')
      expect(await readThemeCss(file)).toBe(':root { --accent: #aaccee; }')
      await expect(readThemeCss(join(folder,'theme.txt'))).rejects.toThrow('.css')
      for(const invalid of [Buffer.from([255,254,65,0]),Buffer.from('a\0b'),Buffer.from('a\uFEFFb'),Buffer.alloc(MAX_THEME_BYTES+1,65)]){
        await writeFile(file,invalid);await expect(readThemeCss(file)).rejects.toThrow()
      }
    }finally{await rm(folder,{recursive:true,force:true})}
  })
  it('validates imported CSS again when saving or restoring preferences',()=>{
    const css=':root { --accent: #abcdef; }',preferences={...defaultPreferences,customCss:css}
    expect(preferenceSchema.parse(preferences).customCss).toBe(css)
    const backup={format:'media-center-personal',version:1,preferences,dailySettings:defaultDailySettings,servers:[],folders:[],queues:[],notes:[],plans:[],rules:[]}
    expect(backupSchema.parse(backup).preferences.customCss).toBe(css)
    expect(customCssSchema.safeParse('é'.repeat(MAX_THEME_BYTES/2+1)).success).toBe(false)
    expect(backupSchema.safeParse({...backup,preferences:{...preferences,customCss:'bad\0css'}}).success).toBe(false)
    expect(preferenceSchema.parse(defaultPreferences).customCss).toBeUndefined()
  })
})
