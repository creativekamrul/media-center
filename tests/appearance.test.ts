import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {Store} from '../src/main/store'
import {appearanceSchema,defaultAppearance,accentText,appStyleIds} from '../src/shared/appearance'
describe('Custom appearance',()=>{
 it('keeps existing themes on Original and persists every application style independently',()=>{
  const {appStyle,...legacy}=defaultAppearance
  expect(appearanceSchema.parse(legacy).appStyle).toBe('default')
  expect(appearanceSchema.safeParse({...legacy,appStyle:'unknown'}).success).toBe(false)
  const store=new Store(':memory:')
  try {
   for(const style of appStyleIds){
    const appearance={...legacy,appStyle:style,colors:{accent:'#123456'},translucency:false}
    store.set('preferences',{...store.preferences(),theme:'ocean',appearance})
    expect(store.preferences().appearance).toEqual(appearance)
    expect(store.preferences().theme).toBe('ocean')
   }
  } finally {store.close()}
 })
 it('migrates old appearance settings to solid and persists the selected finish',()=>{
  const {surfaceStyle,...legacy}=defaultAppearance
  expect(appearanceSchema.parse(legacy).surfaceStyle).toBe('solid')
  expect(appearanceSchema.safeParse({...legacy,surfaceStyle:'invalid'}).success).toBe(false)
  const store=new Store(':memory:')
  try { store.set('preferences',{...store.preferences(),appearance:{...legacy,surfaceStyle:'gradient'}}); expect(store.preferences().appearance?.surfaceStyle).toBe('gradient') } finally {store.close()}
 })
 it('validates bounded color and font choices and restores saved preferences',()=>{
  const a={...defaultAppearance,colors:{accent:'#112233',background:'#000000'},headingFont:'verdana' as const}
  expect(appearanceSchema.parse(a)).toEqual(a)
  expect(appearanceSchema.safeParse({...a,colors:{accent:'url(https://example.test)'}}).success).toBe(false)
  expect(appearanceSchema.safeParse({...a,bodyFont:'remote-font'}).success).toBe(false)
  const store=new Store(':memory:');try{expect(store.preferences().appearance).toBeUndefined();store.set('preferences',{...store.preferences(),appearance:a});expect(store.preferences().appearance).toEqual(a)}finally{store.close()}
 })
 it('keeps accent button text readable for dark and light accents',()=>{expect(accentText('#000000')).toBe('#ffffff');expect(accentText('#ffffff')).toBe('#101010')})
})
