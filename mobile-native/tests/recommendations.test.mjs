import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMix} from '../src/recommendations.ts';
test('daily mixes deduplicate tracks and never invent entries',()=>{
 const source=[{id:'1',artist:'A'},{id:'2',artist:'B'},{id:'3',artist:'A'}];
 const mix=createMix(source,[source[0]],[source[1]],123,'familiar');
 assert.equal(mix.length,3);assert.equal(new Set(mix.map(t=>t.id)).size,3);
 assert.deepEqual(mix,createMix(source,[source[0]],[source[1]],123,'familiar'));
 assert.equal(mix[1].artist,'B');
});
test('discovery prioritizes unheard tracks from a known artist over its played tracks',()=>{
 const played={id:'played',artist:'A'},fresh={id:'fresh',artist:'A'};
 assert.equal(createMix([played,fresh],[played],[],42,'discovery')[0].id,'fresh');
});
test('cold start is bounded and empty libraries remain empty',()=>{
 assert.deepEqual(createMix([],[],[],1,'discovery'),[]);
 assert.equal(createMix(Array.from({length:90},(_,i)=>({id:String(i)})),[],[],1,'familiar').length,30);
});
