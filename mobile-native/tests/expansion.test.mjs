import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessionPreset,readSessions} from '../src/sessionPresetModel.ts';
import {detectLibraryChanges} from '../src/libraryInbox.ts';
import {validateEqProfile} from '../src/eqProfiles.ts';

test('session presets reject unsafe imported levels and retain valid spoken playback speeds',()=>{
 const good={id:'book',name:' Book time ',speed:1.25,volume:40,sleepMinutes:30};
 assert.equal(sessionPreset(good).name,'Book time');
 for(const patch of [{volume:101},{speed:0},{sleepMinutes:Infinity},{name:''}])assert.throws(()=>sessionPreset({...good,...patch}));
 assert.deepEqual(readSessions([null,good,{...good,volume:-1}]),[sessionPreset(good)]);
});
test('library inbox establishes independent server baselines and reports only new unique IDs',()=>{
 const first=detectLibraryChanges(undefined,'one',[{id:'a'}],1);
 assert.deepEqual(first.added,[]);
 const next=detectLibraryChanges(first.snapshot,'one',[{id:'b',name:'New'},{id:'a'},{id:'b',name:'New'}],2);
 assert.equal(next.added.length,1);assert.equal(next.added[0].title,'New');
 assert.deepEqual(detectLibraryChanges(first.snapshot,'two',[{id:'b'}],2).added,[]);
 assert.deepEqual(detectLibraryChanges(next.snapshot,'one',[{id:'b'},{id:'a'}],3).added,[]);
});
test('parametric profiles preserve independent filters and reject invalid imported filters',()=>{
 const profile={id:'custom',name:'Low shelf alternative',bands:Array(10).fill(0),eqPreamp:-4,parametric:true,filters:[{frequency:80,gain:3,q:.7}]};
 const parsed=validateEqProfile(profile);profile.filters[0].gain=9;
 assert.equal(parsed.filters[0].gain,3);
 for(const filter of [{frequency:0,gain:0,q:1},{frequency:200,gain:20,q:1},{frequency:200,gain:0,q:0}])assert.throws(()=>validateEqProfile({...profile,filters:[filter]}));
});

import {matchingArtists} from '../src/artistIdentity.ts';
test('artist matches preserve ambiguous profile IDs and do not merge punctuation differences',()=>{
 const rows=[{id:'1',name:' Artist  Name '},{id:'2',name:'artist name'},{id:'3',name:'Artist-Name'},{id:'2',name:'artist name'}];
 assert.deepEqual(matchingArtists(rows,'ARTIST NAME').map(t=>t.id),['1','2']);assert.deepEqual(matchingArtists(rows,''),[]);
});
