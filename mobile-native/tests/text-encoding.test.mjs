import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

test('mobile labels remain valid UTF-8 without corrupted punctuation',()=>{
 const root=fileURLToPath(new URL('../src/',import.meta.url));
 for(const entry of readdirSync(root,{recursive:true})){
  if(!/\.tsx?$/.test(entry))continue;
  const text=new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path.join(root,entry)));
  assert.doesNotMatch(text,/\uFFFD|\u00C2\u00B7|\u00C3\u2014|\u00E2\u02C6\u2019/,entry);
 }
});

test('native Android labels remain valid UTF-8 without corrupted punctuation',()=>{
 const root=fileURLToPath(new URL('../modules/media-library/android/src/main/java/',import.meta.url));
 for(const entry of readdirSync(root,{recursive:true})){
  if(!/\.kt$/.test(entry))continue;
  const text=new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(path.join(root,entry)));
  assert.doesNotMatch(text,/\uFFFD|\u00C2\u00B7|\u00C3\u2014|\u00E2\u02C6\u2019/,entry);
 }
});
