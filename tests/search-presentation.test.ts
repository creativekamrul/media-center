import {describe,it,expect} from 'vitest'
import {searchResults,rankResults,filterResultSources} from '../src/shared/search-presentation'
import {progressKey} from '../src/shared/timeline'
import type {SearchGroup} from '../src/shared/experience'
import type {QueueItem} from '../src/shared/types'
const song:QueueItem={target:{kind:'music-track',serverId:'nav',trackId:'1'},title:'Exact Artist',subtitle:'Someone'}
describe('Connected search presentation',()=>{
 it('groups by explicit media kind, preserving each source, book and episode identity',()=>{
  const items:QueueItem[]=[song,{...song,target:{kind:'audiobook',serverId:'abs',bookId:'1'}},{...song,target:{kind:'podcast-episode',serverId:'abs',showId:'a',episodeId:'1'}},{...song,target:{kind:'podcast-episode',serverId:'abs',showId:'b',episodeId:'1'}},{...song,target:{kind:'downtify-episode',serverId:'dt',showId:'a',episodeId:'1'}}]
  const rows=searchResults([{id:'g',name:'Library',items,unavailable:[progressKey(items[2].target)]}],[],[]);expect(rows.map(r=>r.category)).toEqual(['tracks','books','podcasts','podcasts','podcasts']);expect(new Set(rows.map(r=>r.key)).size).toBe(5);expect(rows.filter(r=>r.kind==='track'&&r.unavailable).map(r=>r.key)).toEqual([progressKey(items[2].target)])
 })
 it('does not merge same-name artists or recordings from different servers',()=>{
  const groups:SearchGroup[]=['a','b'].map(sourceId=>({id:sourceId,name:sourceId,items:[],collections:[{provider:'navidrome',kind:'artist',sourceId,id:'1',title:'Same Artist',subtitle:''}]}));expect(searchResults(groups,[],[])).toHaveLength(2)
 })
 it('ranks exact names before loose matches without mutating source result order',()=>{
  const rows=searchResults([{id:'nav',name:'Nav',items:[song,{...song,target:{kind:'music-track',serverId:'nav',trackId:'2'},title:'Exact Artist live'}],collections:[{provider:'navidrome',kind:'artist',sourceId:'nav',id:'a',title:'Exact Artist',subtitle:''}]}],[],[]);const copy=[...rows];expect(rankResults(rows,'exact artist')[0].category).toBe('artists');expect(rows).toEqual(copy)
 })
 it('deduplicates repeated Jellyfin hits but retains distinct content kinds',()=>{
  const item={id:'1',serverId:'jf',kind:'Movie' as const,title:'Film',subtitle:'',overview:'',duration:30,position:0,played:false,favorite:false,coverId:'1',genres:[]},library={id:'movies',serverId:'jf',serverName:'Jellyfin',name:'Movies',kind:'movies' as const};expect(searchResults([],[{library,items:[item,item]}],[])).toHaveLength(1);expect(searchResults([],[{library,items:[item,{...item,kind:'Episode'},{...item,kind:'Playlist'}]}],[]).map(r=>r.category)).toEqual(['movies','tv','playlists'])
 })
 it('filters creators by the actual book library, not just a shared server',()=>{
  const people=['books-a','books-b'].map((libraryId,i)=>({name:'Same Author',role:'author' as const,libraryId,ref:{kind:'playable' as const,item:{target:{kind:'audiobook' as const,serverId:'abs',bookId:String(i)},title:'Book '+i,subtitle:'Same Author'}}}));const rows=searchResults([],[],people);const filtered=filterResultSources(rows,'books:abs:books-a');expect(filtered).toHaveLength(1);expect(filtered[0].kind==='creator'&&filtered[0].people.map(p=>p.libraryId)).toEqual(['books-a']);expect(rows[0].kind==='creator'&&rows[0].people).toHaveLength(2);expect(filterResultSources(rows,'music:abs')).toEqual([])
 })
 it('keeps author and narrator roles distinct and deduplicates only identical book refs',()=>{
  const ref={kind:'playable' as const,item:{target:{kind:'audiobook' as const,serverId:'abs',bookId:'b'},title:'A Book',subtitle:'A Name'}},author={name:'A Name',role:'author' as const,ref},narrator={...author,role:'narrator' as const};const rows=searchResults([],[],[author,author,narrator]);expect(rows).toHaveLength(2);expect(rows.every(r=>r.kind==='creator'&&r.people.length===1)).toBe(true)
 })
})
