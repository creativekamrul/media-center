import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artworkSize} from '../src/artworkSize.ts';
import {portableSettings} from '../src/settingsBackup.ts';
test('artwork uses density-adjusted thumbnail buckets and larger detail covers',()=>{
 assert.equal(artworkSize(44*3),192);
 assert.equal(artworkSize(120*3),384);
 assert.equal(artworkSize(350*3),1536);
 assert.equal(artworkSize(360*3),1536);
 assert.equal(artworkSize(10000),1536);
});
test('blurred backgrounds stay small and invalid dimensions are bounded',()=>{
 assert.equal(artworkSize(1080,true),384);
 assert.equal(artworkSize(NaN),384);
 assert.equal(artworkSize(-1),96);
});
test('importing a backup cannot silently enable expensive liquid glass',()=>{
 assert.equal(portableSettings({material:'glass',liquidGlassAcknowledged:true}).material,'frosted');
 assert.equal(portableSettings({material:'blurred'}).material,'blurred');
});
