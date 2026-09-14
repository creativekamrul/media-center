import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{}}))
import {experienceSchema,collectionDefaults,navigationChangeSchema,orderedCollectionKeys} from '../src/shared/experience'
import {Store} from '../src/main/store'
import {exportExtra,restoreExtra,personalExtraSchema} from '../src/main/personal-backup'

describe('collection navigation preferences',()=>{
 it('keeps older preferences and backups usable with default navigation',()=>{
  expect(experienceSchema.parse({}).navigation).toEqual({librarySelections:{},viewPins:{},collections:collectionDefaults,collectionOrder:[...orderedCollectionKeys],queueBelowHome:false,playlistsBelowHome:false,listeningCollapsed:false,sidebarCollapsed:false})
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
 it('validates independent ordered pins and rejects unknown, empty, or duplicate views',()=>{
  expect(navigationChangeSchema.safeParse({action:'view-pins',viewPins:{music:['genres','albums','songs']}}).success).toBe(true)
  for(const viewPins of [{music:[]},{music:['albums','albums']},{music:['folders']},{tools:['albums']},{unknown:['songs']},{music:['songs'],local:['songs']},{}])expect(navigationChangeSchema.safeParse({action:'view-pins',viewPins}).success).toBe(false)
 })
 it('round-trips local names, icons and collapse state through personal backups',()=>{
  const store=new Store(':memory:'),restored=new Store(':memory:')
  try{
   const prefs=experienceSchema.parse({navigation:{viewPins:{music:['songs','albums','genres'],tools:['health','mixes']},collections:{...collectionDefaults,podcasts:{name:'My shows',icon:'radio'}},collectionOrder:['local','podcasts','music','audiobooks'],queueBelowHome:true,playlistsBelowHome:true,listeningCollapsed:true,sidebarCollapsed:true}})
   store.set('experience',prefs)
   const {values,stats}=restoreExtra(exportExtra(store),{servers:new Map(),folders:new Map()},q=>q)
   restored.restorePersonal(values,stats)
   expect(restored.get('experience')).toEqual(prefs)
  }finally{store.close();restored.close()}
 })
 it('accepts bounded library choices only for known pages',()=>{
  for(const [scope,value] of [['music','all'],['musicPlaylists','s:1'],['audiobooks','s:book'],['podcasts','s:podcast'],['local','root'],['playlistSource','local']])expect(navigationChangeSchema.safeParse({action:'library-selection',scope,value}).success).toBe(true)
  for(const input of [{scope:'unknown',value:'all'},{scope:'music',value:'x'.repeat(4097)},{scope:'music',value:4}])expect(navigationChangeSchema.safeParse({action:'library-selection',...input}).success).toBe(false)
 })
 it('remaps saved source identities on restore and drops missing sources without losing Combined',()=>{
  const store=new Store(':memory:')
  try{
   store.set('experience',experienceSchema.parse({navigation:{librarySelections:{music:'all',musicPlaylists:'s:1',audiobooks:'s:books',podcasts:'removed:shows',local:'r',localPlaylists:'gone',localFolders:'r',playlistSource:'local'}}}))
   const {values}=restoreExtra(exportExtra(store),{servers:new Map([['s','new-s']]),folders:new Map([['r','new-r']])},q=>q)
   expect(experienceSchema.parse(values.experience).navigation.librarySelections).toEqual({music:'all',musicPlaylists:'new-s:1',audiobooks:'new-s:books',local:'new-r',localFolders:'new-r',playlistSource:'local'})
  }finally{store.close()}
 })

})
