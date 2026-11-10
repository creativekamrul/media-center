import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slicePage,appendPage} from '../src/paging.ts';
test('infinite playlist batches preserve repeated tracks and order',()=>{
 const rows=Array.from({length:93},(_,i)=>({id:String(i%7)}));let result=[],offset=0;
 while(offset!==null){const page=slicePage(rows,offset);result=appendPage(result,page);offset=page.next;}
 assert.deepEqual(result,rows);
});
test('exact and empty boundaries stop requesting additional pages',()=>{
 assert.deepEqual(slicePage([],0),{items:[],next:null});
 assert.equal(slicePage(Array(40).fill(1),0).next,null);
 assert.equal(slicePage(Array(41).fill(1),0).next,40);
 assert.equal(slicePage(Array(41).fill(1),40).items.length,1);
});
