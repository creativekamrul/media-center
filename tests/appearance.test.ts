import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {Store} from '../src/main/store'
import {appearanceSchema,defaultAppearance,accentText} from '../src/shared/appearance'
describe('Custom appearance',()=>{
 it('validates bounded color and font choices and restores saved preferences',()=>{
  const a={...defaultAppearance,colors:{accent:'#112233',background:'#000000'},headingFont:'verdana' as const}
  expect(appearanceSchema.parse(a)).toEqual(a)
  expect(appearanceSchema.safeParse({...a,colors:{accent:'url(https://example.test)'}}).success).toBe(false)
  expect(appearanceSchema.safeParse({...a,bodyFont:'remote-font'}).success).toBe(false)
  const store=new Store(':memory:');try{expect(store.preferences().appearance).toBeUndefined();store.set('preferences',{...store.preferences(),appearance:a});expect(store.preferences().appearance).toEqual(a)}finally{store.close()}
 })
 it('keeps accent button text readable for dark and light accents',()=>{expect(accentText('#000000')).toBe('#ffffff');expect(accentText('#ffffff')).toBe('#101010')})
})
