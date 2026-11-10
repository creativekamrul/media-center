import {test} from 'node:test';
import assert from 'node:assert/strict';
import {awaitingSeek} from '../src/seekAcknowledgement.ts';
for(const [kind,target] of [['music',120],['book',38000],['podcast',2400]]) {
 test(`${kind}: stale native position cannot undo a pending seek`,()=>{
  assert.equal(awaitingSeek(target-60,target,250),true);
  assert.equal(awaitingSeek(target+.5,target,500),false);
  assert.equal(awaitingSeek(target-60,target,2000),false);
 });
}
