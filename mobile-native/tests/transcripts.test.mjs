import {test} from 'node:test';import assert from 'node:assert/strict';import {parseTranscript,searchTranscript} from '../src/transcripts.ts';
test('book VTT timestamps remain whole-book seconds, including hours and cue settings',()=>{
 const cues=parseTranscript('WEBVTT\n\nchapter-cue\n01:02:03.250 --> 01:02:05.900 align:start\n<v Narrator>Hello <i>world</i>\nAgain\n\nNOTE ignored\nnot speech');
 assert.deepEqual(cues,[{start:3723.25,end:3725.9,text:'Hello world\nAgain'}]);
});
test('podcast SRT handles BOM/CRLF, milliseconds and independent starts',()=>{
 const cues=parseTranscript('\uFEFF1\r\n00:00:05,120 --> 00:00:08,900\r\nEpisode two\r\n\r\n2\r\n00:00:00,000 --> 00:00:02,000\r\nBeginning');
 assert.equal(cues[0].start,0);assert.equal(cues[1].start,5.12);assert.equal(searchTranscript(cues,'TWO episode').length,1);
});
test('untimed text is searchable but never gets a fabricated seek position',()=>{
 const cues=parseTranscript('NOTE about this book\n\nSecond paragraph');assert.equal(cues.length,2);assert.equal(cues[0].start,null);assert.equal(searchTranscript(cues,'second')[0].text,'Second paragraph');assert.equal(cues[0].text,'NOTE about this book');
});
test('malformed and oversized transcripts fail instead of making invalid seek targets',()=>{
 for(const text of ['WEBVTT\n\n00:99:00 --> 01:00:00\nInvalid','00:00:04 --> 00:00:01\nBackwards','x'.repeat(500001),'bad\0data'])assert.throws(()=>parseTranscript(text));
});
