import {test} from 'node:test';import assert from 'node:assert/strict';
import {orderTracks,trackSortOptions} from '../src/trackOrdering.ts';
import {sortedTrackIndexes} from '../../src/shared/track-sort.ts';
const rows=[{id:'same',title:'Track 10',artist:'B',album:'Z',duration:12,created:'2020-01-01',track:2},{id:'other',title:'track 2',artist:'A',album:'A',duration:24,created:'2024-01-01',track:1},{id:'same',title:'Track 10',artist:'B',album:'Z',duration:12}];
test('sorting keeps duplicate occurrences and restores original order without mutation',()=>{assert.deepEqual(orderTracks(rows,'title').map(t=>t.id),['other','same','same']);assert.deepEqual(orderTracks(rows,'original'),rows);assert.equal(rows[0].id,'same')});
test('dates and track numbers put unknown metadata last',()=>{assert.deepEqual(orderTracks(rows,'added').map(t=>t.id),['other','same','same']);assert.equal(orderTracks(rows,'track')[0].track,1);assert.equal(orderTracks(rows,'added-oldest')[2].created,undefined)});
test('every desktop sort produces the same mobile playback ordering',()=>{const normalized=rows.map(t=>({...t,addedAt:t.created?Date.parse(t.created):undefined,trackNumber:t.track}));for(const [sort] of trackSortOptions)assert.deepEqual(orderTracks(rows,sort),sortedTrackIndexes(normalized,sort).map(i=>rows[i]));});
