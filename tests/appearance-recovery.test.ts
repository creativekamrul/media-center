import {describe,it,expect} from 'vitest'
import {appearanceRecovery} from '../src/main/appearance-recovery'
import {defaultPreferences} from '../src/shared/types'
import type {Store} from '../src/main/store'
describe('appearance recovery',()=>{
 it('preserves saved CSS across repeated recovery requests and restores only appearance',()=>{
  const original={...defaultPreferences,theme:'ocean' as const,customCss:'body {display:none}',equalizer:[1,2,3,4,5,6,7,8,9,10]}
  const values=new Map<string,unknown>([['preferences',original]])
  const store={get:(key:string)=>values.get(key),set:(key:string,value:unknown)=>values.set(key,value),preferences:()=>values.get('preferences')} as unknown as Store
  expect(appearanceRecovery(store,'get')).toBe(false)
  expect(appearanceRecovery(store,'start')).toBe(true)
  expect(store.preferences().customCss).toBeUndefined()
  expect(store.preferences().theme).toBe(defaultPreferences.theme)
  appearanceRecovery(store,'start')
  store.set('preferences',{...store.preferences(),closeToTray:true})
  expect(appearanceRecovery(store,'restore')).toBe(false)
  expect(store.preferences()).toMatchObject({...original,closeToTray:true})
  expect(appearanceRecovery(store,'restore')).toBe(false)
 })
})
