import {describe,it,expect} from 'vitest'
import {experienceSchema,homeSections} from '../src/shared/experience'
import {jfCommand,jfVideoPreferences} from '../src/shared/jellyfin'
describe('v2 preference compatibility',()=>{
 it('preserves the user’s Home order and hidden sections when adding media shelves',()=>{
  const old=['pins','hero','continue','albums','episodes','mixes','later']
  const prefs=experienceSchema.parse({homeOrder:old,hiddenSections:['albums']})
  expect(prefs.homeOrder.slice(0,old.length)).toEqual(old)
  expect(prefs.homeOrder).toHaveLength(homeSections.length)
  expect(new Set(prefs.homeOrder).size).toBe(homeSections.length)
  expect(prefs.hiddenSections).toEqual(['albums'])
  expect(experienceSchema.parse(prefs)).toEqual(prefs)
 })
 it('rejects duplicate Home sections rather than losing the layout',()=>{
  expect(experienceSchema.safeParse({homeOrder:['hero','hero']}).success).toBe(false)
 })
 it('bounds video preferences and accepts only explicit player operations',()=>{
  expect(jfVideoPreferences.parse({})).toMatchObject({subtitleScale:1,nextDelay:0,hideControls:true})
  for(const input of [{subtitleScale:99},{nextDelay:-1},{audioLanguage:'en, --script=evil'},{subtitleBackground:'yes'}])expect(jfVideoPreferences.safeParse(input).success).toBe(false)
  expect(jfCommand.safeParse({action:'queueIndex',value:-1}).success).toBe(false)
  expect(jfCommand.safeParse({action:'preferences',value:{command:['run','cmd.exe']}}).success).toBe(false)
 })
})
