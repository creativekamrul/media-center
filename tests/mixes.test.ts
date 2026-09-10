import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{},nativeImage:{},dialog:{}}))
import {randomUUID} from 'node:crypto'
import {mixDefinitionSchema,matchesMix,selectMix,sourceKey,type MixDefinition,type MixTrack} from '../src/shared/mixes'
import {personalStateSchema} from '../src/shared/personal-library'
import {changePersonal} from '../src/shared/personal-state'
import {Store} from '../src/main/store'
import {exportExtra,restoreExtra} from '../src/main/personal-backup'
import {registerMixes} from '../src/main/mixes'
import {Navidrome} from '../src/main/providers/navidrome'
import {Audiobookshelf} from '../src/main/providers/audiobookshelf'

const recipe=(overrides:Partial<MixDefinition>={}):MixDefinition=>({id:randomUUID(),name:'Evening',description:'',sources:[{kind:'navidrome',serverId:'s',libraryId:'all'}],match:'all',groups:[],sort:'title',descending:false,limit:50,artistLimit:0,...overrides})
const track=(id:string,props:Partial<MixTrack>={}):MixTrack=>({title:id,artist:'Artist',album:'Album',duration:200,favorite:false,item:{target:{kind:'music-track',serverId:'s',trackId:id},title:id,subtitle:'Artist'},...props})
describe('custom mix recipes',()=>{
 it('combines AND, OR and NOT groups using normalized text and numeric metadata',()=>{
  const m=recipe({groups:[{match:'any',conditions:[{type:'text',field:'artist',operator:'equals',value:'ＡＲＴＩＳＴ'},{type:'text',field:'genre',operator:'contains',value:'rock'}]},{match:'all',conditions:[{type:'number',field:'year',operator:'atLeast',value:2000},{type:'number',field:'duration',operator:'atMost',value:300}]},{match:'none',conditions:[{type:'text',field:'title',operator:'contains',value:'live'}]}]})
  expect(matchesMix(track('A',{year:2020}),m)).toBe(true)
  expect(matchesMix(track('A live',{year:2020}),m)).toBe(false)
  expect(matchesMix(track('A',{year:1990}),m)).toBe(false)
  expect(matchesMix(track('A'),m)).toBe(false)
  expect(matchesMix(track('A'),{...m,match:'any'})).toBe(true)
 })
 it('keeps missing metadata distinct from zero play counts, and supports favorite exclusions',()=>{
  const m=recipe({groups:[{match:'all',conditions:[{type:'number',field:'playCount',operator:'equals',value:0},{type:'favorite',value:false}]}]})
  expect(matchesMix(track('a'),m)).toBe(false)
  expect(matchesMix(track('a',{playCount:0}),m)).toBe(true)
  expect(matchesMix(track('a',{playCount:0,favorite:true}),m)).toBe(false)
 })
 it('deduplicates complete identities, sorts before artist limits, and keeps unknown values last',()=>{
  const a=track('a',{year:2020}),b=track('b',{year:2023}),c=track('c',{artist:'Another'}),other=track('a',{artist:'Other source',year:2022,item:{target:{kind:'local-file',serverId:'local',rootId:'r',fileId:'a'},title:'Local a',subtitle:''}})
  const result=selectMix([a,a,b,c,other],recipe({sort:'year',descending:true,artistLimit:1}))
  expect(result.scanned).toBe(4);expect(result.matched).toBe(4)
  expect(result.items.map(x=>x.title)).toEqual(['b','Local a','c'])
  expect(selectMix([a,b,c],recipe({sort:'random',limit:2}),()=>0).items.map(x=>x.title)).toEqual(['b','c'])
 })
 it('rejects malformed recipes, duplicate sources, excessive limits, and non-music sources',()=>{
  for(const m of [recipe({limit:1001}),recipe({sources:[]}),recipe({sources:[{kind:'local',rootId:'x'},{kind:'local',rootId:'x'}]}),recipe({groups:[{match:'all',conditions:[]}]}),{...recipe(),sources:[{kind:'audiobook',serverId:'s',bookId:'b'}]}])expect(mixDefinitionSchema.safeParse(m).success).toBe(false)
  expect(sourceKey({kind:'local',rootId:'x'})).not.toBe(sourceKey({kind:'navidrome',serverId:'local',libraryId:'x'}))
 })
 it('saves without overwriting other personal settings, round trips source identities, and resets',()=>{
  const store=new Store(':memory:'),restored=new Store(':memory:')
  try{
   const mix=recipe({sources:[{kind:'navidrome',serverId:'s',libraryId:'all'},{kind:'local',rootId:'r'}]})
   let state=changePersonal(personalStateSchema.parse({}),{action:'mix-save',mix})
   state=changePersonal(state,{action:'view-save',view:{id:'v',name:'View',columns:['album']}})
   store.set('personal-library',state)
   const {values,stats}=restoreExtra(exportExtra(store),{servers:new Map([['s','new-s']]),folders:new Map([['r','new-r']])},q=>q);restored.restorePersonal(values,stats)
   const saved=personalStateSchema.parse(restored.get('personal-library'))
   expect(saved.mixes[0].sources).toEqual([{kind:'navidrome',serverId:'new-s',libraryId:'all'},{kind:'local',rootId:'new-r'}]);expect(saved.views[0].name).toBe('View')
   expect(changePersonal(saved,{action:'mix-delete',id:mix.id}).mixes).toEqual([])
   expect(personalStateSchema.parse({}).mixes).toEqual([]);restored.resetData('personal');expect(restored.get('personal-library')).toBeUndefined()
  }finally{store.close();restored.close()}
 })
 it('reads paginated music sources, applies local favorites and overrides, and reports partial failures',async()=>{
  const handlers=new Map<string,(v?:any)=>any>(),store=new Store(':memory:')
  const nav=Object.create(Navidrome.prototype),abs=Object.create(Audiobookshelf.prototype)
  nav.catalog=vi.fn(async({page})=>({items:[{kind:'music-track',id:'song'+page,serverId:'s',title:'Song',artist:'Singer',album:'Album',duration:180,genre:'Pop'}],hasMore:page===0}))
  const local={roots:()=>[{id:'r',name:'Folder'}]},index={index:vi.fn(async()=>({files:[{id:'f',title:'Local',artist:'Singer',album:'Album',duration:200}],warnings:[]}))}
  try{
   store.set('local-favorites:r',['f'])
   store.set('personal-library',changePersonal(personalStateSchema.parse({}),{action:'metadata-save',ref:{kind:'playable',item:{target:{kind:'local-file',serverId:'local',rootId:'r',fileId:'f'},title:'Local',subtitle:'Singer'}},metadata:{title:'My title',genre:'Jazz'}}))
   registerMixes(((name:any,schema:any,fn:any)=>handlers.set(name,v=>fn(schema.parse(v)))) as any,store,local as any,index as any,id=>id==='s'?nav:abs)
   const mix=recipe({sources:[{kind:'navidrome',serverId:'s',libraryId:'all'},{kind:'local',rootId:'r'},{kind:'navidrome',serverId:'abs',libraryId:'books'}]})
   const result=await handlers.get('mix:preview')!({mix})
   expect(result.scanned).toBe(3);expect(result.items).toHaveLength(3);expect(result.warnings).toHaveLength(1)
   const favorites=await handlers.get('mix:preview')!({mix:{...mix,groups:[{match:'all',conditions:[{type:'favorite',value:true}]}]}})
   expect(favorites.items[0].target).toEqual({kind:'local-file',serverId:'local',rootId:'r',fileId:'f'});expect(favorites.items).toHaveLength(1);expect(favorites.items[0].title).toBe('My title');expect(favorites.genres).toContain('Jazz')
   expect(nav.catalog).toHaveBeenCalledTimes(2)
   nav.catalog.mockImplementation(async()=>({items:[{kind:'music-track',id:'same',serverId:'s',title:'Song',artist:'Singer',album:'Album',duration:180}],hasMore:true}))
   const repeated=await handlers.get('mix:preview')!({mix:recipe(),refresh:true})
   expect(repeated.scanned).toBe(1);expect(repeated.warnings[0]).toContain('repeated')
  }finally{store.close()}
 })
})
