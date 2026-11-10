import {test} from 'node:test';import assert from 'node:assert/strict';import {parseLyrics} from '../src/lyrics.ts';
test('timestamped lyrics preserve fractional positions and repeated timestamps',()=>{assert.deepEqual(parseLyrics('[ar:Artist]\n[00:01.25][01:02.500]Hello\n[00:00.1]Start'),[{time:.1,text:'Start'},{time:1.25,text:'Hello'},{time:62.5,text:'Hello'}])});
