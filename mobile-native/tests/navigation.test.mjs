import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backDestination} from '../src/navigation.ts';
test('album/artist/playlist/track back takes precedence on every root tab',()=>{
 for(const tab of ['Home','Explore','Library','Search']) assert.equal(backDestination(true,tab),'detail');
});
test('root tabs return Home before allowing Android exit',()=>{
 for(const tab of ['Explore','Library','Search']) assert.equal(backDestination(false,tab),'home');
 assert.equal(backDestination(false,'Home'),'exit');
});
