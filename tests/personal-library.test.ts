import {queueItemSchema} from '../src/main/features'
import type {QueueItem} from '../src/shared/types'
import {describe,it,expect,vi} from 'vitest'
vi.mock('electron',()=>({safeStorage:{},nativeImage:{},dialog:{}}))
import {randomUUID} from 'node:crypto'
import {personalStateSchema,mediaKey,personalCommandSchema,episodeStart,episodeOutro,showPreferenceSchema,type MediaRef} from '../src/shared/personal-library'
import {changePersonal,applyMetadata,applyQueueMetadata} from '../src/shared/personal-state'
import {Store} from '../src/main/store'
import {exportExtra,restoreExtra} from '../src/main/personal-backup'
import {decoratePersonal} from '../src/main/personal-display'
import {artworkHost} from '../src/main/cover-search'
import {presence,discordDefaults,publicArtwork} from '../src/main/discord'
import {emptyPlayback} from '../src/shared/types'
const book:MediaRef={kind:'playable',item:{target:{kind:'audiobook',serverId:'s',bookId:'same'},title:'Book',subtitle:'Author'}}
const episode:MediaRef={kind:'playable',item:{target:{kind:'podcast-episode',serverId:'s',showId:'show',episodeId:'same'},title:'Episode',subtitle:'Show'}}
describe('personal library',()=>{
 it('keeps mixed shelves ordered, deduplicates exact identity, and distinguishes book/show/episode/source',()=>{
  const album:MediaRef={kind:'album',serverId:'s',id:'same',title:'Album',subtitle:''},show:MediaRef={kind:'podcast-show',serverId:'s',id:'show',title:'Show',subtitle:''}
  const state=changePersonal(personalStateSchema.parse({}),{action:'shelf-save',shelf:{id:randomUUID(),name:'A weekend',description:'Mixed',entries:[book,album,episode,show,book]}})
  expect(state.shelves[0].entries).toEqual([book,album,episode,show]);expect(new Set(state.shelves[0].entries.map(mediaKey)).size).toBe(4)
  expect(personalCommandSchema.safeParse({action:'metadata-save',ref:{kind:'playable',item:{target:{kind:'podcast-episode',serverId:'s',episodeId:'same'},title:'Bad',subtitle:''}},metadata:{title:'Bad'}}).success).toBe(false)
 })
 it('rejects invalid metadata, unknown actions and repeated columns',()=>{
  expect(personalCommandSchema.safeParse({action:'metadata-save',ref:book,metadata:{path:'C:/music'}}).success).toBe(false)
  expect(personalCommandSchema.safeParse({action:'view-save',view:{id:'v',name:'View',columns:['album','album']}}).success).toBe(false)
  expect(personalCommandSchema.safeParse({action:'show-save',serverId:'s',showId:'show',prefs:{speed:6,intro:0,outro:0,order:'oldest'}}).success).toBe(false)
 })
 it('merges independent settings and restores original metadata without changing playback identities',()=>{
  let state=changePersonal(personalStateSchema.parse({}),{action:'metadata-save',ref:book,metadata:{title:'My title',author:'A'}})
  state=changePersonal(state,{action:'view-save',view:{id:'view',name:'Albums first',columns:['album','artist']}})
  expect(state.metadata[mediaKey(book)].title).toBe('My title');expect(applyMetadata(book.item,state.metadata[mediaKey(book)]).target).toEqual(book.item.target)
  state=changePersonal(state,{action:'metadata-save',ref:book,metadata:null});expect(applyMetadata(book.item,state.metadata[mediaKey(book)])).toEqual(book.item)
 })
 it('handles intro/outro boundaries without changing explicit seeks or skipping very short episodes',()=>{
  const prefs=showPreferenceSchema.parse({intro:20,outro:10});expect(episodeStart(0,100,prefs)).toBe(20);expect(episodeStart(0,100,prefs,true)).toBe(0);expect(episodeStart(60,100,prefs)).toBe(60)
  expect(episodeOutro(90,100,prefs)).toBe(true);expect(episodeOutro(18,20,prefs)).toBe(false);expect(episodeOutro(100,100,showPreferenceSchema.parse({}))).toBe(false)
 })
 it('applies display overrides to explicit media types, preserving episode identity and unmodified originals',()=>{
  const store=new Store(':memory:');try{store.set('personal-library',changePersonal(personalStateSchema.parse({}),{action:'metadata-save',ref:episode,metadata:{title:'My episode'}}));const original={kind:'podcast-episode',serverId:'s',id:'same',showId:'show',title:'Original'};expect(decoratePersonal(original,store)).toMatchObject({title:'My episode',id:'same',showId:'show'});expect(original.title).toBe('Original');expect(decoratePersonal({kind:'audiobook',serverId:'s',id:'same',title:'Book'},store)).toMatchObject({title:'Book'})}finally{store.close()}
 })
 it('round trips shelves, plans, show preferences, metadata and views with source remapping, and resets them',()=>{
  const store=new Store(':memory:'),restored=new Store(':memory:');try{let p=personalStateSchema.parse({});p=changePersonal(p,{action:'shelf-save',shelf:{id:randomUUID(),name:'Shelf',description:'',entries:[book,episode]}});p=changePersonal(p,{action:'trip-save',trip:{id:randomUUID(),name:'Trip',items:[book.item,episode.item]}});p=changePersonal(p,{action:'metadata-save',ref:episode,metadata:{title:'Custom'}});p=changePersonal(p,{action:'show-save',serverId:'s',showId:'show',prefs:showPreferenceSchema.parse({intro:20})});store.set('personal-library',p);const extra=exportExtra(store);const {values,stats}=restoreExtra(extra,{servers:new Map([['s','new']]),folders:new Map()},q=>({...q,target:{...q.target,serverId:'new'} as typeof q.target}));restored.restorePersonal(values,stats);const result=personalStateSchema.parse(restored.get('personal-library'));expect(result.shelves[0].entries[1]).toMatchObject({item:{target:{serverId:'new',episodeId:'same'}}});expect(result.metadata['["new","podcast-episode","show","same"]'].title).toBe('Custom');expect(result.shows['["new","show"]'].intro).toBe(20);restored.resetData('personal');expect(restored.get('personal-library')).toBeUndefined()}finally{store.close();restored.close()}
 })
 it('only accepts expected public artwork services and canonical Discord cover URLs',()=>{
  for(const url of ['https://musicbrainz.org/ws/2/release','https://coverartarchive.org/release/x','https://ia800001.us.archive.org/a'])expect(artworkHost(new URL(url))).toBe(true)
  for(const url of ['http://archive.org/a','https://archive.org.attacker.test/a','https://127.0.0.1/a','https://user:secret@archive.org/a','https://archive.org:444/a'])expect(artworkHost(new URL(url))).toBe(false)
  const url='https://coverartarchive.org/release/12345678-1234-1234-1234-123456789abc/front-500';expect(publicArtwork(url)).toBe(url);expect(publicArtwork(url+'?token=secret')).toBeUndefined()
 })
 it('uses the public Discord fallback and clears it during private listening',()=>{
  const state={...emptyPlayback,status:'playing' as const,kind:'music-track' as const,title:'Track',subtitle:'Artist'},settings={...discordDefaults,enabled:true,defaultCoverAsset:true}
  expect(presence(state,settings)?.assets?.large_image).toContain('/v1.1.0/src/renderer/public/assets/default-cover.png');expect(presence(state,{...settings,defaultCoverAsset:false})?.assets?.large_image).toContain('/default-cover.png');expect(presence({...state,privateListening:true},settings)).toBeNull()
 })
})

it('keeps metadata-decorated queues valid for playback, context menus and backups for every media kind',()=>{
 const items:QueueItem[]=[book.item,episode.item,{title:'Song',subtitle:'Artist',target:{kind:'music-track',serverId:'s',trackId:'song'}},{title:'Local',subtitle:'Artist',target:{kind:'local-file',serverId:'local',rootId:'root',fileId:'file'}},{title:'Radio',subtitle:'Station',target:{kind:'radio',serverId:'s',stationId:'radio'}}]
 const store=new Store(':memory:')
 try {for(const metadata of [{},{title:'Custom',artist:'Artist',album:'Album',year:2026,genre:'Pop',author:'Author',narrator:'Narrator',description:'Description'}]){
  let state=personalStateSchema.parse({});for(const item of items)state=changePersonal(state,{action:'metadata-save',ref:{kind:'playable',item},metadata});store.set('personal-library',state)
  const decorated=decoratePersonal(items,store) as QueueItem[]
  decorated.forEach((q,i)=>{expect(queueItemSchema.parse(q)).toEqual(q);expect(q.target).toEqual(items[i].target);expect(applyQueueMetadata(items[i],metadata)).toEqual(q)})
  expect(items[0].title).toBe('Book')
 }}finally{store.close()}
})
