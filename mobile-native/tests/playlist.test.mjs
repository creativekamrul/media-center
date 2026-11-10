import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlaylist} from '../src/offline/playlist.ts';
const song={identity:'nav:one:song',title:'বাংলা song',artist:'Artist',durationSeconds:60.8,relativePath:'Music/Artist/song.flac',state:'complete'};
test('relative export keeps Unicode, order and duplicates',()=>{
 const p=createPlaylist('Playlists/Favorites.m3u8',[song,song]);
 assert.equal(p.count,2);
 assert.equal(p.text,'#EXTM3U\n#EXTINF:60,Artist - বাংলা song\n../Music/Artist/song.flac\n#EXTINF:60,Artist - বাংলা song\n../Music/Artist/song.flac\n');
});
test('incomplete downloads require explicit partial export',()=>{
 const pending={...song,state:'pending'};
 assert.throws(()=>createPlaylist('List.m3u8',[pending]),/incomplete/);
 assert.deepEqual(createPlaylist('List.m3u8',[song,pending],true).missing,[song.identity]);
});
test('never export credentials, absolute paths or traversal',()=>{
 for(const relativePath of ['https://server/file?token=secret','content://private/2','C:/Music/a','../a','Music/../a','/a','a\nb'])
  assert.throws(()=>createPlaylist('List.m3u8',[{...song,relativePath}]));
});
test('metadata cannot inject playlist entries',()=>{
 const p=createPlaylist('List.m3u8',[{...song,title:'Song\nhttps://bad',relativePath:'#track.flac'}]);
 assert.ok(p.text.includes('Song https://bad\n./#track.flac'));
});
