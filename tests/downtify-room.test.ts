import {describe,it,expect} from 'vitest'
import {roomFeature,roomRecents} from '../src/shared/downtify-room'
import type {DtTrack,DtWorkspace} from '../src/shared/downtify'
import type {HistoryItem,PlayTarget} from '../src/shared/types'
const track=(id:string,serverId='s'):DtTrack=>({id,serverId,title:'Live '+id,artist:'Artist',album:'Album',duration:42,saved:true})
const workspace=(tracks:DtTrack[]):DtWorkspace=>({tracks,albums:[],artists:[],playlists:[],warnings:[]})
const history=(target:PlayTarget,n=0):HistoryItem=>({id:String(n),item:{target,title:'Old title',subtitle:'Old artist'},playedAt:100-n,position:12,duration:42})
describe('Listening Room identities',()=>{
 it('only offers live saved music from the selected connection',()=>{
  const rows=[history({kind:'downtify-track',serverId:'other',trackId:'same'}),history({kind:'music-track',serverId:'s',trackId:'same'}),history({kind:'audiobook',serverId:'s',bookId:'same'}),history({kind:'downtify-track',serverId:'s',trackId:'deleted'}),history({kind:'downtify-track',serverId:'s',trackId:'same'},4)]
  const recent=roomRecents(rows,'s',[track('same'),track('same','other')]);expect(recent).toHaveLength(1);expect(recent[0].item.title).toBe('Live same');expect(recent[0].item.target).toEqual(rows[4].item.target);expect(recent[0].position).toBe(12)
 })
 it('preserves show and episode identities separately from songs and other providers',()=>{
  const a=history({kind:'downtify-episode',serverId:'s',showId:'1',episodeId:'11'}),b=history({kind:'downtify-episode',serverId:'s',showId:'1',episodeId:'12'},1)
  expect(roomRecents([a,b,history({kind:'podcast-episode',serverId:'s',showId:'1',episodeId:'11'})],'s',[])).toEqual([a,b])
 })
 it('prefers a valid recent saved song, then discovery, then saved music without crossing servers',()=>{
  const saved=workspace([track('saved')]),discovery=workspace([track('foreign','other'),track('new')])
  expect(roomFeature(discovery,saved,[history({kind:'downtify-track',serverId:'s',trackId:'saved'})],'s')?.id).toBe('saved')
  expect(roomFeature(discovery,saved,[history({kind:'downtify-track',serverId:'s',trackId:'deleted'})],'s')?.id).toBe('new')
  expect(roomFeature(workspace([]),saved,[],'s')?.id).toBe('saved');expect(roomFeature(discovery,saved,[],'abs')).toBeUndefined()
 })
 it('bounds recent shortcuts without changing original history objects',()=>{const rows=Array.from({length:20},(_,n)=>history({kind:'downtify-track',serverId:'s',trackId:'saved'},n));expect(roomRecents(rows,'s',[track('saved')])).toHaveLength(6);expect(rows[0].item.title).toBe('Old title')})
})
