import {describe,it,expect} from 'vitest'
import {appearanceSchema,defaultAppearance} from '../src/shared/appearance'
import {appearanceColors,chooseStyle,currentStyle,stylePresets,contrastRatio} from '../src/shared/styles'
describe('curated styles',()=>{
 it('keeps legacy saved colors and accepts retired styles without losing preferences',()=>{
  const legacy=appearanceSchema.parse({appStyle:'retro',colors:{accent:'#ffccaa'},density:'compact'})
  expect(legacy.stylePalette).toBe(false)
  expect(appearanceColors('ocean',legacy)).toMatchObject({background:'#081b22',accent:'#ffccaa'})
  expect(currentStyle(legacy.appStyle)).toBe('default')
 })
 it('loads style defaults while retaining typography, density and guidance preferences',()=>{
  const a={...defaultAppearance,headingFont:'georgia',density:'compact' as const,showHelp:false,colors:{accent:'#ffccaa'}}
  for(const style of stylePresets){
   const next=chooseStyle(a,style.id)
   expect(appearanceSchema.parse(next)).toMatchObject({appStyle:style.id,stylePalette:true,headingFont:'georgia',density:'compact',showHelp:false,colors:{}})
   expect(appearanceColors('rose',next)).toEqual(style.colors)
  }
 })
 it('provides readable primary and secondary text on both default surfaces',()=>{
  for(const {colors} of stylePresets)for(const background of [colors.background,colors.panel])for(const text of [colors.text,colors.muted])expect(contrastRatio(text,background)).toBeGreaterThanOrEqual(4.5)
 })
})
