import {describe,it,expect} from 'vitest'
import {fontChoiceSchema,fontCss,appearanceSchema,defaultAppearance} from '../src/shared/appearance'
import {playingScreenSchema,defaultPlayingScreen} from '../src/shared/playing-screen'
import {parseInstalledFonts} from '../src/main/installed-fonts'

describe('Installed fonts and lyric typography',()=>{
 it('accepts Unicode family names while rejecting paths and CSS payloads',()=>{
  for(const family of ['Noto Sans Bengali','বাংলা ফন্ট','Segoe UI Variable','Source Sans 3']){
   expect(fontChoiceSchema.parse(`system:${family}`)).toBe(`system:${family}`)
   expect(fontCss(`system:${family}`)).toBe(`"${family}", sans-serif`)
  }
  for(const value of ['system:','system:Arial; color:red','system:C:\\Fonts\\font.ttf','system:url(https://x)','system:Arial\n','system:Arial"','system:'+'a'.repeat(121)])expect(fontChoiceSchema.safeParse(value).success).toBe(false)
  expect(fontCss('invalid')).toContain('Segoe UI')
 })
 it('filters and deduplicates the OS family response without exposing other data',()=>{
  expect(parseInstalledFonts('["Segoe UI","Arial","Arial","C:\\\\font.ttf",null,42]')).toEqual(['Arial','Segoe UI'])
  expect(()=>parseInstalledFonts('{"path":"private"}')).toThrow()
 })
 it('preserves installed choices and spacing in saved settings, with safe older-save defaults',()=>{
  const appearance=appearanceSchema.parse({...defaultAppearance,bodyFont:'system:Noto Sans',headingFont:'cambria'})
  expect(appearanceSchema.parse(JSON.parse(JSON.stringify(appearance)))).toEqual(appearance)
  const prefs={...defaultPlayingScreen,font:'system:Noto Sans Bengali',lineHeight:.8,wordSpacing:-.1}
  expect(playingScreenSchema.parse(JSON.parse(JSON.stringify(prefs)))).toEqual(prefs)
  const {wordSpacing,...old}=defaultPlayingScreen
  expect(playingScreenSchema.parse(old).wordSpacing).toBe(0)
  for(const patch of [{lineHeight:.79},{wordSpacing:-.16},{wordSpacing:.61}])expect(playingScreenSchema.safeParse({...prefs,...patch}).success).toBe(false)
 })
})
