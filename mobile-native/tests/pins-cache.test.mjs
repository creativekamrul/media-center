import {test} from 'node:test';
import assert from 'node:assert/strict';
import {togglePin,movePin,pinKey} from '../src/pins.ts';
import {ruleDue,cacheIds} from '../src/cacheRulesModel.ts';
const pin={account:'a',id:'same',kind:'album',title:'Album',route:'/detail'};
test('pins distinguish servers and media kinds and toggle without duplicates',()=>{let rows=togglePin([],pin);rows=togglePin(rows,{...pin,account:'b'});rows=togglePin(rows,{...pin,kind:'playlist'});assert.equal(rows.length,3);assert.equal(togglePin(rows,pin).length,2)});
test('pin ordering stays stable at both ends',()=>{const rows=[pin,{...pin,id:'second'}];assert.deepEqual(movePin(rows,pinKey(pin),-1),rows);assert.equal(movePin(rows,pinKey(pin),1)[1].id,'same');assert.deepEqual(movePin(rows,'missing',1),rows)});
test('offline rules are opt-in, hourly and bounded with unique IDs',()=>{const rule={enabled:false,lastRun:0};assert.equal(ruleDue(rule,4000000),false);assert.equal(ruleDue({...rule,enabled:true,lastRun:3999999},4000000),false);assert.equal(ruleDue({...rule,enabled:true},4000000),true);assert.deepEqual(cacheIds([{id:'a'},{id:'a'},{id:'b'}],1),['a']);assert.equal(cacheIds(Array.from({length:600},(_,i)=>({id:String(i)})),2000).length,500)});

test("episode pins include show identity",()=>{assert.notEqual(pinKey({...pin,kind:"episode",showId:"show-a"}),pinKey({...pin,kind:"episode",showId:"show-b"}))});
