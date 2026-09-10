import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {experienceSchema,collectionDefaults,navigationChangeSchema,orderedCollectionKeys} from '../src/shared/experience'
import {Store} from '../src/main/store'
import {exportExtra,restoreExtra,personalExtraSchema} from '../src/main/personal-backup'

describe('collection navigation preferences',()=>{
 it('keeps older preferences and backups usable with default navigation',()=>{
  expect(experienceSchema.parse({}).navigation).toEqual({collections:collectionDefaults,collectionOrder:[...orderedCollectionKeys],queueBelowHome:false,playlistsBelowHome:false,listeningCollapsed:false,sidebarCollapsed:false})
  const store=new Store(':memory:')
  try{const backup=exportExtra(store);delete (backup.experience as Partial<typeof backup.experience>).navigation;expect(personalExtraSchema.parse(backup).experience.navigation.collections).toEqual(collectionDefaults)}finally{store.close()}
 })
 it('validates bounded names, supported icons and explicit collection identities',()=>{
  const input={action:'collections',collections:{...collectionDefaults,music:{name:'  My records  ',icon:'disc'}}}
  expect(navigationChangeSchema.parse(input)).toMatchObject({collections:{music:{name:'My records'}}})
  for(const name of ['   ','x'.repeat(41),'name\u0000'])expect(navigationChangeSchema.safeParse({...input,collections:{...collectionDefaults,music:{name,icon:'disc'}}}).success).toBe(false)
  expect(navigationChangeSchema.safeParse({...input,collections:{...collectionDefaults,music:{name:'Songs',icon:'https://example.com/icon.svg'}}}).success).toBe(false)
  expect(navigationChangeSchema.safeParse({action:'listening',collapsed:'yes'}).success).toBe(false)
  for(const order of [['local'],['music','music','podcasts','local'],['music','audiobooks','podcasts','tools']])expect(navigationChangeSchema.safeParse({...input,collectionOrder:order}).success).toBe(false)
  expect(navigationChangeSchema.safeParse({...input,queueBelowHome:'true'}).success).toBe(false)
 })
 it('round-trips local names, icons and collapse state through personal backups',()=>{
  const store=new Store(':memory:'),restored=new Store(':memory:')
  try{
   const prefs=experienceSchema.parse({navigation:{collections:{...collectionDefaults,podcasts:{name:'My shows',icon:'radio'}},collectionOrder:['local','podcasts','music','audiobooks'],queueBelowHome:true,playlistsBelowHome:true,listeningCollapsed:true,sidebarCollapsed:true}})
   store.set('experience',prefs)
   const {values,stats}=restoreExtra(exportExtra(store),{servers:new Map(),folders:new Map()},q=>q)
   restored.restorePersonal(values,stats)
   expect(restored.get('experience')).toEqual(prefs)
  }finally{store.close();restored.close()}
 })
})
