import {test} from 'node:test';import assert from 'node:assert/strict';import {planLibraryRadio} from '../src/libraryRadioPlan.ts';
const seed={account:'a',id:'seed',artist:'First',title:'Seed'};
test('discovery matches enrich artists but unsaved discovery ids never enter a radio queue',async()=>{
 const searched=[];const result=await planLibraryRadio([{id:'a',kind:'downtify'},{id:'b',kind:'navidrome'}],seed,{similar:async()=>[{account:'a',id:'UNSAVED',artist:'Related'}],search:async(s,q)=>{searched.push([s.id,q]);return q==='Related'?[{account:'ignored',id:'saved-related',artist:q}]:[seed]}},{});
 assert.ok(searched.some(([id,q])=>id==='b'&&q==='Related'));assert.ok(!result.tracks.some(t=>t.id==='UNSAVED'));assert.ok(result.tracks.some(t=>t.account==='b'&&t.id==='saved-related'));assert.ok(result.related>0);
});
test('source identities, explicit seed, feedback and nonmusic exclusions survive similar results',async()=>{
 const result=await planLibraryRadio([{id:'a',kind:'navidrome'},{id:'b',kind:'jellyfin'}],seed,{similar:async()=>[{account:'wrong',id:'same',artist:'Related'},{account:'a',id:'episode',kind:'podcast'}],search:async(s)=>[{account:s.id,id:'same',artist:'Related'},{account:s.id,id:'hidden',artist:'Hidden'},{account:s.id,id:'movie',kind:'movie'}]},{tracks:['["a","same"]'],artists:['hidden']});
 assert.deepEqual(result.tracks[0],seed);assert.ok(!result.tracks.some(t=>['episode','hidden','movie'].includes(t.id)));assert.equal(result.tracks.filter(t=>t.id==='same').length,1);assert.equal(result.tracks[1].account,'b');
});
test('an unreachable similarity service or saved library does not block healthy radio candidates',async()=>{
 const result=await planLibraryRadio([{id:'a',kind:'navidrome'},{id:'b',kind:'jellyfin'}],seed,{similar:async()=>{throw Error('Unavailable')},search:async s=>s.id==='a'?new Promise(()=>{}):[{account:s.id,id:'other',artist:'First'}]}, {},20);
 assert.equal(result.tracks[1].account,'b');assert.ok(result.failed>=2);assert.equal(result.related,0);
});
test('radio work is bounded, requires more than the seed, and never queries an id on another source',async()=>{
 const sources=Array.from({length:20},(_,i)=>({id:i?'s'+i:'a',kind:'navidrome'}));let similarCalls=0,searchCalls=0;
 const r=await planLibraryRadio(sources,seed,{similar:async(s)=>{assert.equal(s.id,'a');similarCalls++;return Array.from({length:100},(_,i)=>({account:'a',id:'r'+i,artist:'Related'+i}))},search:async(s)=>{searchCalls++;return [{account:s.id,id:'saved',artist:'Saved'}]}},{});
 assert.equal(similarCalls,1);assert.ok(searchCalls<=32);assert.ok(r.tracks.length<=30);assert.equal(r.limited,true);
 await assert.rejects(()=>planLibraryRadio([{id:'a',kind:'device'}],seed,{similar:async()=>[],search:async()=>[seed]},{}),/No related/);
});

test('spoken sources and title-only artist matches cannot leak into music radio',async()=>{
 await assert.rejects(()=>planLibraryRadio([{id:'a',kind:'audiobookshelf'}],seed,{similar:async()=>[],search:async()=>[]},{}),/saved music/);
 await assert.rejects(()=>planLibraryRadio([{id:'a',kind:'device'}],{...seed,artist:'Sia'},{similar:async()=>[],search:async()=>[{id:'wrong',artist:'Cassian',title:'Sia tribute'}]},{}),/No related/);
});
test('identical saved recordings across sources do not repeat the seed, while distinct versions remain',async()=>{
 const original={...seed,album:'Record',duration:180};const result=await planLibraryRadio([{id:'a',kind:'navidrome'},{id:'b',kind:'downtify'}],original,{similar:async()=>[],search:async source=>[{...original,id:'copy',account:source.id},{...original,id:'remix',account:source.id,title:'Seed (Remix)'},{...original,id:'short-version',account:source.id,duration:160}]},{});
 assert.ok(!result.tracks.some(t=>t.id==='copy'));assert.equal(result.tracks.filter(t=>t.id==='remix').length,1);assert.equal(result.tracks.filter(t=>t.id==='short-version').length,1);assert.deepEqual(result.tracks[0],original);
});
